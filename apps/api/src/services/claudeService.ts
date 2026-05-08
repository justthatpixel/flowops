import { spawn } from 'child_process'

export type StreamCallback = (chunk: string) => void
export type DoneCallback = (fullText: string) => void

export interface GeneratedFile {
  path: string
  content: string
}

export interface FailureSummary {
  summary: string
  suggestedFix: string
  applyable: boolean
}

// ── Core helpers ─────────────────────────────────────────────────────────────

function spawnEnv() {
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY // use `claude login` auth, not API key billing
  return env
}

/** Fire-and-forget spawn that streams chunks to callbacks. */
function spawnClaude(
  prompt: string,
  onChunk: StreamCallback,
  onDone: DoneCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', prompt], { env: spawnEnv() })
    let fullText = ''

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      fullText += chunk
      onChunk(chunk)
    })
    proc.stderr.on('data', (data: Buffer) => console.error('[claude]', data.toString()))
    proc.on('close', (code) => {
      if (code === 0) { onDone(fullText); resolve() }
      else reject(new Error(`claude exited ${code}`))
    })
    proc.on('error', (err) =>
      reject(new Error(`claude CLI unavailable: ${err.message}. Run \`claude login\` first.`)),
    )
  })
}

/** Blocking variant — collects full output and returns it. */
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', prompt], { env: spawnEnv() })
    let out = ''
    let err = ''

    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { err += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err.trim() || `claude exited ${code}`))
    })
    proc.on('error', (e) =>
      reject(new Error(`claude CLI unavailable: ${e.message}. Run \`claude login\` first.`)),
    )
  })
}

function parseJsonBlock<T>(text: string): T | null {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) return null
  try { return JSON.parse(match[1]) as T } catch { return null }
}

// ── Prompts ──────────────────────────────────────────────────────────────────

const CONFIGURE_ALL_PROMPT = (appContext: string, nodesJson: string) => `\
You are a DevOps configuration expert for FlowOps, a visual CI/CD pipeline builder.
Given a user's app description, intelligently update the pipeline node configurations.

RULES:
- Use the exact runtime, package manager, cloud provider, and repo the user mentions
- Never hallucinate service names or regions
- Keep labels concise (2-3 words max)
- Only include nodes that need changes in the JSON

RESPONSE FORMAT:
Write a brief friendly explanation (2-3 sentences) then end with:

\`\`\`json
{
  "updates": [
    { "id": "node-id", "label": "optional new label", "config": { ...updated NodeConfig fields... } }
  ]
}
\`\`\`

NodeConfig types:
- trigger: { provider, repo, branch, event }
- build: { ciProvider, runtime, packageManager, buildCommand }
- test: { runner, coverage }
- docker: { registry, baseImage, imageName, tag }
- deploy: { provider, service, region }
- claude_task: { prompt }

My app: ${appContext}

Current pipeline nodes:
${nodesJson}`

const CONFIGURE_NODE_PROMPT = (appContext: string, nodeJson: string, userPrompt: string) => `\
You are a DevOps configuration expert for FlowOps.
The user has selected a specific pipeline node and wants to reconfigure it.

RESPONSE FORMAT:
Brief explanation (1-2 sentences), then:

\`\`\`json
{
  "updates": [
    { "id": "node-id", "label": "optional new label", "config": { ...updated config... } }
  ]
}
\`\`\`

App context: ${appContext || 'Not specified'}

Selected node:
${nodeJson}

User request: ${userPrompt}`

const GENERATE_FILES_PROMPT = (
  nodeType: string,
  label: string,
  config: unknown,
  appContext: string,
) => `\
You are a DevOps engineer. Generate the actual file contents for this CI/CD pipeline node.
Return ONLY a JSON array — no prose, no markdown wrapper around the outer array.

Node type: ${nodeType}
Node label: ${label}
App context: ${appContext || 'generic Node.js app'}
Config: ${JSON.stringify(config, null, 2)}

Rules:
- Generate real, working file content appropriate for the node type and config
- For trigger/build nodes: generate a GitHub Actions workflow YAML
- For docker nodes: generate a production-ready multi-stage Dockerfile
- For deploy nodes (aws/ecs): generate a minimal ECS task definition JSON or Terraform snippet
- For deploy nodes (vercel/fly/render): generate the provider config file
- For test nodes: generate the test runner config file
- For claude_task nodes: generate a shell script that echoes the task description
- Use the exact values from the config (runtime, packageManager, provider, region, etc.)
- Maximum 2 files per node

Return ONLY this JSON (no code fences, no explanation):
[
  { "path": "relative/file/path.ext", "content": "full file content here" }
]`

const EXPLAIN_FAILURE_PROMPT = (
  nodeType: string,
  label: string,
  logs: string,
  appContext: string,
) => `\
You are a DevOps expert analyzing a CI/CD pipeline failure.
Explain what went wrong and provide a specific, actionable fix.

Return ONLY this JSON (no code fences, no explanation):
{
  "summary": "1-2 sentence plain-English explanation of what failed and why",
  "suggestedFix": "Specific actionable instruction the user can apply (e.g. switch base image, change runtime version, update deploy region)",
  "applyable": true
}

Node type: ${nodeType}
Node label: ${label}
App context: ${appContext || 'unknown'}
Logs:
${logs}`

// ── Exported service functions ────────────────────────────────────────────────

export function streamConfigureAll(
  appContext: string,
  nodes: unknown[],
  onChunk: StreamCallback,
  onDone: DoneCallback,
): Promise<void> {
  return spawnClaude(
    CONFIGURE_ALL_PROMPT(appContext, JSON.stringify(nodes, null, 2)),
    onChunk,
    onDone,
  )
}

export function streamConfigureNode(
  appContext: string,
  node: unknown,
  userPrompt: string,
  onChunk: StreamCallback,
  onDone: DoneCallback,
): Promise<void> {
  return spawnClaude(
    CONFIGURE_NODE_PROMPT(appContext, JSON.stringify(node, null, 2), userPrompt),
    onChunk,
    onDone,
  )
}

export async function generateFilesForNode(
  nodeType: string,
  label: string,
  config: unknown,
  appContext: string,
): Promise<GeneratedFile[]> {
  const output = await runClaude(
    GENERATE_FILES_PROMPT(nodeType, label, config, appContext),
  )

  // Claude may wrap in ```json ... ``` even though we asked it not to
  const cleaned = output.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  // Try direct parse first, then fall back to JSON block extraction
  try {
    return JSON.parse(cleaned) as GeneratedFile[]
  } catch {
    const fromBlock = parseJsonBlock<GeneratedFile[]>(output)
    return fromBlock ?? []
  }
}

export async function explainFailure(
  nodeType: string,
  label: string,
  logs: string,
  appContext: string,
): Promise<FailureSummary> {
  const output = await runClaude(
    EXPLAIN_FAILURE_PROMPT(nodeType, label, logs, appContext),
  )
  const cleaned = output.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  try {
    return JSON.parse(cleaned) as FailureSummary
  } catch {
    const fromBlock = parseJsonBlock<FailureSummary>(output)
    return fromBlock ?? { summary: output.slice(0, 300), suggestedFix: '', applyable: false }
  }
}

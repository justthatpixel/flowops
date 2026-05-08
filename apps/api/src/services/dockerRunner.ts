interface NodePayload {
  id: string
  data: {
    label: string
    nodeType: string
    config?: Record<string, unknown>
  }
}

interface RunResult {
  success: boolean
  logs: string
  durationMs: number
}

const MOCK_LOGS: Record<string, (label: string, config: Record<string, unknown>) => string> = {
  trigger: (label, cfg) => [
    `[trigger] Received ${(cfg.event as string) ?? 'push'} event`,
    `[trigger] Repository: ${(cfg.repo as string) ?? 'owner/repo'}`,
    `[trigger] Branch: ${(cfg.branch as string) ?? 'main'}`,
    `[trigger] Commit: ${randomSha()}`,
    `[trigger] ✓ ${label} fired`,
  ].join('\n'),

  build: (label, cfg) => {
    const pm = (cfg.packageManager as string) ?? 'npm'
    const cmd = (cfg.buildCommand as string) ?? `${pm} run build`
    return [
      `[build] Runtime: ${(cfg.runtime as string) ?? 'node'}`,
      `[build] $ ${pm} install`,
      `[build]   added 312 packages in 4.2s`,
      `[build] $ ${cmd}`,
      `[build]   > compiled successfully`,
      `[build]   > dist/ 2.4 MB`,
      `[build] ✓ ${label} complete`,
    ].join('\n')
  },

  test: (_label, cfg) => {
    const runner = (cfg.runner as string) ?? 'vitest'
    return [
      `[test] Runner: ${runner}`,
      `[test] Collecting test files...`,
      `[test]  ✓ auth.test.ts (4 tests) 12ms`,
      `[test]  ✓ api.test.ts (8 tests) 34ms`,
      `[test]  ✓ utils.test.ts (6 tests) 8ms`,
      `[test] Test Files  3 passed (3)`,
      `[test] Tests       18 passed (18)`,
      cfg.coverage ? `[test] Coverage   87.4% statements` : '',
    ].filter(Boolean).join('\n')
  },

  docker: (_label, cfg) => [
    `[docker] Base image: ${(cfg.baseImage as string) ?? 'node:20-alpine'}`,
    `[docker] Step 1/6: FROM ${(cfg.baseImage as string) ?? 'node:20-alpine'}`,
    `[docker] Step 2/6: WORKDIR /app`,
    `[docker] Step 3/6: COPY package*.json ./`,
    `[docker] Step 4/6: RUN npm ci --only=production`,
    `[docker] Step 5/6: COPY . .`,
    `[docker] Step 6/6: CMD ["node", "dist/index.js"]`,
    `[docker] Successfully built ${randomHash(12)}`,
    `[docker] Pushing to ${(cfg.registry as string) ?? 'ghcr'}...`,
    `[docker] ✓ Image pushed`,
  ].join('\n'),

  deploy: (_label, cfg) => [
    `[deploy] Provider: ${(cfg.provider as string) ?? 'aws'}`,
    `[deploy] Service: ${(cfg.service as string) ?? 'ECS Fargate'}`,
    `[deploy] Region: ${(cfg.region as string) ?? 'us-east-1'}`,
    `[deploy] Updating task definition...`,
    `[deploy] Registering new revision: 42`,
    `[deploy] Draining old tasks...`,
    `[deploy] New tasks healthy (2/2)`,
    `[deploy] ✓ Deployment complete`,
  ].join('\n'),

  claude_task: (label, cfg) => [
    `[claude] Running: ${(cfg.prompt as string) ?? label}`,
    `[claude] Analysing pipeline context...`,
    `[claude] ✓ Review complete — no issues found`,
  ].join('\n'),

  notify: (_label, cfg) => [
    `[notify] Channel: ${(cfg.channel as string) ?? 'slack'}`,
    `[notify] ✓ Notification sent`,
  ].join('\n'),
}

const MOCK_FAILURE_LOGS: Record<string, (label: string, config: Record<string, unknown>) => string> = {
  build: (_label, cfg) => {
    const pm = (cfg.packageManager as string) ?? 'npm'
    return [
      `[build] Runtime: ${(cfg.runtime as string) ?? 'node'}`,
      `[build] $ ${pm} install`,
      `[build]   added 312 packages in 4.1s`,
      `[build] $ ${pm} run build`,
      `[build] error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'`,
      `[build]   src/utils/format.ts(12,18): error TS2345`,
      `[build] Found 1 error. Watching for file changes.`,
      `[build] ✗ Build failed with exit code 1`,
    ].join('\n')
  },

  test: (_label, cfg) => {
    const runner = (cfg.runner as string) ?? 'vitest'
    return [
      `[test] Runner: ${runner}`,
      `[test] Collecting test files...`,
      `[test]  ✓ auth.test.ts (4 tests) 12ms`,
      `[test]  ✗ api.test.ts (8 tests) 241ms`,
      `[test]    AssertionError: expected 404 to equal 200`,
      `[test]    at GET /api/users (api.test.ts:34)`,
      `[test]  ✓ utils.test.ts (6 tests) 8ms`,
      `[test] Test Files  1 failed | 2 passed (3)`,
      `[test] Tests       1 failed | 17 passed (18)`,
      `[test] ✗ Test run failed`,
    ].join('\n')
  },

  docker: (_label, cfg) => [
    `[docker] Base image: ${(cfg.baseImage as string) ?? 'node:20-alpine'}`,
    `[docker] Step 1/6: FROM ${(cfg.baseImage as string) ?? 'node:20-alpine'}`,
    `[docker] Step 2/6: WORKDIR /app`,
    `[docker] Step 3/6: COPY package*.json ./`,
    `[docker] Step 4/6: RUN npm ci --only=production`,
    `[docker] npm ERR! code ENOENT`,
    `[docker] npm ERR! syscall open`,
    `[docker] npm ERR! path /app/package-lock.json`,
    `[docker] npm ERR! errno -2`,
    `[docker] ✗ Docker build failed (exit code 1)`,
  ].join('\n'),

  deploy: (_label, cfg) => [
    `[deploy] Provider: ${(cfg.provider as string) ?? 'aws'}`,
    `[deploy] Service: ${(cfg.service as string) ?? 'ECS Fargate'}`,
    `[deploy] Updating task definition...`,
    `[deploy] Error: AccessDeniedException: User is not authorized to perform ecs:RegisterTaskDefinition`,
    `[deploy] Check IAM permissions for the deploy role`,
    `[deploy] ✗ Deployment failed`,
  ].join('\n'),
}

function randomSha() {
  return Math.random().toString(16).slice(2, 10)
}

function randomHash(len: number) {
  return Math.random().toString(16).slice(2, 2 + len)
}

// ~15% failure rate on non-trigger nodes for realistic demo behaviour
const FAILURE_RATE = 0.15

export async function mockRunNode(node: NodePayload): Promise<RunResult> {
  const durationMs = 700 + Math.random() * 1400
  await new Promise((r) => setTimeout(r, durationMs))

  const cfg = (node.data.config as Record<string, unknown>) ?? {}
  const shouldFail =
    node.data.nodeType !== 'trigger' &&
    node.data.nodeType !== 'notify' &&
    Math.random() < FAILURE_RATE

  if (shouldFail) {
    const failFn = MOCK_FAILURE_LOGS[node.data.nodeType]
    const logs = failFn
      ? failFn(node.data.label, cfg)
      : `[${node.data.nodeType}] ✗ Unexpected error (exit code 1)`
    return { success: false, logs, durationMs: Math.round(durationMs) }
  }

  const logFn = MOCK_LOGS[node.data.nodeType] ?? ((_l: string) => `[${node.data.nodeType}] ✓ Done`)
  const logs = logFn(node.data.label, cfg)
  return { success: true, logs, durationMs: Math.round(durationMs) }
}

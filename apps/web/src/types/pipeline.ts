export type NodeStatus = 'idle' | 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export type NodeType =
  | 'trigger'
  | 'build'
  | 'test'
  | 'docker'
  | 'deploy'
  | 'claude_task'
  | 'notify'
  // ── Observability nodes (Epic 4 Phase 3) ─────────────────────────────────
  | 'grafana'
  | 'prometheus'
  | 'trivy'
  | 'security_audit'
  | 'playwright'
  | 'seo_audit'

export type RunState = 'idle' | 'running' | 'complete' | 'failed'

// ── Node config types ────────────────────────────────────────────────────────

export interface TriggerConfig {
  provider: 'github' | 'gitlab' | 'manual'
  repo?: string
  branch?: string
  event: 'push' | 'pr' | 'tag' | 'manual'
  // GitHub-specific
  workflowName?: string
  pathsFilter?: string        // comma-separated, e.g. "src/**,package.json"
  ignorePaths?: string        // comma-separated paths to ignore
  concurrencyGroup?: string   // defaults to "${{ github.workflow }}-${{ github.ref }}"
  environment?: string        // GitHub environment (for secrets/approvals)
  enableConcurrencyCancel?: boolean  // cancel in-progress runs
}

export interface BuildConfig {
  ciProvider: 'github_actions' | 'jenkins' | 'none'
  runtime: 'node' | 'python' | 'go' | 'rust' | 'java'
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'poetry' | 'cargo' | 'maven' | 'gradle'
  buildCommand?: string
  // Runtime version pinning
  nodeVersion?: string    // e.g. '20'
  pythonVersion?: string  // e.g. '3.12'
  goVersion?: string      // e.g. '1.22'
  javaVersion?: string    // e.g. '21'
  // Additional steps
  lintCommand?: string    // e.g. 'pnpm lint'
  workingDirectory?: string  // monorepo support, e.g. 'apps/web'
  cacheEnabled?: boolean  // enable dependency caching (default true)
}

export interface DeployConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'fly' | 'vercel' | 'render'
  service?: string
  region?: string
}

export interface DockerConfig {
  registry?: 'dockerhub' | 'ecr' | 'gcr' | 'acr' | 'ghcr'
  imageName?: string
  tag?: string
  // Dockerfile options
  baseImage?: string
  dockerfilePath?: string   // default: Dockerfile
  contextPath?: string      // default: .
  // Build options
  platforms?: 'amd64' | 'arm64' | 'multi'  // multi = linux/amd64,linux/arm64
  buildArgs?: string        // KEY=VALUE lines, one per line
  target?: string           // multi-stage target
  // Push behaviour
  pushOnBranch?: string     // e.g. 'main' — only push on this branch
  scanAfterPush?: boolean   // run trivy after push
  // Registry-specific
  ecrRegion?: string        // for ECR
  ecrAccountId?: string     // for ECR, e.g. '123456789012'
  gcrProject?: string       // for GCR
  acrRegistry?: string      // e.g. myregistry.azurecr.io
}

export interface TestConfig {
  runner?: 'jest' | 'vitest' | 'pytest' | 'go_test' | 'cargo_test'
  coverage?: boolean
  testCommand?: string      // override default test command
}

export interface ClaudeTaskConfig {
  prompt: string
}

export interface NotifyConfig {
  channel?: 'slack' | 'email' | 'webhook'
  onSuccess?: boolean
  onFailure?: boolean
}

// ── Observability config types (Epic 4) ─────────────────────────────────────

export interface GrafanaConfig {
  dashboardUrl?: string
  datasource?: 'prometheus' | 'cloudwatch' | 'loki' | 'jaeger'
  alertThreshold?: number
}

export interface PrometheusConfig {
  endpoint?: string
  scrapeInterval?: number
  metrics?: string[]
}

export interface TrivyConfig {
  severity?: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[]
  failOnSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'none'
  ignoreUnfixed?: boolean
}

export interface SecurityAuditConfig {
  tools?: ('snyk' | 'semgrep' | 'sonarqube' | 'checkov')[]
  failOnCritical?: boolean
}

export interface PlaywrightConfig {
  baseUrl?: string
  browsers?: ('chromium' | 'firefox' | 'webkit')[]
  testDir?: string
  reportType?: 'html' | 'json' | 'junit'
}

export interface SeoAuditConfig {
  targetUrl?: string
  minScore?: number
  categories?: ('performance' | 'accessibility' | 'best-practices' | 'seo')[]
}

export type NodeConfig =
  | TriggerConfig
  | BuildConfig
  | DeployConfig
  | DockerConfig
  | TestConfig
  | ClaudeTaskConfig
  | NotifyConfig
  | GrafanaConfig
  | PrometheusConfig
  | TrivyConfig
  | SecurityAuditConfig
  | PlaywrightConfig
  | SeoAuditConfig

// ── Pipeline group boxes ─────────────────────────────────────────────────────

export type GroupColor = 'slate' | 'orange' | 'green' | 'purple' | 'blue' | 'pink'

export interface GroupConfig {
  label: string
  color: GroupColor
  memberIds: string[]
  position: { x: number; y: number }
  size: { width: number; height: number }
}

// ── Node data ────────────────────────────────────────────────────────────────

export interface GeneratedFile {
  path: string
  content: string
  language?: string   // for syntax highlighting hints
}

export interface PipelineNodeData extends Record<string, unknown> {
  label: string
  nodeType: NodeType
  status: NodeStatus
  config?: NodeConfig
  generatedFiles?: GeneratedFile[]
  aiSummary?: string
  suggestedFix?: string
}

/**
 * github.ts — GitHub REST API v3 client
 * ─────────────────────────────────────────────────────────────────────────────
 * Required token scopes:
 *   repo          → commits, workflow runs, jobs
 *   workflow      → trigger / re-run jobs
 *   security_events → dependabot/vulnerability alerts (TrivyScan widget)
 */

const GH_BASE = 'https://api.github.com'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GHCommit {
  sha: string          // full 40-char
  shortSha: string     // first 7 chars
  message: string      // first line only
  author: string
  avatarUrl: string
  timestamp: string    // ISO-8601
  branch: string
  url: string
}

export type WorkflowRunStatus    = 'queued' | 'in_progress' | 'completed'
export type WorkflowRunConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null

export interface GHWorkflowRun {
  id: number
  workflowName: string
  status: WorkflowRunStatus
  conclusion: WorkflowRunConclusion
  /** Duration in seconds, null if still running */
  durationSec: number | null
  branch: string
  shortSha: string
  url: string
  createdAt: string
  actor: string
  actorAvatar: string
}

export type JobStatus    = 'queued' | 'in_progress' | 'completed'
export type JobConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | null

export interface GHJob {
  id: number
  name: string
  status: JobStatus
  conclusion: JobConclusion
  durationSec: number | null
  startedAt: string | null
  url: string
}

export interface GHDependabotAlert {
  number: number
  state: 'open' | 'dismissed' | 'fixed' | 'auto_dismissed'
  severity: 'critical' | 'high' | 'medium' | 'low'
  summary: string
  packageName: string
  packageVersion: string
  fixedIn: string | null
  cve: string | null
  url: string
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class GitHubClient {
  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repo: string,
  ) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${GH_BASE}${path}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`GitHub ${res.status} ${res.statusText}${body ? ': ' + body.slice(0, 200) : ''}`)
    }
    return res.json() as Promise<T>
  }

  // ── Commits ─────────────────────────────────────────────────────────────────

  async getCommits(branch?: string, perPage = 15): Promise<GHCommit[]> {
    const params: Record<string, string> = { per_page: String(perPage) }
    if (branch) params.sha = branch

    const raw = await this.get<any[]>(
      `/repos/${this.owner}/${this.repo}/commits`,
      params,
    )

    return raw.map((c) => ({
      sha:       c.sha,
      shortSha:  c.sha.slice(0, 7),
      message:   c.commit.message.split('\n')[0].slice(0, 80),
      author:    c.commit.author?.name ?? c.author?.login ?? 'unknown',
      avatarUrl: c.author?.avatar_url ?? '',
      timestamp: c.commit.author?.date ?? '',
      branch:    branch ?? 'main',
      url:       c.html_url,
    }))
  }

  // ── Workflow runs ────────────────────────────────────────────────────────────

  async getWorkflowRuns(branch?: string, perPage = 20): Promise<GHWorkflowRun[]> {
    const params: Record<string, string> = { per_page: String(perPage) }
    if (branch) params.branch = branch

    const raw = await this.get<{ workflow_runs: any[] }>(
      `/repos/${this.owner}/${this.repo}/actions/runs`,
      params,
    )

    return raw.workflow_runs.map((r) => {
      const started = r.run_started_at ? Date.parse(r.run_started_at) : null
      const updated = r.updated_at    ? Date.parse(r.updated_at)     : null
      return {
        id:           r.id,
        workflowName: r.name,
        status:       r.status as WorkflowRunStatus,
        conclusion:   r.conclusion as WorkflowRunConclusion,
        durationSec:  started && updated && r.status === 'completed'
                        ? Math.round((updated - started) / 1000)
                        : null,
        branch:       r.head_branch,
        shortSha:     r.head_sha.slice(0, 7),
        url:          r.html_url,
        createdAt:    r.created_at,
        actor:        r.actor?.login ?? '',
        actorAvatar:  r.actor?.avatar_url ?? '',
      }
    })
  }

  /** Jobs for the most recent run of a specific workflow file (e.g. "ci.yml") */
  async getLatestWorkflowJobs(workflowFile: string, branch?: string): Promise<GHJob[]> {
    const params: Record<string, string> = { per_page: '1' }
    if (branch) params.branch = branch

    const runs = await this.get<{ workflow_runs: any[] }>(
      `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowFile}/runs`,
      params,
    )
    const latestRun = runs.workflow_runs[0]
    if (!latestRun) return []

    return this.getJobsForRun(latestRun.id)
  }

  async getJobsForRun(runId: number): Promise<GHJob[]> {
    const raw = await this.get<{ jobs: any[] }>(
      `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/jobs`,
    )
    return raw.jobs.map((j) => {
      const s = j.started_at   ? Date.parse(j.started_at)   : null
      const e = j.completed_at ? Date.parse(j.completed_at) : null
      return {
        id:         j.id,
        name:       j.name,
        status:     j.status as JobStatus,
        conclusion: j.conclusion as JobConclusion,
        durationSec: s && e ? Math.round((e - s) / 1000) : null,
        startedAt:  j.started_at ?? null,
        url:        j.html_url,
      }
    })
  }

  // ── Security / Dependabot ─────────────────────────────────────────────────

  async getDependabotAlerts(state = 'open'): Promise<GHDependabotAlert[]> {
    const raw = await this.get<any[]>(
      `/repos/${this.owner}/${this.repo}/dependabot/alerts`,
      { state, per_page: '30' },
    )
    return raw.map((a) => ({
      number:         a.number,
      state:          a.state,
      severity:       a.security_advisory?.severity ?? 'unknown',
      summary:        a.security_advisory?.summary ?? '',
      packageName:    a.dependency?.package?.name ?? '',
      packageVersion: a.dependency?.manifest_path ?? '',
      fixedIn:        a.security_vulnerability?.first_patched_version?.identifier ?? null,
      cve:            a.security_advisory?.cve_id ?? null,
      url:            a.html_url,
    }))
  }

  // ── Docker workflow runs (for DockerBuildStatus) ──────────────────────────

  async getDockerWorkflowRuns(perPage = 10): Promise<GHWorkflowRun[]> {
    // Fetch runs where workflow name contains "docker" or "build"
    const all = await this.getWorkflowRuns(undefined, 40)
    const docker = all.filter((r) =>
      /docker|build|image|container/i.test(r.workflowName),
    )
    return docker.slice(0, perPage)
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmtDuration(sec: number | null): string {
  if (sec === null) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function fmtRelative(iso: string): string {
  const diff = Date.now() - Date.parse(iso)
  const min  = Math.floor(diff / 60_000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

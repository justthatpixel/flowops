/**
 * useGitHub.ts — React hooks for GitHub data
 * ─────────────────────────────────────────────────────────────────────────────
 * Each hook polls on an interval, returns { data, loading, error, configured }.
 * When not configured (no token/owner/repo) `configured` is false and data is [].
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSettingsStore, isGitHubConfigured } from '@/store/settingsStore'
import {
  GitHubClient,
  type GHCommit,
  type GHWorkflowRun,
  type GHJob,
  type GHDependabotAlert,
} from '@/lib/integrations/github'

// ─── Hook factory ─────────────────────────────────────────────────────────────

function useGitHubClient(): GitHubClient | null {
  const cfg = useSettingsStore((s) => s.github)
  if (!isGitHubConfigured(cfg)) return null
  return new GitHubClient(cfg.token, cfg.owner, cfg.repo)
}

function usePolled<T>(
  fetcher: (() => Promise<T>) | null,
  intervalMs: number,
  initial: T,
) {
  const [data, setData]       = useState<T>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fetcherRef            = useRef(fetcher)
  fetcherRef.current          = fetcher

  const run = useCallback(() => {
    const fn = fetcherRef.current
    if (!fn) return
    setLoading(true)
    fn()
      .then((d) => { setData(d); setError(null) })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!fetcher) { setData(initial); setError(null); return }
    run()
    const id = setInterval(run, intervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!fetcher, intervalMs])

  return { data, loading, error }
}

// ─── Public hooks ─────────────────────────────────────────────────────────────

export function useGitHubCommits(branch?: string, pollMs = 60_000) {
  const cfg    = useSettingsStore((s) => s.github)
  const client = useGitHubClient()

  const { data, loading, error } = usePolled<GHCommit[]>(
    client ? () => client.getCommits(branch ?? cfg.defaultBranch) : null,
    pollMs,
    [],
  )

  return { commits: data, loading, error, configured: isGitHubConfigured(cfg) }
}

export function useGitHubWorkflowRuns(branch?: string, pollMs = 30_000) {
  const cfg    = useSettingsStore((s) => s.github)
  const client = useGitHubClient()

  const { data, loading, error } = usePolled<GHWorkflowRun[]>(
    client ? () => client.getWorkflowRuns(branch) : null,
    pollMs,
    [],
  )

  return { runs: data, loading, error, configured: isGitHubConfigured(cfg) }
}

export function useGitHubLatestJobs(workflowFile: string, branch?: string, pollMs = 30_000) {
  const cfg    = useSettingsStore((s) => s.github)
  const client = useGitHubClient()

  const { data, loading, error } = usePolled<GHJob[]>(
    client ? () => client.getLatestWorkflowJobs(workflowFile, branch) : null,
    pollMs,
    [],
  )

  return { jobs: data, loading, error, configured: isGitHubConfigured(cfg) }
}

export function useGitHubDependabotAlerts(pollMs = 300_000) {
  const cfg    = useSettingsStore((s) => s.github)
  const client = useGitHubClient()

  const { data, loading, error } = usePolled<GHDependabotAlert[]>(
    client ? () => client.getDependabotAlerts() : null,
    pollMs,
    [],
  )

  return { alerts: data, loading, error, configured: isGitHubConfigured(cfg) }
}

export function useGitHubDockerRuns(pollMs = 60_000) {
  const cfg    = useSettingsStore((s) => s.github)
  const client = useGitHubClient()

  const { data, loading, error } = usePolled<GHWorkflowRun[]>(
    client ? () => client.getDockerWorkflowRuns() : null,
    pollMs,
    [],
  )

  return { runs: data, loading, error, configured: isGitHubConfigured(cfg) }
}

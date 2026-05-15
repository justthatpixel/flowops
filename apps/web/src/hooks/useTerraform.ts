/**
 * useTerraform.ts — React hooks for Terraform Cloud data
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSettingsStore, isTerraformConfigured } from '@/store/settingsStore'
import { TerraformClient, type TFPlanResult } from '@/lib/integrations/terraform'

function useTFClient(): TerraformClient | null {
  const cfg = useSettingsStore((s) => s.terraform)
  if (!isTerraformConfigured(cfg)) return null
  return new TerraformClient(cfg.token, cfg.organization)
}

// ─── useTerraformPlan ─────────────────────────────────────────────────────────

/**
 * Fetches the latest plan for the configured workspace, including the full
 * resource-change diff (before/after for every attribute that changed).
 * Polls every `pollMs` ms (default 30s — plans change infrequently).
 */
export function useTerraformPlan(pollMs = 30_000) {
  const cfg    = useSettingsStore((s) => s.terraform)
  const client = useTFClient()

  const [plan, setPlan]       = useState<TFPlanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetcherRef = useRef<(() => Promise<void>) | null>(null)
  fetcherRef.current = client
    ? async () => {
        const result = await client.getLatestPlan(cfg.workspace)
        setPlan(result)
        setError(null)
      }
    : null

  const run = useCallback(() => {
    const fn = fetcherRef.current
    if (!fn) return
    setLoading(true)
    fn().catch((e: any) => setError(e.message ?? String(e))).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!client) { setPlan(null); setError(null); return }
    run()
    const id = setInterval(run, pollMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!client, pollMs])

  return {
    plan,
    loading,
    error,
    configured: isTerraformConfigured(cfg),
  }
}

// ─── useTerraformWorkspace (kept for other uses) ──────────────────────────────

export function useTerraformWorkspace(pollMs = 60_000) {
  const cfg    = useSettingsStore((s) => s.terraform)
  const client = useTFClient()

  const [workspace, setWorkspace] = useState<any | null>(null)
  const [runs, setRuns]           = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const run = useCallback(() => {
    if (!client) return
    setLoading(true)
    client.getWorkspaceAndRuns(cfg.workspace)
      .then(({ workspace: ws, runs: r }) => { setWorkspace(ws); setRuns(r); setError(null) })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [client, cfg.workspace])

  useEffect(() => {
    if (!client) { setWorkspace(null); setRuns([]); setError(null); return }
    run()
    const id = setInterval(run, pollMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!client, pollMs])

  return { workspace, runs, loading, error, configured: isTerraformConfigured(cfg) }
}

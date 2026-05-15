/**
 * useKubernetes.ts — React hooks for Kubernetes data
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSettingsStore, isKubernetesConfigured } from '@/store/settingsStore'
import { KubernetesClient, type KubeDeployment, type KubePod } from '@/lib/integrations/kubernetes'

function useK8sClient(): KubernetesClient | null {
  const cfg = useSettingsStore((s) => s.kubernetes)
  if (!isKubernetesConfigured(cfg)) return null
  return new KubernetesClient(cfg.endpoint, cfg.token, cfg.namespace, cfg.proxyMode)
}

function usePolledK8s<T>(
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

export function useKubeDeployments(pollMs = 15_000) {
  const cfg    = useSettingsStore((s) => s.kubernetes)
  const client = useK8sClient()

  const { data, loading, error } = usePolledK8s<KubeDeployment[]>(
    client ? () => client.getDeployments() : null,
    pollMs,
    [],
  )

  return { deployments: data, loading, error, configured: isKubernetesConfigured(cfg) }
}

export function useKubePods(pollMs = 15_000) {
  const cfg    = useSettingsStore((s) => s.kubernetes)
  const client = useK8sClient()

  const { data, loading, error } = usePolledK8s<KubePod[]>(
    client ? () => client.getPods() : null,
    pollMs,
    [],
  )

  return { pods: data, loading, error, configured: isKubernetesConfigured(cfg) }
}

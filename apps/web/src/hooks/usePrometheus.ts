/**
 * usePrometheus.ts — React hooks for Prometheus metrics
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSettingsStore, isPrometheusConfigured } from '@/store/settingsStore'
import {
  PrometheusClient,
  type PromInstantVector,
  lastNMinutes,
} from '@/lib/integrations/prometheus'

function usePromClient(): PrometheusClient | null {
  const cfg = useSettingsStore((s) => s.prometheus)
  if (!isPrometheusConfigured(cfg)) return null
  return new PrometheusClient(cfg.endpoint, cfg.bearerToken || undefined)
}

export interface PromStat {
  label: string
  value: string
  trend?: 'up' | 'down' | 'stable'
}

/** Returns a single current metric value */
export function usePromQuery(promql: string, pollMs = 15_000) {
  const cfg    = useSettingsStore((s) => s.prometheus)
  const client = usePromClient()

  const [data, setData]       = useState<PromInstantVector[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fetcherRef            = useRef<(() => Promise<void>) | null>(null)

  fetcherRef.current = client
    ? async () => {
        const r = await client.query(promql)
        setData(r)
        setError(null)
      }
    : null

  const run = useCallback(() => {
    const fn = fetcherRef.current
    if (!fn) return
    setLoading(true)
    fn().catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!client) { setData([]); setError(null); return }
    run()
    const id = setInterval(run, pollMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!client, promql, pollMs])

  return { data, loading, error, configured: isPrometheusConfigured(cfg) }
}

/** Predefined stats for the PrometheusStat widget */
export function usePrometheusStats(pollMs = 15_000) {
  const cfg    = useSettingsStore((s) => s.prometheus)
  const client = usePromClient()

  const QUERIES = [
    { label: 'http_requests_total',       promql: 'sum(rate(http_requests_total[5m]))',               unit: 'req/s' },
    { label: 'http_request_duration_p99', promql: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))', unit: 'seconds' },
    { label: 'error_rate',                promql: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))', unit: 'percent' },
    { label: 'active_connections',        promql: 'sum(http_server_active_connections)',               unit: '' },
    { label: 'cpu_usage_avg',             promql: 'avg(rate(container_cpu_usage_seconds_total[5m])) * 100', unit: 'percent' },
  ]

  const [stats, setStats]     = useState<PromStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const run = useCallback(() => {
    if (!client) return
    setLoading(true)
    Promise.all(
      QUERIES.map(async ({ label, promql, unit }) => {
        try {
          const vecs = await client.query(promql)
          const raw  = vecs[0]?.value[1] ?? '0'
          const n    = parseFloat(raw)
          let value = '—'
          if (!isNaN(n)) {
            if (unit === 'seconds')     value = `${(n * 1000).toFixed(1)}ms`
            else if (unit === 'percent') value = `${(n * 100).toFixed(2)}%`
            else if (n >= 1e6)          value = `${(n / 1e6).toFixed(1)}M`
            else if (n >= 1e3)          value = `${(n / 1e3).toFixed(1)}K`
            else                        value = n.toFixed(n % 1 === 0 ? 0 : 2)
          }
          return { label, value } as PromStat
        } catch {
          return { label, value: '—' } as PromStat
        }
      }),
    )
      .then((s) => { setStats(s); setError(null) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [client])

  useEffect(() => {
    if (!client) { setStats([]); setError(null); return }
    run()
    const id = setInterval(run, pollMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!client, pollMs])

  return { stats, loading, error, configured: isPrometheusConfigured(cfg) }
}

/** Request-rate time series for Grafana-style bar chart */
export function useRequestRateSeries(bucketMinutes = 24 * 60, pollMs = 30_000) {
  const cfg    = useSettingsStore((s) => s.prometheus)
  const client = usePromClient()

  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const run = useCallback(() => {
    if (!client) return
    setLoading(true)
    const [start, end] = lastNMinutes(bucketMinutes)
    client
      .queryRange('sum(rate(http_requests_total[5m]))', start, end, '300s')
      .then((vecs) => {
        const pts = (vecs[0]?.values ?? []).map(([ts, v]) => ({
          x: ts * 1000,
          y: parseFloat(v) || 0,
        }))
        setPoints(pts)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [client, bucketMinutes])

  useEffect(() => {
    if (!client) { setPoints([]); setError(null); return }
    run()
    const id = setInterval(run, pollMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!client, pollMs])

  return { points, loading, error, configured: isPrometheusConfigured(cfg) }
}

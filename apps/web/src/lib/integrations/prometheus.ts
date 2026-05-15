/**
 * prometheus.ts — Prometheus HTTP API client
 * ─────────────────────────────────────────────────────────────────────────────
 * Docs: https://prometheus.io/docs/prometheus/latest/querying/api/
 *
 * NOTE: Prometheus doesn't set CORS headers by default.
 * Either expose it via a CORS-enabled reverse proxy or use
 * `--web.cors.origin=".*"` on the Prometheus server (dev only).
 */

export interface PromInstantVector {
  metric: Record<string, string>
  value: [number, string]  // [unix timestamp, string-formatted number]
}

export interface PromRangeVector {
  metric: Record<string, string>
  values: [number, string][]
}

export interface PromQueryResult<T> {
  resultType: 'vector' | 'matrix' | 'scalar' | 'string'
  result: T
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class PrometheusClient {
  constructor(
    private readonly endpoint: string,
    private readonly bearerToken?: string,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = {}
    if (this.bearerToken) h.Authorization = `Bearer ${this.bearerToken}`
    return h
  }

  /** Instant query — returns the current value of a PromQL expression */
  async query(promql: string): Promise<PromInstantVector[]> {
    const url = new URL(`${this.endpoint}/api/v1/query`)
    url.searchParams.set('query', promql)
    const res = await fetch(url.toString(), { headers: this.headers() })
    if (!res.ok) throw new Error(`Prometheus ${res.status}`)
    const json = await res.json()
    if (json.status !== 'success') throw new Error(json.error ?? 'Prometheus query failed')
    return json.data.result as PromInstantVector[]
  }

  /** Range query — returns a time series */
  async queryRange(
    promql: string,
    startSec: number,
    endSec: number,
    step = '60s',
  ): Promise<PromRangeVector[]> {
    const url = new URL(`${this.endpoint}/api/v1/query_range`)
    url.searchParams.set('query', promql)
    url.searchParams.set('start', String(startSec))
    url.searchParams.set('end',   String(endSec))
    url.searchParams.set('step',  step)
    const res = await fetch(url.toString(), { headers: this.headers() })
    if (!res.ok) throw new Error(`Prometheus ${res.status}`)
    const json = await res.json()
    if (json.status !== 'success') throw new Error(json.error ?? 'Prometheus range query failed')
    return json.data.result as PromRangeVector[]
  }

  /** Fetch a single scalar value (returns 0 on empty result) */
  async scalar(promql: string): Promise<number> {
    const vecs = await this.query(promql)
    if (!vecs.length) return 0
    return parseFloat(vecs[0].value[1]) || 0
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a raw Prometheus value with SI suffix */
export function fmtPromValue(raw: string | number, unit?: string): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  if (isNaN(n)) return '—'
  if (unit === 'bytes') {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}GB`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}MB`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}KB`
    return `${n}B`
  }
  if (unit === 'seconds') {
    if (n >= 1)    return `${(n * 1000).toFixed(0)}ms`
    return `${(n * 1000).toFixed(1)}ms`
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  if (n < 1 && n > 0) return `${(n * 100).toFixed(2)}%`
  return n.toFixed(n % 1 === 0 ? 0 : 2)
}

/** Convert a range vector into simple {x, y} chart points */
export function rangeToPoints(values: [number, string][]): { x: number; y: number }[] {
  return values.map(([ts, v]) => ({ x: ts * 1000, y: parseFloat(v) || 0 }))
}

/** Last N minutes as [startSec, endSec] */
export function lastNMinutes(n: number): [number, number] {
  const now = Math.floor(Date.now() / 1000)
  return [now - n * 60, now]
}

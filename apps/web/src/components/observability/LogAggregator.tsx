/**
 * LogAggregator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified log view (Phase 5).  Shows a merged, colour-coded stream of logs
 * from all pipeline stages.  Filterable by node, severity, and text search.
 */

import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import { usePipelineStore } from '@/store/pipelineStore'
import { NODE_CONFIG } from '@/lib/nodeConfig'

// ─── Mock log data generator ──────────────────────────────────────────────────

type Severity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogEntry {
  id: string
  timestamp: string
  nodeId: string
  nodeType: string
  nodeLabel: string
  severity: Severity
  message: string
}

const SEV_RANK: Record<Severity, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }

const SEV_COLOR: Record<Severity, string> = {
  DEBUG: '#6B7280',
  INFO:  '#9CA3AF',
  WARN:  '#F59E0B',
  ERROR: '#EF4444',
}

const SEV_BG: Record<Severity, string> = {
  DEBUG: '#F9FAFB',
  INFO:  'transparent',
  WARN:  '#FFFBEB',
  ERROR: '#FFF5F5',
}

function generateLogs(
  nodes: { id: string; data: { label: string; nodeType: string } }[],
): LogEntry[] {
  const logs: LogEntry[] = []
  const now = Date.now()

  const templates: Record<string, { sev: Severity; msg: string }[]> = {
    trigger: [
      { sev: 'INFO',  msg: 'Webhook received: push to main (sha: a3f9c12)' },
      { sev: 'INFO',  msg: 'Pipeline trigger condition matched' },
      { sev: 'DEBUG', msg: 'Parsing webhook payload — size: 4.2 KB' },
    ],
    build: [
      { sev: 'INFO',  msg: 'Cache restored: pnpm-store (hit)' },
      { sev: 'INFO',  msg: 'pnpm install — 842 modules (2.1s)' },
      { sev: 'INFO',  msg: 'vite v5.2.0 building for production...' },
      { sev: 'INFO',  msg: '✓ 1284 modules transformed in 8.43s' },
      { sev: 'DEBUG', msg: 'Output: dist/assets/index.js 521 kB (gzip: 167 kB)' },
    ],
    test: [
      { sev: 'INFO',  msg: 'vitest v1.6.0 running 27 test files...' },
      { sev: 'INFO',  msg: '✓ pipelineStore.test.ts (12 tests) 84ms' },
      { sev: 'INFO',  msg: '✓ nodeConfig.test.ts (6 tests) 12ms' },
      { sev: 'WARN',  msg: '1 snapshot obsolete — run with -u to update' },
      { sev: 'ERROR', msg: '✗ dashboardStore.test.ts — "activeView initialises to pipeline"' },
      { sev: 'INFO',  msg: '26/27 tests passed (1 failed)' },
    ],
    docker: [
      { sev: 'INFO',  msg: 'docker build -t flowops-web:a3f9c12 .' },
      { sev: 'DEBUG', msg: 'Step 1/8: FROM node:20-alpine AS deps' },
      { sev: 'DEBUG', msg: 'Step 3/8: RUN pnpm install --frozen-lockfile' },
      { sev: 'INFO',  msg: 'Successfully built a3f9c12cafe9' },
      { sev: 'INFO',  msg: 'Pushed to ghcr.io/flowops/web:a3f9c12 (182 MB)' },
    ],
    deploy: [
      { sev: 'INFO',  msg: 'Deploying to ECS Fargate (us-east-1)' },
      { sev: 'INFO',  msg: 'Registering task definition: flowops-web:48' },
      { sev: 'INFO',  msg: 'Updating service: flowops-web-svc' },
      { sev: 'WARN',  msg: 'Old task still draining — waiting up to 60s' },
      { sev: 'INFO',  msg: '✓ Service stable: 2/2 tasks running' },
    ],
    claude_task: [
      { sev: 'INFO',  msg: 'Claude Task starting — model: claude-3-5-haiku-20241022' },
      { sev: 'INFO',  msg: 'Prompt tokens: 342 | Completion tokens: 891' },
      { sev: 'INFO',  msg: '✓ Task completed — 4 files generated' },
    ],
    notify: [
      { sev: 'INFO',  msg: 'Sending Slack notification to #deployments' },
      { sev: 'INFO',  msg: '✓ Notification delivered (200 OK)' },
    ],
    grafana: [
      { sev: 'INFO',  msg: 'Grafana dashboard updated — 3 panels refreshed' },
      { sev: 'WARN',  msg: 'Alert rule "High error rate" is FIRING' },
    ],
    prometheus: [
      { sev: 'INFO',  msg: 'Scrape cycle complete — 24/24 targets up' },
      { sev: 'DEBUG', msg: 'Ingested 12,420 samples in 82ms' },
    ],
    trivy: [
      { sev: 'INFO',  msg: 'trivy image flowops-web:a3f9c12' },
      { sev: 'WARN',  msg: 'HIGH: CVE-2024-27982 node 20.11.0 — fix: 20.12.0' },
      { sev: 'WARN',  msg: 'HIGH: CVE-2024-28863 tar 6.2.0 — fix: 6.2.1' },
      { sev: 'INFO',  msg: '0 CRITICAL, 2 HIGH, 9 MEDIUM found. Gate passed.' },
    ],
    playwright: [
      { sev: 'INFO',  msg: 'Running Playwright tests — 3 browsers, 50 specs' },
      { sev: 'ERROR', msg: 'FAIL tests/auth.spec.ts:42 — timeout waiting for #login-btn (firefox)' },
      { sev: 'INFO',  msg: '142/150 tests passed across all browsers' },
    ],
  }

  nodes.forEach((node, ni) => {
    const lines = templates[node.data.nodeType] ?? [
      { sev: 'INFO' as const, msg: `${node.data.label} node executed` },
    ]
    lines.forEach((line, li) => {
      const offsetMs = ni * 180_000 + li * 3_500
      const ts = new Date(now - 3_600_000 + offsetMs)
      const hh = ts.getHours().toString().padStart(2, '0')
      const mm = ts.getMinutes().toString().padStart(2, '0')
      const ss = ts.getSeconds().toString().padStart(2, '0')
      logs.push({
        id: `${node.id}-${li}`,
        timestamp: `${hh}:${mm}:${ss}`,
        nodeId: node.id,
        nodeType: node.data.nodeType,
        nodeLabel: node.data.label,
        severity: line.sev,
        message: line.msg,
      })
    })
  })

  return logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const SEVERITIES: Severity[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']

function FilterBar({
  search, setSearch,
  minSev, setMinSev,
  nodeFilter, setNodeFilter,
  nodeIds,
}: {
  search: string
  setSearch: (s: string) => void
  minSev: Severity
  setMinSev: (s: Severity) => void
  nodeFilter: string
  setNodeFilter: (id: string) => void
  nodeIds: { id: string; label: string }[]
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid #E5E7EB',
        background: '#FFFFFF',
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
        <Search size={12} color="#9CA3AF" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          style={{
            width: '100%',
            height: 30,
            paddingLeft: 28,
            paddingRight: 8,
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: '"DM Sans", sans-serif',
            outline: 'none',
            color: '#374151',
            background: '#F9FAFB',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; e.target.style.background = '#fff' }}
          onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#F9FAFB' }}
        />
      </div>

      {/* Severity filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Filter size={11} color="#9CA3AF" />
        {SEVERITIES.map((s) => {
          const active = SEV_RANK[s] >= SEV_RANK[minSev]
          return (
            <button
              key={s}
              onClick={() => setMinSev(s)}
              style={{
                padding: '2px 8px',
                borderRadius: 5,
                border: `1px solid ${active ? SEV_COLOR[s] : '#E5E7EB'}`,
                background: active ? SEV_COLOR[s] + '15' : 'none',
                color: active ? SEV_COLOR[s] : '#9CA3AF',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif',
                transition: 'all 0.1s',
              }}
            >
              {s}
            </button>
          )
        })}
      </div>

      {/* Node filter */}
      <select
        value={nodeFilter}
        onChange={(e) => setNodeFilter(e.target.value)}
        style={{
          height: 30,
          paddingLeft: 8,
          paddingRight: 24,
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: '"DM Sans", sans-serif',
          color: '#374151',
          background: '#F9FAFB',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">All nodes</option>
        {nodeIds.map((n) => (
          <option key={n.id} value={n.id}>{n.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Log line ─────────────────────────────────────────────────────────────────

function LogLine({ entry }: { entry: LogEntry }) {
  const cfg = NODE_CONFIG[entry.nodeType as import('@/types/pipeline').NodeType]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        padding: '4px 16px',
        background: SEV_BG[entry.severity],
        borderBottom: '1px solid #F3F4F6',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        lineHeight: 1.6,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        if (entry.severity === 'INFO') el.style.background = '#F9FAFB'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.background = SEV_BG[entry.severity]
      }}
    >
      {/* Timestamp */}
      <span style={{ color: '#6B7280', flexShrink: 0, fontSize: 10 }}>
        {entry.timestamp}
      </span>

      {/* Severity badge */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: SEV_COLOR[entry.severity],
          background: SEV_COLOR[entry.severity] + '15',
          padding: '1px 5px',
          borderRadius: 3,
          flexShrink: 0,
          fontFamily: '"DM Sans", sans-serif',
          letterSpacing: '0.03em',
          minWidth: 40,
          textAlign: 'center',
        }}
      >
        {entry.severity}
      </span>

      {/* Node chip */}
      {cfg && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: cfg.color,
            background: cfg.color + '15',
            padding: '1px 5px',
            borderRadius: 3,
            flexShrink: 0,
            fontFamily: '"DM Sans", sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.nodeLabel}
        </span>
      )}

      {/* Message */}
      <span style={{ color: entry.severity === 'ERROR' ? '#EF4444' : entry.severity === 'WARN' ? '#F59E0B' : '#374151', flex: 1 }}>
        {entry.message}
      </span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LogAggregator() {
  const { nodes } = usePipelineStore()
  const [search, setSearch]         = useState('')
  const [minSev, setMinSev]         = useState<Severity>('DEBUG')
  const [nodeFilter, setNodeFilter] = useState('')

  const allLogs = useMemo(() => generateLogs(nodes as Parameters<typeof generateLogs>[0]), [nodes])

  const filtered = useMemo(() => {
    return allLogs.filter((e) => {
      if (SEV_RANK[e.severity] < SEV_RANK[minSev]) return false
      if (nodeFilter && e.nodeId !== nodeFilter) return false
      if (search && !e.message.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [allLogs, minSev, nodeFilter, search])

  const nodeIds = nodes.map((n) => ({ id: n.id, label: n.data.label }))
  const errorCount = filtered.filter((e) => e.severity === 'ERROR').length
  const warnCount  = filtered.filter((e) => e.severity === 'WARN').length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 16px 0',
          borderBottom: '1px solid #E5E7EB',
          background: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: '"DM Sans", sans-serif' }}>
            Log Aggregator
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
            Run #1048 · {filtered.length} entries
          </span>
          {errorCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', padding: '2px 7px', borderRadius: 99 }}>
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', background: '#FFFBEB', padding: '2px 7px', borderRadius: 99 }}>
              {warnCount} warning{warnCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        minSev={minSev} setMinSev={setMinSev}
        nodeFilter={nodeFilter} setNodeFilter={setNodeFilter}
        nodeIds={nodeIds}
      />

      {/* Log list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: '#9CA3AF',
              fontSize: 13,
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            No log entries match your filters.
          </div>
        ) : (
          filtered.map((entry) => <LogLine key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}

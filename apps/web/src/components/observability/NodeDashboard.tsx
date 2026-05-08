/**
 * NodeDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen overlay that shows per-node observability data when the user
 * clicks "View Dashboard" in the NodeConfigPanel.
 *
 * Structure:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  ← Back   [Icon] Node Label · type badge             [Close ✕]  │
 *   ├────────────────┬─────────────────────────────────────────────────┤
 *   │  Metrics strip (3 KPI cards)                                     │
 *   ├────────────────┬─────────────────────────────────────────────────┤
 *   │  Recent Runs table  │  Live log tail                             │
 *   └────────────────┴─────────────────────────────────────────────────┘
 *
 * All data is mocked — in Phase 6 this would be wired to real APIs.
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, X, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { NODE_CONFIG } from '@/lib/nodeConfig'
import type { NodeType } from '@/types/pipeline'

// ─── Mock data generators ─────────────────────────────────────────────────────

interface RunRecord {
  id: string
  status: 'success' | 'failed' | 'skipped'
  duration: string
  triggeredBy: string
  timestamp: string
  branch: string
}

interface KpiCard {
  label: string
  value: string
  sub?: string
  color?: string
}

function mockRuns(nodeType: NodeType): RunRecord[] {
  const statuses: RunRecord['status'][] = [
    'success', 'success', 'failed', 'success', 'success',
    'success', 'skipped', 'success', 'failed', 'success',
  ]
  const branches = ['main', 'main', 'feat/auth', 'main', 'feat/dashboard',
                    'main', 'fix/css', 'main', 'feat/obs', 'main']
  const users = ['alice', 'bob', 'alice', 'ci-bot', 'carol',
                 'ci-bot', 'bob', 'alice', 'carol', 'ci-bot']

  const now = Date.now()

  return statuses.map((status, i) => ({
    id: `#${1048 - i}`,
    status,
    duration: nodeType === 'build'   ? `${2 + (i % 4)}m ${10 + (i * 7) % 50}s`
             : nodeType === 'test'   ? `${1 + (i % 3)}m ${5 + (i * 11) % 55}s`
             : nodeType === 'docker' ? `${3 + (i % 5)}m ${20 + (i * 3) % 40}s`
             : nodeType === 'deploy' ? `${1 + (i % 2)}m ${15 + (i * 9) % 45}s`
             :                        `${(i % 2)}m ${8 + (i * 13) % 52}s`,
    triggeredBy: users[i],
    branch: branches[i],
    timestamp: new Date(now - i * 3600_000 - i * 180_000).toLocaleString(),
  }))
}

function mockKpis(nodeType: NodeType): KpiCard[] {
  switch (nodeType) {
    case 'trigger':
      return [
        { label: 'Total Triggers',   value: '1,048', sub: 'all time'           },
        { label: 'Success Rate',     value: '97.2%',  color: '#22C55E'         },
        { label: 'Avg Response',     value: '0.4s',   sub: 'to first node'     },
      ]
    case 'build':
      return [
        { label: 'Avg Build Time',   value: '3m 42s', sub: 'last 30 days'      },
        { label: 'Success Rate',     value: '94.1%',  color: '#22C55E'         },
        { label: 'Cache Hit Rate',   value: '82%',    sub: 'pnpm store'        },
      ]
    case 'test':
      return [
        { label: 'Tests Passing',    value: '264 / 271', sub: 'latest run'     },
        { label: 'Coverage',         value: '87.3%',     color: '#3B82F6'      },
        { label: 'Avg Duration',     value: '1m 58s',    sub: 'last 30 days'   },
      ]
    case 'docker':
      return [
        { label: 'Image Size',       value: '182 MB',    sub: 'compressed'     },
        { label: 'Build Time',       value: '4m 11s',    sub: 'avg last 10'    },
        { label: 'Layer Cache',      value: '91%',       color: '#22C55E'      },
      ]
    case 'deploy':
      return [
        { label: 'Deployments',      value: '1,048',     sub: 'all time'       },
        { label: 'MTTR',             value: '4m 32s',    sub: 'mean recovery'  },
        { label: 'Uptime',           value: '99.92%',    color: '#22C55E'      },
      ]
    case 'grafana':
      return [
        { label: 'Active Dashboards', value: '12',       sub: 'panels'         },
        { label: 'Alert Firing',      value: '2',        color: '#EF4444'      },
        { label: 'Data Sources',      value: '4',        sub: 'connected'      },
      ]
    case 'prometheus':
      return [
        { label: 'Active Series',    value: '48,231',    sub: 'time series'    },
        { label: 'Scrape Targets',   value: '24 / 24',   color: '#22C55E'      },
        { label: 'Ingestion Rate',   value: '12k/s',     sub: 'samples'        },
      ]
    case 'trivy':
      return [
        { label: 'Critical',         value: '0',         color: '#22C55E'      },
        { label: 'High',             value: '3',         color: '#F59E0B'      },
        { label: 'Medium',           value: '11',        sub: 'vulnerabilities'},
      ]
    case 'security_audit':
      return [
        { label: 'Issues Found',     value: '7',         sub: 'last scan'      },
        { label: 'Critical',         value: '1',         color: '#EF4444'      },
        { label: 'Scan Duration',    value: '2m 14s',    sub: 'all tools'      },
      ]
    case 'playwright':
      return [
        { label: 'Tests',            value: '142 / 150', sub: 'passing'        },
        { label: 'Browsers',         value: '3',         sub: 'chromium/ff/wk' },
        { label: 'Avg Duration',     value: '3m 28s',    sub: 'full suite'     },
      ]
    case 'seo_audit':
      return [
        { label: 'Performance',      value: '94',        color: '#22C55E'      },
        { label: 'SEO Score',        value: '98',        color: '#22C55E'      },
        { label: 'Accessibility',    value: '88',        color: '#F59E0B'      },
      ]
    default:
      return [
        { label: 'Total Runs',       value: '1,048',     sub: 'all time'       },
        { label: 'Success Rate',     value: '94.8%',     color: '#22C55E'      },
        { label: 'Avg Duration',     value: '2m 10s',    sub: 'last 30 days'   },
      ]
  }
}

function mockLogLines(nodeType: NodeType): { kind: 'info' | 'warn' | 'error' | 'debug'; text: string }[] {
  const base = [
    { kind: 'info'  as const, text: '[09:14:32] Pipeline run #1048 started' },
    { kind: 'info'  as const, text: '[09:14:32] Checking out branch: main (sha: a3f9c12)' },
  ]

  type LogLine = { kind: 'info' | 'warn' | 'error' | 'debug'; text: string }
  const typeLines: Record<string, LogLine[]> = {
    build: [
      { kind: 'info',  text: '[09:14:33] Cache restored from pnpm-store' },
      { kind: 'info',  text: '[09:14:35] pnpm install — 842 modules resolved (2.1s)' },
      { kind: 'info',  text: '[09:14:37] vite v5.2.0 building for production...' },
      { kind: 'info',  text: '[09:14:41] ✓ 1284 modules transformed.' },
      { kind: 'info',  text: '[09:14:41] dist/assets/index.js  521.38 kB │ gzip: 167.81 kB' },
      { kind: 'info',  text: '[09:14:41] ✓ built in 8.43s' },
    ],
    test: [
      { kind: 'info',  text: '[09:15:02] vitest v1.6.0 starting...' },
      { kind: 'info',  text: '[09:15:04] ✓ pipelineStore.test.ts (12 tests) 84ms' },
      { kind: 'info',  text: '[09:15:05] ✓ nodeConfig.test.ts (6 tests) 12ms' },
      { kind: 'warn',  text: '[09:15:08] ⚠ NodeConfigPanel.test.tsx — 1 snapshot obsolete' },
      { kind: 'info',  text: '[09:15:09] ✓ 26/27 tests passed' },
      { kind: 'error', text: '[09:15:09] ✗ DashboardStore.test.ts — 1 test failed: "activeView initialises to pipeline"' },
    ],
    docker: [
      { kind: 'info',  text: '[09:16:10] docker build -t flowops-web:a3f9c12 .' },
      { kind: 'info',  text: '[09:16:11] Step 1/8 : FROM node:20-alpine AS deps' },
      { kind: 'info',  text: '[09:16:12] Step 2/8 : COPY package.json pnpm-lock.yaml ./' },
      { kind: 'debug', text: '[09:16:12]  ---> Using cache' },
      { kind: 'info',  text: '[09:16:14] Step 5/8 : RUN pnpm build' },
      { kind: 'info',  text: '[09:16:22] Successfully tagged flowops-web:a3f9c12' },
      { kind: 'info',  text: '[09:16:22] Pushed to ghcr.io/flowops/web:a3f9c12 (182 MB)' },
    ],
    deploy: [
      { kind: 'info',  text: '[09:17:05] Deploying to ECS Fargate (us-east-1)' },
      { kind: 'info',  text: '[09:17:06] Updating task definition: flowops-web:48' },
      { kind: 'info',  text: '[09:17:07] Registering new task definition revision' },
      { kind: 'info',  text: '[09:17:09] Updating service: flowops-web-svc' },
      { kind: 'info',  text: '[09:17:11] Waiting for service stability...' },
      { kind: 'info',  text: '[09:17:44] ✓ Service stable. 2/2 tasks running.' },
      { kind: 'info',  text: '[09:17:44] Health check: https://api.flowops.example.com/health → 200 OK' },
    ],
    trivy: [
      { kind: 'info',  text: '[09:15:50] trivy image flowops-web:a3f9c12' },
      { kind: 'info',  text: '[09:15:52] Scanning image... (3 layers)' },
      { kind: 'warn',  text: '[09:15:53] HIGH: CVE-2024-27982 node 20.11.0 — fix: 20.12.0' },
      { kind: 'warn',  text: '[09:15:53] HIGH: CVE-2024-28863 tar 6.2.0 — fix: 6.2.1' },
      { kind: 'warn',  text: '[09:15:53] MEDIUM: 11 medium vulnerabilities found' },
      { kind: 'info',  text: '[09:15:53] ✓ No CRITICAL vulnerabilities. Gate passed.' },
    ],
    playwright: [
      { kind: 'info',  text: '[09:18:02] Running Playwright tests — 3 browsers' },
      { kind: 'info',  text: '[09:18:04] chromium: 50/50 tests passed' },
      { kind: 'info',  text: '[09:18:12] firefox: 49/50 tests passed' },
      { kind: 'error', text: '[09:18:12] firefox: FAIL tests/auth.spec.ts:42 — timeout waiting for #login-btn' },
      { kind: 'info',  text: '[09:18:21] webkit: 43/50 tests passed' },
      { kind: 'warn',  text: '[09:18:21] webkit: 7 tests skipped (flaky)' },
      { kind: 'info',  text: '[09:18:21] HTML report written to playwright-report/index.html' },
    ],
  }

  const extra = typeLines[nodeType] ?? [
    { kind: 'info'  as const, text: `[09:14:40] ${nodeType} node executing...` },
    { kind: 'info'  as const, text: '[09:14:42] ✓ Completed successfully' },
  ]

  return [...base, ...extra]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiStrip({ cards }: { cards: KpiCard[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        padding: '16px 24px',
        background: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        flexShrink: 0,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#9CA3AF',
              fontFamily: '"DM Sans", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: card.color ?? '#111827',
              fontFamily: '"DM Sans", sans-serif',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}
          >
            {card.value}
          </div>
          {card.sub && (
            <div
              style={{
                fontSize: 10,
                color: '#9CA3AF',
                fontFamily: '"DM Sans", sans-serif',
                marginTop: 2,
              }}
            >
              {card.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RunsTable({ runs }: { runs: RunRecord[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 76px 88px 1fr 140px',
          gap: 0,
          padding: '6px 16px',
          background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          fontSize: 10,
          fontWeight: 700,
          color: '#9CA3AF',
          fontFamily: '"DM Sans", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span>Run</span>
        <span>Status</span>
        <span>Duration</span>
        <span>Branch · By</span>
        <span>Time</span>
      </div>
      {runs.map((run) => (
        <div
          key={run.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '64px 76px 88px 1fr 140px',
            gap: 0,
            padding: '8px 16px',
            borderBottom: '1px solid #F3F4F6',
            alignItems: 'center',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
            {run.id}
          </span>
          <span>
            {run.status === 'success' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22C55E', fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
                <CheckCircle2 size={12} strokeWidth={2} />
                Success
              </span>
            )}
            {run.status === 'failed' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#EF4444', fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
                <XCircle size={12} strokeWidth={2} />
                Failed
              </span>
            )}
            {run.status === 'skipped' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
                <Clock size={12} strokeWidth={2} />
                Skipped
              </span>
            )}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"JetBrains Mono", monospace' }}>
            {run.duration}
          </span>
          <span style={{ fontSize: 11, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
            <span style={{ background: '#F3F4F6', borderRadius: 3, padding: '1px 5px', fontSize: 10, fontFamily: '"JetBrains Mono", monospace', marginRight: 5 }}>
              {run.branch}
            </span>
            {run.triggeredBy}
          </span>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
            {run.timestamp}
          </span>
        </div>
      ))}
    </div>
  )
}

function LogTail({ lines }: { lines: { kind: string; text: string }[] }) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const kindColor: Record<string, string> = {
    info:  '#9CA3AF',
    debug: '#6B7280',
    warn:  '#F59E0B',
    error: '#EF4444',
  }

  return (
    <div
      style={{
        background: '#0F172A',
        borderRadius: 8,
        padding: '12px',
        height: '100%',
        overflowY: 'auto',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        lineHeight: 1.7,
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ color: kindColor[line.kind] ?? '#9CA3AF' }}>
          {line.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NodeDashboard() {
  const { nodeDashboardId, closeNodeDashboard } = useDashboardStore()
  const { nodes } = usePipelineStore()

  if (!nodeDashboardId) return null

  const node = nodes.find((n) => n.id === nodeDashboardId)
  if (!node) return null

  const { label, nodeType } = node.data
  const nodeConfig = NODE_CONFIG[nodeType]
  const Icon = nodeConfig.icon
  const kpis = mockKpis(nodeType)
  const runs = mockRuns(nodeType)
  const logLines = mockLogLines(nodeType)

  return (
    <motion.div
      key="node-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 56,
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          gap: 12,
          flexShrink: 0,
          background: '#FFFFFF',
        }}
      >
        {/* Back */}
        <button
          onClick={closeNodeDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 500,
            color: '#374151',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Back
        </button>

        {/* Node chip */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            background: nodeConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} color="#fff" strokeWidth={2} />
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{label}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {nodeConfig.label} · Last run: 42 min ago
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <RefreshCw size={12} strokeWidth={2} />
            Refresh
          </button>

          <button
            onClick={closeNodeDashboard}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'none',
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={14} color="#6B7280" />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip cards={kpis} />

      {/* Main body: runs table + log tail */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          overflow: 'hidden',
        }}
      >
        {/* Runs table */}
        <div style={{ overflowY: 'auto', borderRight: '1px solid #E5E7EB' }}>
          <div
            style={{
              padding: '12px 16px 8px',
              fontSize: 12,
              fontWeight: 700,
              color: '#374151',
              borderBottom: '1px solid #E5E7EB',
              fontFamily: '"DM Sans", sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Recent Runs
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: '#9CA3AF',
                background: '#F3F4F6',
                padding: '1px 6px',
                borderRadius: 99,
              }}
            >
              last 10
            </span>
          </div>
          <RunsTable runs={runs} />
        </div>

        {/* Log tail */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px 8px',
              fontSize: 12,
              fontWeight: 700,
              color: '#374151',
              borderBottom: '1px solid #E5E7EB',
              fontFamily: '"DM Sans", sans-serif',
              flexShrink: 0,
            }}
          >
            Live Logs — Run #1048
          </div>
          <div style={{ flex: 1, padding: 12, overflow: 'hidden' }}>
            <LogTail lines={logLines} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * WidgetLibrary.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Left sidebar on the Dashboard view — drag a tile onto the grid canvas to
 * spawn a widget.
 *
 * Exports WIDGET_META so DashboardBoard can render ghost previews during drag.
 */

import {
  GitCommit, Hammer, Gauge, AlertTriangle, Shield,
  TestTube2, BarChart3, Activity, Rocket, Box,
  type LucideIcon,
} from 'lucide-react'
import type { WidgetType } from '@/store/dashboardStore'
import { setActiveDragType } from './DashboardBoard'

// ─── Metadata (also used by the board for ghost previews) ─────────────────────

export interface WidgetMeta {
  label: string
  description: string
  icon: LucideIcon
  color: string
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  commit_feed:        { label: 'Commit Feed',        description: 'Recent git commits',          icon: GitCommit,    color: '#8B5CF6' },
  ci_status:          { label: 'CI Status',          description: 'Job pass/fail breakdown',     icon: Hammer,       color: '#F59E0B' },
  core_web_vitals:    { label: 'Core Web Vitals',    description: 'LCP, FID, CLS, FCP, TTFB',   icon: Gauge,        color: '#06B6D4' },
  log_error_rate:     { label: 'Log Error Rate',     description: 'Error % over last 24h',      icon: AlertTriangle, color: '#EF4444' },
  trivy_scan:         { label: 'Trivy Scan',         description: 'CVE scan results',            icon: Shield,       color: '#3B82F6' },
  playwright_results: { label: 'Playwright',         description: 'E2E test results per spec',  icon: TestTube2,    color: '#22C55E' },
  grafana_embed:      { label: 'Grafana Chart',      description: 'Requests/min bar chart',     icon: BarChart3,    color: '#F97316' },
  prometheus_stat:    { label: 'Prometheus Metrics', description: 'Key metric stat cards',      icon: Activity,     color: '#EF4444' },
  deployment_health:  { label: 'Deployment Health',  description: 'Pod status & resources',     icon: Rocket,       color: '#22C55E' },
  docker_build_status:{ label: 'Docker Builds',      description: 'Image build history',        icon: Box,          color: '#0EA5E9' },
}

const WIDGETS = Object.entries(WIDGET_META) as [WidgetType, WidgetMeta][]

// ─── Component ────────────────────────────────────────────────────────────────

export default function WidgetLibrary() {
  return (
    <div
      style={{
        width: 220,
        height: '100%',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 14px 10px',
          borderBottom: '1px solid #F0F0F0',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', fontFamily: '"DM Sans", sans-serif', letterSpacing: '0.02em' }}>
          Widget Library
        </div>
        <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 3, lineHeight: 1.4 }}>
          Drag a widget into any grid cell
        </div>
      </div>

      {/* Widget tiles */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {WIDGETS.map(([type, meta]) => {
          const Icon = meta.icon
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/dashboard-widget', type)
                e.dataTransfer.effectAllowed = 'copy'
                // Tell the board what type is being dragged (can't read in onDragOver)
                setActiveDragType(type)
              }}
              onDragEnd={() => setActiveDragType(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #EDEDED',
                background: '#FAFAFA',
                cursor: 'grab',
                transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s, transform 0.1s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = '#FFFFFF'
                el.style.borderColor = meta.color + '55'
                el.style.boxShadow = `0 2px 8px ${meta.color}18`
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = '#FAFAFA'
                el.style.borderColor = '#EDEDED'
                el.style.boxShadow = 'none'
                el.style.transform = 'none'
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: meta.color + '15',
                  border: `1px solid ${meta.color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} color={meta.color} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#374151',
                    fontFamily: '"DM Sans", sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {meta.label}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#B0B0B0',
                    fontFamily: '"DM Sans", sans-serif',
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {meta.description}
                </div>
              </div>

              {/* Drag indicator */}
              <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                <circle cx="3" cy="2" r="1.5" fill="#6B7280"/>
                <circle cx="7" cy="2" r="1.5" fill="#6B7280"/>
                <circle cx="3" cy="7" r="1.5" fill="#6B7280"/>
                <circle cx="7" cy="7" r="1.5" fill="#6B7280"/>
                <circle cx="3" cy="12" r="1.5" fill="#6B7280"/>
                <circle cx="7" cy="12" r="1.5" fill="#6B7280"/>
              </svg>
            </div>
          )
        })}
      </div>
    </div>
  )
}

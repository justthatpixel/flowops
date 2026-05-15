/**
 * BaseWidget.tsx — Shell wrapper for every dashboard widget.
 *
 * Provides:
 *   - White card filling its grid cell (100% × 100%)
 *   - Header row: icon chip · title · optional badge/actions · ✕ remove
 *   - Scrollable body slot
 *   - Loading shimmer overlay
 *   - Error state banner
 *   - "Integration not configured" empty state with quick-setup button
 */

import type { ReactNode } from 'react'
import { X, Settings, Loader2, AlertTriangle, type LucideIcon } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSettingsStore } from '@/store/settingsStore'

interface BaseWidgetProps {
  id: string
  title: string
  icon: LucideIcon
  iconColor?: string
  children: ReactNode
  headerRight?: ReactNode
  loading?: boolean
  error?: string | null
  unconfigured?: boolean
  integrationName?: string
}

export default function BaseWidget({
  id,
  title,
  icon: Icon,
  iconColor = '#3B82F6',
  children,
  headerRight,
  loading = false,
  error = null,
  unconfigured = false,
  integrationName,
}: BaseWidgetProps) {
  const removeWidget             = useDashboardStore((s) => s.removeWidget)
  const setIntegrationsPanelOpen = useSettingsStore((s) => s.setIntegrationsPanelOpen)

  // ── Body content selection ──────────────────────────────────────────────────
  let body: ReactNode = children

  if (unconfigured) {
    body = (
      <div style={{
        flex: 1, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '20px 16px',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: iconColor + '14', border: `1.5px dashed ${iconColor}45`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={iconColor} strokeWidth={1.5} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
            {integrationName ? `Connect ${integrationName}` : 'Integration not configured'}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5 }}>
            Enter your credentials to see live data
          </div>
        </div>
        <button
          onClick={() => setIntegrationsPanelOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 6,
            background: iconColor + '14', border: `1px solid ${iconColor}35`,
            color: iconColor, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = iconColor + '26')}
          onMouseLeave={(e) => (e.currentTarget.style.background = iconColor + '14')}
        >
          <Settings size={12} strokeWidth={2} />
          Set up {integrationName ?? 'integration'}
        </button>
      </div>
    )
  } else if (error && !loading) {
    body = (
      <div style={{
        flex: 1, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '16px',
      }}>
        <AlertTriangle size={20} color="#F59E0B" strokeWidth={1.5} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', fontFamily: '"DM Sans", sans-serif' }}>
            Failed to load
          </div>
          <div style={{
            fontSize: 10, color: '#B45309', marginTop: 4,
            fontFamily: '"JetBrains Mono", monospace',
            maxWidth: 260, wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {error.slice(0, 160)}
          </div>
        </div>
        <button
          onClick={() => setIntegrationsPanelOpen(true)}
          style={{
            fontSize: 10, color: '#6B7280', background: 'none', border: 'none',
            cursor: 'pointer', textDecoration: 'underline', fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Check integration settings
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '"DM Sans", sans-serif',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        height: 40, borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center',
        paddingLeft: 10, paddingRight: 8, gap: 8,
        flexShrink: 0, background: '#FAFAFA',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: iconColor + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={12} color={iconColor} strokeWidth={2.2} />
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#374151',
          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </span>
        {headerRight}
        <button
          onClick={() => removeWidget(id)}
          title="Remove widget"
          style={{
            width: 22, height: 22, borderRadius: 4, border: 'none',
            background: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <X size={11} color="#9CA3AF" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {body}
      </div>

      {/* Loading shimmer — floats on top of stale data during refetch */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10,
          background: 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 10,
        }}>
          <Loader2 size={18} color="#9CA3AF" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}
    </div>
  )
}

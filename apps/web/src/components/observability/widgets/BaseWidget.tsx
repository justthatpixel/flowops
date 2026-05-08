/**
 * BaseWidget.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shell wrapper for every dashboard widget.  Provides:
 *   - White card with shadow + rounded corners
 *   - Header row: icon chip, title, optional action buttons, ✕ remove
 *   - Scrollable body slot
 */

import type { ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'

interface BaseWidgetProps {
  id: string
  title: string
  icon: LucideIcon
  iconColor?: string
  width?: number
  height?: number
  children: ReactNode
  headerRight?: ReactNode
}

export default function BaseWidget({
  id,
  title,
  icon: Icon,
  iconColor = '#3B82F6',
  width = 340,
  height = 240,
  children,
  headerRight,
}: BaseWidgetProps) {
  const removeWidget = useDashboardStore((s) => s.removeWidget)

  return (
    <div
      style={{
        width,
        height,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 40,
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 8,
          gap: 8,
          flexShrink: 0,
          background: '#FAFAFA',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: iconColor + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={12} color={iconColor} strokeWidth={2.2} />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        {headerRight}
        <button
          onClick={() => removeWidget(id)}
          title="Remove widget"
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <X size={11} color="#9CA3AF" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

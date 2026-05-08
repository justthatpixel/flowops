/**
 * CloudSelector.tsx — 48px bar for selecting EKS / GKE / AKS
 */

import type { CloudProvider } from '@/types/containers'

interface CloudSelectorProps {
  active: CloudProvider
  onChange: (provider: CloudProvider) => void
}

const PROVIDERS: { id: CloudProvider; label: string; color: string }[] = [
  { id: 'eks', label: 'AWS EKS', color: '#F97316' },
  { id: 'gke', label: 'Google GKE', color: '#4285F4' },
  { id: 'aks', label: 'Azure AKS', color: '#0078D4' },
]

export default function CloudSelector({ active, onChange }: CloudSelectorProps) {
  return (
    <div
      style={{
        height: 48,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
          fontFamily: '"DM Sans", sans-serif',
          marginRight: 4,
        }}
      >
        Cloud Provider:
      </span>
      <div
        style={{
          display: 'flex',
          background: '#F3F4F6',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}
      >
        {PROVIDERS.map((p) => {
          const isActive = active === p.id
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: '"DM Sans", sans-serif',
                background: isActive ? p.color : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B7280',
                transition: 'all 0.15s',
                boxShadow: isActive ? `0 1px 4px ${p.color}44` : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#E5E7EB'
                  e.currentTarget.style.color = '#374151'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#6B7280'
                }
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

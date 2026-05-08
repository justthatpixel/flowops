/**
 * ModePicker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen mode picker shown before canvas. Three large cards in a centered row.
 */

import { useState } from 'react'
import type { ContainerMode } from '@/types/containers'

interface ModeCard {
  mode: ContainerMode
  icon: string
  title: string
  subtitle: string
  description: string
  color: string
  tags: string[]
}

const MODES: ModeCard[] = [
  {
    mode: 'compose',
    icon: '🐳',
    title: 'Docker Compose',
    subtitle: 'Simple. Local. docker-compose.yml.',
    description: 'Great for MVPs and local development. Define multi-container apps with a single YAML file.',
    color: '#3B82F6',
    tags: ['docker-compose.yml', 'Makefile', '.env', 'Local dev'],
  },
  {
    mode: 'kubernetes',
    icon: '☸',
    title: 'Kubernetes',
    subtitle: 'Full control. kubectl YAML. Raw power.',
    description: 'Deploy to any cluster. Generate production-ready manifests with proper resource limits and probes.',
    color: '#8B5CF6',
    tags: ['Deployments', 'Services', 'Ingress', 'ConfigMaps', 'HPA'],
  },
  {
    mode: 'managed',
    icon: '☁',
    title: 'Managed K8s',
    subtitle: 'Production. EKS / GKE / AKS.',
    description: 'Cloud-managed Kubernetes with node groups, Fargate profiles, and workload identity.',
    color: '#22C55E',
    tags: ['EKS', 'GKE', 'AKS', 'Node Groups', 'IRSA'],
  },
]

interface ModePickerProps {
  onSelect: (mode: ContainerMode) => void
}

export default function ModePicker({ onSelect }: ModePickerProps) {
  const [hoveredMode, setHoveredMode] = useState<ContainerMode | null>(null)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: '#F7F7F5',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#111827',
            fontFamily: '"DM Sans", sans-serif',
            letterSpacing: '-0.5px',
            marginBottom: 10,
          }}
        >
          Choose your deployment target
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#6B7280',
            fontFamily: '"DM Sans", sans-serif',
            maxWidth: 420,
          }}
        >
          Design your container stack visually. Generate production-ready configs in seconds.
        </div>
      </div>

      {/* Cards row */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {MODES.map((card) => {
          const isHovered = hoveredMode === card.mode
          return (
            <button
              key={card.mode}
              onClick={() => onSelect(card.mode)}
              onMouseEnter={() => setHoveredMode(card.mode)}
              onMouseLeave={() => setHoveredMode(null)}
              style={{
                width: 280,
                background: '#FFFFFF',
                border: isHovered ? `2px solid ${card.color}` : '1px solid #E5E7EB',
                borderRadius: 16,
                padding: 28,
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: isHovered
                  ? `0 12px 40px ${card.color}20, 0 4px 16px rgba(0,0,0,0.08)`
                  : '0 1px 4px rgba(0,0,0,0.06)',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: '"DM Sans", sans-serif',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: isHovered ? `${card.color}18` : '#F9FAFB',
                  border: `1.5px solid ${isHovered ? card.color + '40' : '#E5E7EB'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  marginBottom: 20,
                  transition: 'all 0.2s',
                }}
              >
                {card.icon}
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 4,
                  letterSpacing: '-0.2px',
                }}
              >
                {card.title}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: card.color,
                  marginBottom: 12,
                }}
              >
                {card.subtitle}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  lineHeight: 1.6,
                  marginBottom: 20,
                  flexGrow: 1,
                }}
              >
                {card.description}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isHovered ? card.color : '#6B7280',
                      background: isHovered ? `${card.color}12` : '#F3F4F6',
                      borderRadius: 4,
                      padding: '3px 7px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: '1px solid #F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isHovered ? card.color : '#9CA3AF',
                    transition: 'color 0.2s',
                  }}
                >
                  Get started
                </span>
                <span
                  style={{
                    fontSize: 16,
                    color: isHovered ? card.color : '#D1D5DB',
                    transition: 'color 0.2s',
                  }}
                >
                  →
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

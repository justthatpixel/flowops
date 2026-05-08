/**
 * ScaleSlider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating widget (absolute, top-right of the canvas) that lets users switch
 * between the five scale tiers (Dev → Enterprise).
 *
 * LAYOUT
 *   ┌──────────────────────────────┐
 *   │  Scale Tier        10k users │  ← label + live user count from liveStats
 *   │  [10] [1k] [10k] [100k] [1M] │  ← tier selector buttons
 *   │  Growing           ~$340/mo  │  ← tier label + live cost
 *   │  ████████░░░░░░░░░░░░░░░░░░  │  ← gradient fill bar (scaleTier/4 * 100%)
 *   │  ● 2.0× headroom · 6k req/min│  ← status dot (green/amber/red)
 *   └──────────────────────────────┘
 *
 * Clicking a tier button calls `setScaleTier(tier)` which:
 *   1. Looks up the layout for (templateId, tier) via getTierLayout()
 *   2. Replaces all components, edges, containers in the store
 *   3. Recomputes liveStats
 *
 * The capacity fill bar width is purely visual: `(scaleTier / 4) * 100%`.
 * The headroom dot color comes from liveStats.headroomStatus (green/amber/red).
 */

import { useInfraStore, SCALE_TIERS } from '@/store/infraStore'
import type { ScaleTierIndex } from '@/types/infra'

const TIER_LABELS = ['10', '1k', '10k', '100k', '1M']

// Headroom dot color
const STATUS_COLOR: Record<string, string> = {
  green: '#22C55E',
  amber: '#F59E0B',
  red:   '#EF4444',
}

export default function ScaleSlider() {
  const { scaleTier, setScaleTier, liveStats } = useInfraStore()
  const current = SCALE_TIERS[scaleTier]

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.09)',
        width: 228,
        userSelect: 'none',
      }}
    >
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Scale Tier
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#111827',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {liveStats.userCount}
        </span>
      </div>

      {/* ── Tier buttons ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
        {SCALE_TIERS.map((tier) => {
          const active = tier.index === scaleTier
          return (
            <button
              key={tier.index}
              onClick={() => setScaleTier(tier.index as ScaleTierIndex)}
              title={tier.label}
              style={{
                flex: 1,
                height: 28,
                border: 'none',
                borderRadius: 5,
                background: active ? '#111827' : '#F3F4F6',
                color: active ? '#FFFFFF' : '#6B7280',
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = '#E5E7EB'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = '#F3F4F6'
              }}
            >
              {TIER_LABELS[tier.index]}
            </button>
          )
        })}
      </div>

      {/* ── Cost + headroom row ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: '#374151',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 500,
          }}
        >
          {current.label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#6B7280',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          ~{liveStats.costLabel}/mo
        </span>
      </div>

      {/* ── Capacity mini-bar ─────────────────────────────────────────────── */}
      <div
        style={{
          background: '#F3F4F6',
          borderRadius: 4,
          height: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (scaleTier / 4) * 100)}%`,
            background: `linear-gradient(90deg, #3B82F6, #8B5CF6)`,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* ── Headroom indicator ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginTop: 7,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: STATUS_COLOR[liveStats.headroomStatus],
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: '#9CA3AF',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {liveStats.headroom}× headroom · {liveStats.reqLabel} req/min
        </span>
      </div>
    </div>
  )
}

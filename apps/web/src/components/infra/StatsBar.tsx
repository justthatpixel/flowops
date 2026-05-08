/**
 * StatsBar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Horizontal stats strip that sits just below the TemplatePicker.
 * Displays four live-computed metrics from `infraStore.liveStats`:
 *
 *   Est. Cost  |  Capacity  |  Headroom  |  Template
 *   $340/mo       6k req/min   2.0× ✅     Web App (Growing)
 *
 * The headroom value is color-coded: green (≥2×), amber (1.5–2×), red (<1.5×).
 * When `liveStats.bottleneck` is set a warning banner slides in below the stats
 * row (Framer Motion AnimatePresence, height 0 → 32px).
 *
 * DATA FLOW
 *   infraStore.liveStats (recomputed by computeLiveStats() on every component
 *   config change or scale/template switch) → rendered directly.
 *
 * No local state — pure read from Zustand.
 */

import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfraStore, SCALE_TIERS } from '@/store/infraStore'

const TEMPLATE_LABELS: Record<string, string> = {
  'web-app':       'Web App',
  'serverless':    'Serverless',
  'microservices': 'Microservices',
  'api-workers':   'API + Workers',
  'ml-inference':  'ML Inference',
  'static-api':    'Static + API',
}

function StatBlock({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '0 20px',
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: valueColor ?? '#1a1a1a',
          fontFamily: '"DM Sans", sans-serif',
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontSize: 10,
            color: '#9CA3AF',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}

function Divider() {
  return (
    <div
      style={{
        width: '0.5px',
        alignSelf: 'stretch',
        background: '#E5E7EB',
        margin: '4px 0',
      }}
    />
  )
}

export default function StatsBar() {
  const { scaleTier, templateId, liveStats } = useInfraStore()
  const tier = SCALE_TIERS[scaleTier]

  const headroomColor =
    liveStats.headroomStatus === 'green' ? '#22C55E' :
    liveStats.headroomStatus === 'amber' ? '#F59E0B' :
    '#EF4444'

  return (
    <div style={{ flexShrink: 0 }}>
      {/* ── Main stats row ─────────────────────────────────────────────────── */}
      <div
        style={{
          height: 56,
          background: '#FFFFFF',
          borderBottom: liveStats.bottleneck ? 'none' : '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <StatBlock
          label="Est. Cost"
          value={`${liveStats.costLabel}/mo`}
          sub="on-demand · us-east-1"
        />
        <Divider />
        <StatBlock
          label="Capacity"
          value={`${liveStats.reqLabel} req/min`}
          sub={`~${liveStats.userCount}`}
        />
        <Divider />
        <StatBlock
          label="Headroom"
          value={`${liveStats.headroom}×`}
          sub={liveStats.bottleneck ?? 'comfortable margin'}
          valueColor={headroomColor}
        />
        <Divider />
        <StatBlock
          label="Template"
          value={TEMPLATE_LABELS[templateId] ?? templateId}
          sub={tier.label}
        />
      </div>

      {/* ── Bottleneck warning banner ──────────────────────────────────────── */}
      <AnimatePresence>
        {liveStats.bottleneck && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 32, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <div
              style={{
                height: 32,
                background:
                  liveStats.headroomStatus === 'red'
                    ? '#FEF2F2'
                    : '#FFFBEB',
                borderTop:
                  liveStats.headroomStatus === 'red'
                    ? '1px solid #FECACA'
                    : '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              <AlertTriangle
                size={12}
                color={liveStats.headroomStatus === 'red' ? '#EF4444' : '#D97706'}
                strokeWidth={2.5}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: liveStats.headroomStatus === 'red' ? '#B91C1C' : '#92400E',
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                Bottleneck:
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: liveStats.headroomStatus === 'red' ? '#DC2626' : '#B45309',
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                {liveStats.bottleneck}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

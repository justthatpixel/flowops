/**
 * InfracostPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-in Infracost-style panel showing per-component cost analysis (Phase 7).
 *
 * LAYOUT (340px, slides in from right):
 *   ┌─────────────────────────────────┐
 *   │ Header: total $/mo + $/yr       │
 *   ├─────────────────────────────────┤
 *   │ Savings Plans comparison strip  │
 *   ├─────────────────────────────────┤
 *   │ Per-component rows (accordion)  │
 *   │  ▼ ECS Fargate    $220  42%     │
 *   │    Cost drivers + hints         │
 *   │  ▶ RDS Postgres   $85   16%     │
 *   │  …                              │
 *   ├─────────────────────────────────┤
 *   │ Top optimisation spotlight      │
 *   └─────────────────────────────────┘
 */

import { useState, useMemo }        from 'react'
import { motion }                   from 'framer-motion'
import { X, ChevronDown, ChevronRight, TrendingDown, Sparkles } from 'lucide-react'
import { useInfraStore }            from '@/store/infraStore'
import { getDetailedBreakdown,
         formatBudgetLabel,
         formatAnnual,
         type CostLineItem }        from '@/utils/infracostService'
import { AWS_NODE_CONFIG }          from '@/lib/awsNodeConfig'

// ─── Props ────────────────────────────────────────────────────────────────────

interface InfracostPanelProps {
  onClose: () => void
}

// ─── Effort badge ─────────────────────────────────────────────────────────────

function EffortBadge({ effort }: { effort: 'low' | 'medium' | 'high' }) {
  const color = effort === 'low' ? '#22C55E' : effort === 'medium' ? '#F59E0B' : '#EF4444'
  return (
    <span
      style={{
        fontSize:     8,
        fontWeight:   700,
        color,
        background:   color + '18',
        borderRadius: 3,
        padding:      '1px 5px',
        letterSpacing:'0.06em',
        textTransform:'uppercase',
        fontFamily:   '"DM Sans", sans-serif',
        flexShrink:   0,
      }}
    >
      {effort} effort
    </span>
  )
}

// ─── Line item row (accordion) ────────────────────────────────────────────────

function LineItemRow({ item }: { item: CostLineItem }) {
  const [open, setOpen] = useState(false)
  const cfg    = AWS_NODE_CONFIG[item.serviceType as keyof typeof AWS_NODE_CONFIG]
  const color  = cfg?.color ?? '#6B7280'

  return (
    <div>
      {/* Summary row */}
      <div
        onClick={() => item.suggestions.length > 0 || item.drivers.length > 0
          ? setOpen((v) => !v)
          : undefined}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        8,
          padding:    '9px 16px',
          cursor:     item.suggestions.length > 0 ? 'pointer' : 'default',
          transition: 'background 0.1s',
          borderTop:  '1px solid #F3F4F6',
        }}
        onMouseEnter={(e) => { if (item.suggestions.length > 0) e.currentTarget.style.background = '#F9FAFB' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Chevron */}
        {item.suggestions.length > 0 ? (
          open
            ? <ChevronDown  size={11} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
            : <ChevronRight size={11} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
        ) : (
          <div style={{ width: 11, flexShrink: 0 }} />
        )}

        {/* Icon */}
        {cfg && (
          <div
            style={{
              width:        24,
              height:       24,
              borderRadius: 5,
              background:   color + '18',
              border:       `1px solid ${color}33`,
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              flexShrink:   0,
            }}
          >
            <img src={cfg.icon} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
          </div>
        )}

        {/* Label */}
        <span
          style={{
            fontSize:     12,
            fontWeight:   600,
            color:        '#111827',
            flex:         1,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontFamily:   '"DM Sans", sans-serif',
          }}
        >
          {item.label}
        </span>

        {/* Cost + pct */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', fontFamily: '"DM Sans", sans-serif' }}>
            {formatBudgetLabel(item.monthlyCost)}/mo
          </span>
          <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
            {item.pctOfTotal.toFixed(1)}% of total
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginLeft: 55, marginRight: 16, height: 3, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
        <div
          style={{
            width:     `${item.pctOfTotal}%`,
            height:    '100%',
            borderRadius: 2,
            background: color,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: '8px 16px 12px 55px', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
          {/* Cost drivers */}
          {item.drivers.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom:  5,
                  fontFamily:    '"DM Sans", sans-serif',
                }}
              >
                Cost Drivers
              </div>
              {item.drivers.map((d, i) => (
                <div
                  key={i}
                  style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}
                >
                  · {d}
                </div>
              ))}
            </div>
          )}

          {/* Optimisation hints */}
          {item.suggestions.length > 0 && (
            <div>
              <div
                style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom:  5,
                  fontFamily:    '"DM Sans", sans-serif',
                }}
              >
                Optimisations
              </div>
              {item.suggestions.map((hint, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom:  8,
                    padding:       '7px 10px',
                    background:    '#FFFFFF',
                    border:        '1px solid #E5E7EB',
                    borderRadius:  6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <TrendingDown size={10} color="#22C55E" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize:   11,
                        fontWeight: 700,
                        color:      '#111827',
                        flex:       1,
                        fontFamily: '"DM Sans", sans-serif',
                      }}
                    >
                      {hint.title}
                    </span>
                    <span
                      style={{
                        fontSize:   9,
                        fontWeight: 800,
                        color:      '#16A34A',
                        background: '#DCFCE7',
                        borderRadius: 3,
                        padding:    '1px 5px',
                        fontFamily: '"DM Sans", sans-serif',
                        flexShrink: 0,
                      }}
                    >
                      −{hint.savingsPct}%
                    </span>
                    <EffortBadge effort={hint.effort} />
                  </div>
                  <p
                    style={{
                      fontSize:   10,
                      color:      '#6B7280',
                      margin:     0,
                      lineHeight: 1.5,
                      fontFamily: '"DM Sans", sans-serif',
                    }}
                  >
                    {hint.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InfracostPanel({ onClose }: InfracostPanelProps) {
  const components = useInfraStore((s) => s.components)

  const breakdown = useMemo(
    () => getDetailedBreakdown(components),
    [components],
  )

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      exit={{   x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position:      'absolute',
        top:           0,
        right:         0,
        bottom:        0,
        width:         340,
        background:    '#FFFFFF',
        borderLeft:    '1px solid #E5E7EB',
        display:       'flex',
        flexDirection: 'column',
        zIndex:        25,
        fontFamily:    '"DM Sans", sans-serif',
        boxShadow:     '-4px 0 20px rgba(0,0,0,0.06)',
        overflowY:     'auto',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      '14px 16px 12px',
          borderBottom: '1px solid #F3F4F6',
          background:   '#F9FAFB',
          flexShrink:   0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <TrendingDown size={15} color="#6366F1" strokeWidth={2} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1 }}>
            Cost Breakdown
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9CA3AF', padding: 4, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#374151' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
            {formatBudgetLabel(breakdown.totalMonthly)}
          </span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>/mo</span>
          <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>
            {formatAnnual(breakdown.totalMonthly)}
          </span>
        </div>

        {/* Top suggestion spotlight */}
        {breakdown.topSuggestion && (
          <div
            style={{
              marginTop:    10,
              padding:      '8px 10px',
              background:   'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
              borderRadius: 7,
              border:       '1px solid #C7D2FE',
              display:      'flex',
              alignItems:   'flex-start',
              gap:          7,
            }}
          >
            <Sparkles size={12} color="#6366F1" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3730A3', display: 'block', marginBottom: 1 }}>
                Top saving: {breakdown.topSuggestion.title}
              </span>
              <span style={{ fontSize: 10, color: '#6366F1', lineHeight: 1.4, display: 'block' }}>
                Up to −{breakdown.topSuggestion.savingsPct}% · {breakdown.topSuggestion.effort} effort
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Savings Plans strip ─────────────────────────────────────────────── */}
      {breakdown.savingsPlans.length > 0 && (
        <div
          style={{
            padding:      '10px 16px',
            borderBottom: '1px solid #F3F4F6',
            background:   '#FFFBEB',
            flexShrink:   0,
          }}
        >
          <div
            style={{
              fontSize:      9,
              fontWeight:    700,
              color:         '#92400E',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom:  7,
              fontFamily:    '"DM Sans", sans-serif',
            }}
          >
            💰 Savings Plan comparison
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {breakdown.savingsPlans.map((sp) => (
              <div
                key={sp.label}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                  fontSize:   11,
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                <span style={{ flex: 1, color: '#78350F' }}>{sp.label}</span>
                <span
                  style={{
                    fontSize:   9,
                    fontWeight: 800,
                    color:      '#D97706',
                    background: 'rgba(217,119,6,0.12)',
                    borderRadius: 3,
                    padding:    '1px 5px',
                    flexShrink: 0,
                  }}
                >
                  −{sp.discount}%
                </span>
                <span style={{ fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                  {formatBudgetLabel(sp.monthly)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Line items ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {breakdown.lineItems.length === 0 ? (
          <div
            style={{
              padding:    '40px 16px',
              textAlign:  'center',
              fontSize:   12,
              color:      '#D1D5DB',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            Add components to the canvas to see a breakdown.
          </div>
        ) : (
          breakdown.lineItems.map((item) => (
            <LineItemRow key={item.componentId} item={item} />
          ))
        )}
      </div>
    </motion.div>
  )
}

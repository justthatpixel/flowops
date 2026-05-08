/**
 * RealityBridge.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 8 — Reality Bridge bottom sheet.
 *
 * Slides up from the bottom of DreamMode.  Shows two columns:
 *   LEFT  — Dream stats (unconstrained)
 *   RIGHT — Constrained stats (budget-aware downscale)
 *
 * Algorithm:
 *   1. Receive the dream architecture (components + edges)
 *   2. Compute dream monthly cost
 *   3. If dream cost ≤ budget cap → constrained = dream (nothing to cut)
 *   4. Otherwise: remove/downsize the most expensive components until cost fits
 *      Order of cuts:
 *        a. Shield Advanced → remove entirely
 *        b. ElastiCache → remove if RDS exists
 *        c. NAT Gateway count → reduce to 1
 *        d. ECS vCPU / count → halve
 *        e. RDS Multi-AZ → disable
 *        f. CloudFront → keep (cheap, high value)
 *   5. Render DreamCanvas snippets side-by-side (compact)
 *   6. "Apply Constrained Architecture" copies it to Architect Mode canvas
 */

import { useMemo, useState }     from 'react'
import { motion }                from 'framer-motion'
import { ChevronDown, ArrowRight, CheckCircle, AlertTriangle, Zap } from 'lucide-react'
import { useGuardrailStore }     from '@/store/guardrailStore'
import { useInfraStore }         from '@/store/infraStore'
import { calculateCost }         from '@/utils/costCalculator'
import { formatBudgetLabel }     from '@/utils/budgetChecker'
import type { InfraComponent, InfraEdge } from '@/types/infra'
import { AWS_NODE_CONFIG }       from '@/lib/awsNodeConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RealityBridgeProps {
  dreamComponents: InfraComponent[]
  dreamEdges:      InfraEdge[]
  objective:       string
  onClose:         () => void
  /** Called when user applies the constrained architecture to Architect Mode */
  onApply:         (components: InfraComponent[], edges: InfraEdge[]) => void
}

interface ConstraintAction {
  label:       string
  saving:      number   // USD/mo saved
  description: string
}

interface ConstrainedResult {
  components:  InfraComponent[]
  edges:       InfraEdge[]
  monthlyCost: number
  actions:     ConstraintAction[]
}

// ─── Constraint engine ────────────────────────────────────────────────────────

function applyBudgetConstraints(
  components: InfraComponent[],
  edges:      InfraEdge[],
  budgetCap:  number,
): ConstrainedResult {
  let working    = components.map((c) => ({ ...c, config: { ...c.config } }))
  const actions: ConstraintAction[] = []

  function currentCost() {
    return calculateCost(working).totalMonthlyUSD
  }

  // ── Cut 1: Remove Shield Advanced (most expensive, least essential) ────────
  if (currentCost() > budgetCap) {
    const shield = working.find((c) => c.type === 'shield')
    if (shield) {
      const before = currentCost()
      working = working.filter((c) => c.id !== shield.id)
      actions.push({
        label:       `Remove ${shield.label}`,
        saving:      Math.round(before - currentCost()),
        description: 'Shield Advanced costs $3,000/mo. Replaced by Shield Standard (free) + WAF.',
      })
    }
  }

  // ── Cut 2: Remove ElastiCache if RDS already present ─────────────────────
  if (currentCost() > budgetCap) {
    const cache = working.find((c) => c.type === 'elasticache')
    const rds   = working.find((c) => c.type === 'rds')
    if (cache && rds) {
      const before = currentCost()
      working = working.filter((c) => c.id !== cache.id)
      actions.push({
        label:       `Remove ${cache.label}`,
        saving:      Math.round(before - currentCost()),
        description: 'ElastiCache removed to fit budget. RDS query caching partially compensates.',
      })
    }
  }

  // ── Cut 3: Reduce NAT Gateway to 1 ───────────────────────────────────────
  if (currentCost() > budgetCap) {
    const natGws = working.filter((c) => c.type === 'nat_gateway')
    if (natGws.length > 1) {
      const before   = currentCost()
      const keepFirst = natGws[0]
      working = working.filter((c) => c.type !== 'nat_gateway' || c.id === keepFirst.id)
      actions.push({
        label:       `Reduce to 1 NAT Gateway`,
        saving:      Math.round(before - currentCost()),
        description: 'Multi-AZ NAT Gateways cut to single AZ for budget compliance.',
      })
    }
  }

  // ── Cut 4: Halve ECS task counts ─────────────────────────────────────────
  if (currentCost() > budgetCap) {
    const ecsTasks = working.filter((c) => c.type === 'ecs')
    if (ecsTasks.length > 0) {
      const before = currentCost()
      working = working.map((c) => {
        if (c.type !== 'ecs') return c
        const count    = Math.max(1, Math.floor(((c.config.count as number | undefined) ?? 2) / 2))
        const vcpu     = Math.max(0.25, ((c.config.vcpu as number | undefined) ?? 1) / 2)
        const memory   = Math.max(0.5,  ((c.config.memory as number | undefined) ?? 2) / 2)
        return { ...c, config: { ...c.config, count, vcpu, memory } }
      })
      actions.push({
        label:       'Downsize ECS tasks (÷2)',
        saving:      Math.round(before - currentCost()),
        description: 'ECS task count and vCPU halved to fit budget. Enable auto-scaling to compensate.',
      })
    }
  }

  // ── Cut 5: Disable RDS Multi-AZ ──────────────────────────────────────────
  if (currentCost() > budgetCap) {
    const rds = working.find((c) => c.type === 'rds' && c.config.multiAz === true)
    if (rds) {
      const before = currentCost()
      working = working.map((c) =>
        c.id === rds.id ? { ...c, config: { ...c.config, multiAz: false } } : c
      )
      actions.push({
        label:       `Disable ${rds.label} Multi-AZ`,
        saving:      Math.round(before - currentCost()),
        description: 'RDS Multi-AZ disabled to halve database hourly cost. Re-enable for production.',
      })
    }
  }

  // ── Cut 6: Remove WAF if over budget (last resort) ───────────────────────
  if (currentCost() > budgetCap) {
    const waf = working.find((c) => c.type === 'waf')
    if (waf) {
      const before = currentCost()
      working = working.filter((c) => c.id !== waf.id)
      actions.push({
        label:       `Remove ${waf.label}`,
        saving:      Math.round(before - currentCost()),
        description: 'WAF removed to meet budget. Re-add once budget is raised.',
      })
    }
  }

  // Rebuild edges (remove any that reference removed components)
  const remainingIds = new Set(working.map((c) => c.id))
  const filteredEdges = edges.filter(
    (e) => remainingIds.has(e.source) && remainingIds.has(e.target)
  )

  return {
    components:  working,
    edges:       filteredEdges,
    monthlyCost: Math.round(currentCost()),
    actions,
  }
}

// ─── Mini component list ──────────────────────────────────────────────────────

function MiniComponentList({
  components,
  removedIds = [],
}: {
  components: InfraComponent[]
  removedIds?: string[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {components.map((c) => {
        const cfg     = AWS_NODE_CONFIG[c.type]
        const removed = removedIds.includes(c.id)
        return (
          <div
            key={c.id}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        6,
              opacity:    removed ? 0.35 : 1,
              textDecoration: removed ? 'line-through' : 'none',
            }}
          >
            <div
              style={{
                width:        18,
                height:       18,
                borderRadius: 4,
                background:   cfg.color + '18',
                border:       `1px solid ${cfg.color}33`,
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                flexShrink:   0,
              }}
            >
              <img src={cfg.icon} alt="" style={{ width: 11, height: 11, objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: 11, color: removed ? '#9CA3AF' : '#374151', fontFamily: '"DM Sans", sans-serif' }}>
              {c.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RealityBridge({
  dreamComponents,
  dreamEdges,
  objective,
  onClose,
  onApply,
}: RealityBridgeProps) {
  const budgetConfig    = useGuardrailStore((s) => s.budgetConfig)
  const setComponents   = useInfraStore((s) => s.setComponents)
  const closeDesigner   = () => {}   // no-op; caller handles mode switch

  const dreamCost       = useMemo(
    () => Math.round(calculateCost(dreamComponents).totalMonthlyUSD),
    [dreamComponents],
  )

  const constrained     = useMemo(
    () => applyBudgetConstraints(dreamComponents, dreamEdges, budgetConfig.monthlyCap),
    [dreamComponents, dreamEdges, budgetConfig.monthlyCap],
  )

  const fits            = dreamCost <= budgetConfig.monthlyCap
  const saving          = dreamCost - constrained.monthlyCost
  const removedIds      = dreamComponents
    .filter((c) => !constrained.components.some((cc) => cc.id === c.id))
    .map((c) => c.id)

  const [applied, setApplied] = useState(false)

  function handleApply() {
    setComponents(constrained.components, constrained.edges)
    onApply(constrained.components, constrained.edges)
    setApplied(true)
  }

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0,      opacity: 1 }}
      exit={{   y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      style={{
        position:      'absolute',
        bottom:        0,
        left:          0,
        right:         0,
        background:    '#0C0C14',
        borderTop:     '1px solid rgba(139,92,246,0.3)',
        boxShadow:     '0 -8px 40px rgba(139,92,246,0.15)',
        zIndex:        30,
        fontFamily:    '"DM Sans", sans-serif',
        maxHeight:     '70%',
        overflowY:     'auto',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      '14px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}
      >
        <div
          style={{
            width:          32,
            height:         32,
            borderRadius:   7,
            background:     'rgba(99,102,241,0.15)',
            border:         '1px solid rgba(99,102,241,0.3)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}
        >
          <Zap size={15} color="#818CF8" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F3F4F6' }}>
            Reality Bridge
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
            Dream → Budget-constrained architecture
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4B5563', padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#4B5563' }}
        >
          <ChevronDown size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── Objective recap ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background:   'rgba(255,255,255,0.02)',
        }}
      >
        <span style={{ fontSize: 10, color: '#6B7280' }}>Objective: </span>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>"{objective}"</span>
      </div>

      {/* ── Split view ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap:     0,
          padding: '0 0 4px',
        }}
      >
        {/* Dream column */}
        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#A78BFA', boxShadow: '0 0 6px #A78BFA',
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA' }}>
              DREAM
            </span>
            <span
              style={{
                fontSize:   9,
                color:      '#6B7280',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
                padding:    '1px 5px',
                marginLeft: 'auto',
              }}
            >
              no constraints
            </span>
          </div>

          {/* Dream cost */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>
              {formatBudgetLabel(dreamCost)}<span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280' }}>/mo</span>
            </div>
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
              {dreamComponents.length} components · annual {formatBudgetLabel(dreamCost * 12)}
            </div>
          </div>

          <MiniComponentList components={dreamComponents} removedIds={removedIds} />
        </div>

        {/* Divider + arrow */}
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '16px 12px',
            gap:            8,
          }}
        >
          <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div
            style={{
              width:          32,
              height:         32,
              borderRadius:   '50%',
              background:     'rgba(99,102,241,0.15)',
              border:         '1px solid rgba(99,102,241,0.25)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <ArrowRight size={14} color="#818CF8" strokeWidth={2} />
          </div>
          <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Constrained column */}
        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: fits ? '#22C55E' : '#F59E0B',
                boxShadow: `0 0 6px ${fits ? '#22C55E' : '#F59E0B'}`,
              }}
            />
            <span
              style={{
                fontSize:   11,
                fontWeight: 700,
                color:      fits ? '#4ADE80' : '#FCD34D',
              }}
            >
              {fits ? 'FITS BUDGET' : 'CONSTRAINED'}
            </span>
            <span
              style={{
                fontSize:   9,
                color:      '#6B7280',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
                padding:    '1px 5px',
                marginLeft: 'auto',
              }}
            >
              ≤ {formatBudgetLabel(budgetConfig.monthlyCap)}/mo cap
            </span>
          </div>

          {/* Constrained cost */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: fits ? '#4ADE80' : '#FCD34D', letterSpacing: '-0.5px' }}>
              {formatBudgetLabel(constrained.monthlyCost)}<span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280' }}>/mo</span>
            </div>
            {saving > 0 && (
              <div style={{ fontSize: 10, color: '#4ADE80', marginTop: 2 }}>
                −{formatBudgetLabel(saving)}/mo vs dream · {constrained.components.length} components
              </div>
            )}
            {!saving && (
              <div style={{ fontSize: 10, color: '#4ADE80', marginTop: 2 }}>
                Dream fits within budget — no cuts needed!
              </div>
            )}
          </div>

          <MiniComponentList components={constrained.components} />
        </div>
      </div>

      {/* ── Constraint actions ───────────────────────────────────────────────── */}
      {constrained.actions.length > 0 && (
        <div
          style={{
            padding:      '10px 20px 14px',
            borderTop:    '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              fontSize:      9,
              fontWeight:    700,
              color:         '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:  8,
            }}
          >
            Constraints applied
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {constrained.actions.map((a, i) => (
              <div
                key={i}
                style={{
                  display:    'flex',
                  alignItems: 'flex-start',
                  gap:        8,
                  padding:    '7px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  border:     '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6,
                }}
              >
                <AlertTriangle
                  size={11}
                  color="#F59E0B"
                  strokeWidth={2}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#D1D5DB', fontFamily: '"DM Sans", sans-serif' }}>
                    {a.label}
                  </span>
                  <span
                    style={{
                      marginLeft:   6,
                      fontSize:     9,
                      fontWeight:   700,
                      color:        '#4ADE80',
                      background:   'rgba(74,222,128,0.12)',
                      borderRadius: 3,
                      padding:      '1px 5px',
                    }}
                  >
                    −{formatBudgetLabel(a.saving)}/mo
                  </span>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 1.4, fontFamily: '"DM Sans", sans-serif' }}>
                    {a.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      '12px 20px 20px',
          borderTop:    '1px solid rgba(255,255,255,0.06)',
          display:      'flex',
          alignItems:   'center',
          gap:          12,
        }}
      >
        {applied ? (
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        8,
              fontSize:   12,
              color:      '#4ADE80',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <CheckCircle size={14} color="#4ADE80" strokeWidth={2} />
            Applied to Architect Mode — switch modes to continue.
          </div>
        ) : (
          <>
            <button
              onClick={handleApply}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           7,
                background:    'linear-gradient(135deg, #4F46E5, #7C3AED)',
                border:        'none',
                borderRadius:  7,
                padding:       '9px 18px',
                fontSize:      12,
                fontWeight:    700,
                color:         '#FFFFFF',
                cursor:        'pointer',
                fontFamily:    '"DM Sans", sans-serif',
                boxShadow:     '0 2px 12px rgba(99,102,241,0.4)',
                transition:    'opacity 0.15s',
                flex:          1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <Zap size={13} strokeWidth={2.5} />
              Apply Constrained Architecture to Architect Mode
            </button>
            <button
              onClick={onClose}
              style={{
                background:   'none',
                border:       '1px solid rgba(255,255,255,0.10)',
                borderRadius: 7,
                padding:      '9px 14px',
                fontSize:     12,
                fontWeight:   500,
                color:        '#6B7280',
                cursor:       'pointer',
                fontFamily:   '"DM Sans", sans-serif',
                transition:   'border-color 0.15s',
                flexShrink:   0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
            >
              Keep dreaming
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

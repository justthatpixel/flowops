/**
 * BudgetSetup.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * First-time modal for setting budget guardrails in Architect Mode.
 *
 * Shown when:
 *   • User switches to Architect Mode for the first time
 *   • User clicks "Edit" next to the budget bar in the top bar
 *
 * Fields:
 *   Monthly budget cap     — USD/month input
 *   Cost rise threshold    — percent input (default 10%)
 *   Budget scope           — per_pipeline | global
 *   Hard block at          — percent of cap (default 90%)
 *
 * On Save → writes to guardrailStore.budgetConfig, closes modal.
 * On Skip → sets budgetConfigured = true with defaults, closes modal.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, X, DollarSign, TrendingUp, Settings2, Lock } from 'lucide-react'
import { useGuardrailStore, type BudgetConfig } from '@/store/guardrailStore'

interface Props {
  onClose: () => void
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display:       'block',
        fontSize:      10,
        fontWeight:    700,
        color:         '#6B7280',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom:  5,
        fontFamily:    '"DM Sans", sans-serif',
      }}
    >
      {children}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin:     '4px 0 0',
        fontSize:   11,
        color:      '#9CA3AF',
        fontFamily: '"DM Sans", sans-serif',
        lineHeight: 1.4,
      }}
    >
      {children}
    </p>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width:        '100%',
  boxSizing:    'border-box',
  height:       34,
  background:   '#F9FAFB',
  border:       '1px solid #E5E7EB',
  borderRadius: 6,
  padding:      '0 10px',
  fontSize:     13,
  color:        '#111827',
  fontFamily:   '"DM Sans", sans-serif',
  outline:      'none',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetSetup({ onClose }: Props) {
  const setBudgetConfig = useGuardrailStore((s) => s.setBudgetConfig)
  const existing        = useGuardrailStore((s) => s.budgetConfig)

  const [cap,       setCap]       = useState(String(existing.monthlyCap))
  const [rise,      setRise]      = useState(String(existing.riseThresholdPercent))
  const [scope,     setScope]     = useState<BudgetConfig['scope']>(existing.scope)
  const [hardBlock, setHardBlock] = useState(String(existing.hardBlockAtPercent))
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  function validate(): BudgetConfig | null {
    const errs: Record<string, string> = {}
    const capN       = parseFloat(cap)
    const riseN      = parseFloat(rise)
    const hardBlockN = parseFloat(hardBlock)

    if (isNaN(capN)       || capN < 1)           errs.cap       = 'Must be at least $1'
    if (isNaN(riseN)       || riseN < 1 || riseN > 100) errs.rise = 'Must be 1–100%'
    if (isNaN(hardBlockN) || hardBlockN < 50 || hardBlockN > 100) errs.hardBlock = 'Must be 50–100%'

    setErrors(errs)
    if (Object.keys(errs).length > 0) return null

    return {
      monthlyCap:           Math.round(capN),
      riseThresholdPercent: Math.round(riseN),
      scope,
      hardBlockAtPercent:   Math.round(hardBlockN),
    }
  }

  function handleSave() {
    const cfg = validate()
    if (!cfg) return
    setBudgetConfig(cfg)
    onClose()
  }

  function handleSkip() {
    // Commit defaults as-is so the modal doesn't re-appear
    setBudgetConfig(existing)
    onClose()
  }

  return (
    /* Backdrop */
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         300,
        background:     'rgba(0,0,0,0.35)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleSkip() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{    scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        style={{
          width:        480,
          background:   '#FFFFFF',
          borderRadius: 12,
          boxShadow:    '0 8px 40px rgba(0,0,0,0.18)',
          overflow:     'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            background:   'linear-gradient(135deg, #4338CA 0%, #7C3AED 100%)',
            padding:      '20px 22px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width:          36,
                  height:         36,
                  borderRadius:   8,
                  background:     'rgba(255,255,255,0.15)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>
                  Set Guardrails
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: '"DM Sans", sans-serif', marginTop: 1 }}>
                  These limits cannot be exceeded by AI suggestions
                </div>
              </div>
            </div>
            <button
              onClick={handleSkip}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border:     'none',
                borderRadius: 6,
                width:      28,
                height:     28,
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor:     'pointer',
                color:      '#fff',
                padding:    0,
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Form ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Monthly cap */}
          <div>
            <FieldLabel>
              <DollarSign size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Monthly budget cap
            </FieldLabel>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left:     10,
                  top:      '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 13,
                  color:    '#9CA3AF',
                  fontFamily: '"DM Sans", sans-serif',
                  pointerEvents: 'none',
                }}
              >
                $
              </span>
              <input
                type="number"
                min={1}
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                style={{ ...INPUT_STYLE, paddingLeft: 22 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#E5E7EB' }}
              />
              <span
                style={{
                  position: 'absolute',
                  right:    10,
                  top:      '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 11,
                  color:    '#9CA3AF',
                  fontFamily: '"DM Sans", sans-serif',
                  pointerEvents: 'none',
                }}
              >
                /month
              </span>
            </div>
            {errors.cap && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444', fontFamily: '"DM Sans", sans-serif' }}>{errors.cap}</p>}
            <FieldHint>AI suggestions that would exceed this cap are hard-blocked.</FieldHint>
          </div>

          {/* Two-column row: rise threshold + hard block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <FieldLabel>
                <TrendingUp size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Cost rise alert
              </FieldLabel>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={rise}
                  onChange={(e) => setRise(e.target.value)}
                  style={{ ...INPUT_STYLE, paddingRight: 28 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', pointerEvents: 'none' }}>%</span>
              </div>
              {errors.rise && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444', fontFamily: '"DM Sans", sans-serif' }}>{errors.rise}</p>}
              <FieldHint>Block if a single change raises cost by more than this.</FieldHint>
            </div>

            <div>
              <FieldLabel>
                <Lock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Hard block at
              </FieldLabel>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={hardBlock}
                  onChange={(e) => setHardBlock(e.target.value)}
                  style={{ ...INPUT_STYLE, paddingRight: 28 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', pointerEvents: 'none' }}>% of cap</span>
              </div>
              {errors.hardBlock && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444', fontFamily: '"DM Sans", sans-serif' }}>{errors.hardBlock}</p>}
              <FieldHint>Stop writing Terraform once spend hits this percentage.</FieldHint>
            </div>
          </div>

          {/* Budget scope */}
          <div>
            <FieldLabel>
              <Settings2 size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Budget scope
            </FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['per_pipeline', 'global'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  style={{
                    flex:         1,
                    height:       34,
                    borderRadius: 6,
                    border:       scope === s ? '2px solid #6366F1' : '1px solid #E5E7EB',
                    background:   scope === s ? '#EEF2FF' : '#F9FAFB',
                    color:        scope === s ? '#4338CA' : '#6B7280',
                    fontSize:     12,
                    fontWeight:   scope === s ? 700 : 500,
                    fontFamily:   '"DM Sans", sans-serif',
                    cursor:       'pointer',
                    transition:   'all 0.12s',
                  }}
                >
                  {s === 'per_pipeline' ? 'Per pipeline' : 'Global'}
                </button>
              ))}
            </div>
            <FieldHint>
              {scope === 'per_pipeline'
                ? 'Budget applies to this pipeline\'s infra only.'
                : 'Budget is shared across all pipelines you design.'}
            </FieldHint>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSkip}
              style={{
                flex:         1,
                height:       36,
                borderRadius: 6,
                border:       '1px solid #E5E7EB',
                background:   'transparent',
                color:        '#6B7280',
                fontSize:     13,
                fontWeight:   500,
                fontFamily:   '"DM Sans", sans-serif',
                cursor:       'pointer',
                transition:   'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              Use defaults
            </button>
            <button
              onClick={handleSave}
              style={{
                flex:         2,
                height:       36,
                borderRadius: 6,
                border:       'none',
                background:   'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color:        '#fff',
                fontSize:     13,
                fontWeight:   700,
                fontFamily:   '"DM Sans", sans-serif',
                cursor:       'pointer',
                boxShadow:    '0 1px 6px rgba(99,102,241,0.4)',
                transition:   'opacity 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Save Guardrails
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

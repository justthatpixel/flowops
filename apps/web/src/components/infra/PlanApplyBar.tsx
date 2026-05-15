/**
 * PlanApplyBar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating bottom bar that appears when Plan View is active in the
 * Infrastructure Designer. Shows a summary of pending Terraform changes
 * (create / update / destroy counts) and an Apply button with a
 * 4-state confirmation machine.
 *
 *  idle → confirming → applying → applied / failed
 *
 * LAYOUT
 *   ┌────────────────────────────────────────────────────────────────────────┐
 *   │ ⚡ Terraform Plan  · +2 create  ~3 update  −1 destroy  │  [✕ Exit]  [Apply →] │
 *   └────────────────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { DEMO_PLAN, PLAN_SUMMARY } from '@/data/demoPlan'

type ApplyState = 'idle' | 'confirming' | 'applying' | 'applied' | 'failed'

interface Props {
  onExit: () => void
}

// ─── Inject spin keyframe once ────────────────────────────────────────────────
function injectSpinStyle() {
  const ID = 'flowops-plan-spin'
  if (typeof document === 'undefined' || document.getElementById(ID)) return
  const el = document.createElement('style')
  el.id = ID
  el.textContent = `
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `
  document.head.appendChild(el)
}

// ─── Summary chips ────────────────────────────────────────────────────────────
const CHIP_CFG = [
  { key: 'create'  as const, symbol: '+', color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0' },
  { key: 'update'  as const, symbol: '~', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'replace' as const, symbol: '↻', color: '#F97316', bg: '#FFF7ED', border: '#FDBA74' },
  { key: 'delete'  as const, symbol: '−', color: '#EF4444', bg: '#FFF5F5', border: '#FECACA' },
]

export default function PlanApplyBar({ onExit }: Props) {
  const [applyState, setApplyState] = useState<ApplyState>('idle')

  useEffect(injectSpinStyle, [])

  // Simulate apply after 2.5s
  useEffect(() => {
    if (applyState !== 'applying') return
    const t = setTimeout(() => setApplyState('applied'), 2500)
    return () => clearTimeout(t)
  }, [applyState])

  // Auto-exit after applied
  useEffect(() => {
    if (applyState !== 'applied') return
    const t = setTimeout(onExit, 2000)
    return () => clearTimeout(t)
  }, [applyState, onExit])

  const handleApplyClick = useCallback(() => {
    if (applyState === 'idle')       return setApplyState('confirming')
    if (applyState === 'confirming') return setApplyState('applying')
  }, [applyState])

  const totalChanges = DEMO_PLAN.length

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{   y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      style={{
        position:     'absolute',
        bottom:       20,
        left:         '50%',
        transform:    'translateX(-50%)',
        zIndex:       50,
        background:   '#111827',
        border:       '1px solid #374151',
        borderRadius: 12,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '10px 16px',
        minWidth:     540,
        maxWidth:     760,
      }}
    >
      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Terminal size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#F9FAFB', fontFamily: '"DM Sans", sans-serif' }}>
          Terraform Plan
        </span>
        <span style={{ fontSize: 10, color: '#6B7280', fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
          {totalChanges} changes
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#374151', flexShrink: 0 }} />

      {/* Summary chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        {CHIP_CFG.map(({ key, symbol, color, bg, border }) => {
          const count = PLAN_SUMMARY[key] ?? 0
          if (!count) return null
          return (
            <div
              key={key}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          4,
                background:   bg,
                border:       `1px solid ${border}`,
                borderRadius: 6,
                padding:      '3px 8px',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1 }}>{symbol}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: '"DM Sans", sans-serif' }}>
                {count} {key}
              </span>
            </div>
          )
        })}
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          5,
          background:   'transparent',
          border:       '1px solid #374151',
          borderRadius: 6,
          padding:      '5px 10px',
          fontSize:     11,
          fontWeight:   600,
          color:        '#9CA3AF',
          cursor:       'pointer',
          fontFamily:   '"DM Sans", sans-serif',
          flexShrink:   0,
          transition:   'border-color 0.1s, color 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6B7280'; e.currentTarget.style.color = '#D1D5DB' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9CA3AF' }}
      >
        <X size={11} strokeWidth={2} />
        Exit Plan
      </button>

      {/* Apply button — state machine */}
      <AnimatePresence mode="wait">
        {applyState === 'idle' && (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{   opacity: 0, scale: 0.95 }}
            onClick={handleApplyClick}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              background:   'linear-gradient(135deg, #4F46E5, #7C3AED)',
              border:       'none',
              borderRadius: 7,
              padding:      '7px 14px',
              fontSize:     12,
              fontWeight:   700,
              color:        '#FFFFFF',
              cursor:       'pointer',
              fontFamily:   '"DM Sans", sans-serif',
              boxShadow:    '0 1px 6px rgba(99,102,241,0.5)',
              flexShrink:   0,
              whiteSpace:   'nowrap',
            }}
          >
            Apply to Production
            <span style={{ fontSize: 13, marginLeft: 2 }}>→</span>
          </motion.button>
        )}

        {applyState === 'confirming' && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{   opacity: 0, scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <span style={{ fontSize: 11, color: '#FBBF24', fontFamily: '"DM Sans", sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
              ⚠ Confirm apply to production?
            </span>
            <button
              onClick={() => setApplyState('idle')}
              style={{
                background: 'transparent', border: '1px solid #374151', borderRadius: 6,
                padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                border: 'none', borderRadius: 6,
                padding: '6px 13px', fontSize: 11, fontWeight: 700,
                color: '#FFFFFF', cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif',
                boxShadow: '0 1px 4px rgba(239,68,68,0.4)',
              }}
            >
              Yes, Apply
            </button>
          </motion.div>
        )}

        {applyState === 'applying' && (
          <motion.div
            key="applying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
          >
            <Loader
              size={14}
              color="#818CF8"
              strokeWidth={2.5}
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <span style={{ fontSize: 11, color: '#818CF8', fontFamily: '"DM Sans", sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Applying changes…
            </span>
          </motion.div>
        )}

        {applyState === 'applied' && (
          <motion.div
            key="applied"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{   opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <CheckCircle size={15} color="#22C55E" strokeWidth={2.5} />
            <span style={{ fontSize: 11, color: '#22C55E', fontFamily: '"DM Sans", sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Applied successfully!
            </span>
          </motion.div>
        )}

        {applyState === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <AlertCircle size={15} color="#EF4444" strokeWidth={2.5} />
            <span style={{ fontSize: 11, color: '#EF4444', fontFamily: '"DM Sans", sans-serif', fontWeight: 700 }}>
              Apply failed
            </span>
            <button
              onClick={() => setApplyState('idle')}
              style={{
                background: 'transparent', border: '1px solid #374151', borderRadius: 6,
                padding: '4px 9px', fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * PolicyManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-in panel (from the right) listing all active OPA policies.
 * Features:
 *   • Toggle each built-in policy on / off
 *   • Shows violation count per policy from live check
 *   • "Add Custom Policy" section — paste Rego text, give it a name
 *   • Lists custom policies with remove button
 *
 * Opened by the "Policies" button in InfraDesigner top bar.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Shield, ToggleLeft, ToggleRight, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useGuardrailStore } from '@/store/guardrailStore'
import { BUILTIN_POLICIES, type PolicyViolation } from '@/utils/opaService'

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  resource:   { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
  region:     { bg: '#F0FDF4', text: '#22C55E', border: '#BBF7D0' },
  instance:   { bg: '#FFF7ED', text: '#F97316', border: '#FED7AA' },
  tags:       { bg: '#F5F3FF', text: '#8B5CF6', border: '#DDD6FE' },
  encryption: { bg: '#FFF1F2', text: '#F43F5E', border: '#FECDD3' },
  access:     { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
}

interface Props {
  violations: PolicyViolation[]
  onClose: () => void
}

export default function PolicyManager({ violations, onClose }: Props) {
  const activePolicies = useGuardrailStore((s) => s.activePolicies)
  const customPolicies = useGuardrailStore((s) => s.customPolicies)
  const togglePolicy   = useGuardrailStore((s) => s.togglePolicy)
  const addCustom      = useGuardrailStore((s) => s.addCustomPolicy)

  const [showAddCustom,    setShowAddCustom]    = useState(false)
  const [customName,       setCustomName]       = useState('')
  const [customRego,       setCustomRego]       = useState('')
  const [customError,      setCustomError]      = useState('')
  const [expandedPolicy,   setExpandedPolicy]   = useState<string | null>(null)

  // Group violations by policy name for quick lookup
  const violationsByPolicy = violations.reduce<Record<string, PolicyViolation[]>>((acc, v) => {
    acc[v.policy] = acc[v.policy] ?? []
    acc[v.policy].push(v)
    return acc
  }, {})

  function handleAddCustom() {
    if (!customName.trim())  { setCustomError('Policy name is required'); return }
    if (!customRego.trim())  { setCustomError('Rego content is required'); return }
    if (!customRego.includes('package')) {
      setCustomError('Rego must include a package declaration, e.g. package flowops.my_policy')
      return
    }
    addCustom(customName.trim(), customRego.trim())
    setCustomName('')
    setCustomRego('')
    setCustomError('')
    setShowAddCustom(false)
  }

  const errorCount = violations.filter((v) => v.severity === 'error').length

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position:      'absolute',
        top:           0,
        right:         0,
        bottom:        0,
        width:         320,
        background:    '#FFFFFF',
        borderLeft:    '1px solid #E5E7EB',
        display:       'flex',
        flexDirection: 'column',
        zIndex:        25,
        fontFamily:    '"DM Sans", sans-serif',
        boxShadow:     '-4px 0 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          height:       52,
          borderBottom: '1px solid #F0F0F0',
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          padding:      '0 14px',
          flexShrink:   0,
        }}
      >
        <div
          style={{
            width:          28,
            height:         28,
            borderRadius:   6,
            background:     '#F0FDF4',
            border:         '1px solid #BBF7D0',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={14} color="#22C55E" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
            OPA Policies
          </div>
          <div style={{ fontSize: 10, color: errorCount > 0 ? '#EF4444' : '#9CA3AF', lineHeight: 1.2 }}>
            {errorCount > 0 ? `${errorCount} violation${errorCount !== 1 ? 's' : ''}` : 'All checks pass'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {/* ── Built-in policies ────────────────────────────────────────────── */}
        <SectionLabel>Built-in Policies</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {BUILTIN_POLICIES.map((policy) => {
            const isActive   = activePolicies.includes(policy.name)
            const policyViolations = violationsByPolicy[policy.name] ?? []
            const hasErrors  = policyViolations.some((v) => v.severity === 'error')
            const isExpanded = expandedPolicy === policy.name
            const catColor   = CATEGORY_COLORS[policy.category]

            return (
              <div
                key={policy.name}
                style={{
                  border:       `1px solid ${hasErrors ? '#FECACA' : '#F0F0F0'}`,
                  borderRadius: 8,
                  background:   hasErrors ? '#FFF5F5' : '#FAFAFA',
                  overflow:     'hidden',
                  transition:   'border-color 0.15s',
                }}
              >
                {/* Policy row */}
                <div
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         8,
                    padding:     '8px 10px',
                    cursor:      'pointer',
                  }}
                  onClick={() => setExpandedPolicy(isExpanded ? null : policy.name)}
                >
                  {/* Category chip */}
                  <div
                    style={{
                      fontSize:     9,
                      fontWeight:   700,
                      color:        catColor.text,
                      background:   catColor.bg,
                      border:       `1px solid ${catColor.border}`,
                      borderRadius: 10,
                      padding:      '1px 6px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      flexShrink:   0,
                    }}
                  >
                    {policy.category}
                  </div>

                  {/* Name + violation count */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {policy.title}
                    </div>
                  </div>

                  {/* Violation badge */}
                  {policyViolations.length > 0 && (
                    <span
                      style={{
                        fontSize:     10,
                        fontWeight:   700,
                        color:        '#EF4444',
                        background:   '#FEE2E2',
                        borderRadius: 10,
                        padding:      '1px 6px',
                        flexShrink:   0,
                      }}
                    >
                      {policyViolations.length}
                    </span>
                  )}

                  {/* Expand chevron */}
                  <div style={{ color: '#D1D5DB', flexShrink: 0 }}>
                    {isExpanded
                      ? <ChevronDown size={12} strokeWidth={2} />
                      : <ChevronRight size={12} strokeWidth={2} />}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePolicy(policy.name) }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: isActive ? '#22C55E' : '#D1D5DB', flexShrink: 0 }}
                  >
                    {isActive
                      ? <ToggleRight size={20} strokeWidth={1.8} />
                      : <ToggleLeft  size={20} strokeWidth={1.8} />}
                  </button>
                </div>

                {/* Expanded — description + violations */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F0F0F0', padding: '8px 10px', background: '#FFFFFF' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                      {policy.description}
                    </p>
                    {policyViolations.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {policyViolations.map((v, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize:     11,
                              color:        v.severity === 'error' ? '#DC2626' : v.severity === 'warning' ? '#D97706' : '#6B7280',
                              background:   v.severity === 'error' ? '#FEF2F2' : v.severity === 'warning' ? '#FFFBEB' : '#F9FAFB',
                              borderRadius: 5,
                              padding:      '5px 8px',
                              lineHeight:   1.4,
                            }}
                          >
                            {v.message}
                          </div>
                        ))}
                      </div>
                    )}
                    {policyViolations.length === 0 && isActive && (
                      <div style={{ fontSize: 11, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>✓</span> No violations
                      </div>
                    )}
                    {!isActive && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                        This policy is disabled — toggle to enable.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Custom policies ──────────────────────────────────────────────── */}
        <SectionLabel>Custom Policies</SectionLabel>

        {customPolicies.length === 0 && !showAddCustom && (
          <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 }}>
            No custom policies. Paste Rego below to add one.
          </p>
        )}

        {customPolicies.map((cp) => (
          <div
            key={cp.name}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '7px 10px',
              border:       '1px solid #F0F0F0',
              borderRadius: 7,
              marginBottom: 5,
              background:   '#FAFAFA',
            }}
          >
            <Shield size={12} color="#6366F1" strokeWidth={2} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#374151' }}>{cp.name}</span>
            <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>custom</span>
            <button
              onClick={() => {/* removeCustomPolicy — add to store if needed */}}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#D1D5DB' }}
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </div>
        ))}

        {/* Add custom form */}
        {showAddCustom ? (
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 10, background: '#FAFAFA' }}>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Policy name (e.g. no_public_rds)"
              style={{
                width: '100%', boxSizing: 'border-box', height: 32, background: '#FFF',
                border: '1px solid #E5E7EB', borderRadius: 5, padding: '0 8px',
                fontSize: 12, fontFamily: '"DM Sans", sans-serif', outline: 'none', marginBottom: 6,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = '#E5E7EB' }}
            />
            <textarea
              value={customRego}
              onChange={(e) => setCustomRego(e.target.value)}
              placeholder={'package flowops.my_policy\n\ndeny[msg] {\n  # your rule here\n}'}
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box', background: '#111827',
                border: '1px solid #374151', borderRadius: 5, padding: '8px',
                fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#D1FAE5',
                outline: 'none', resize: 'vertical', lineHeight: 1.5,
              }}
            />
            {customError && (
              <p style={{ margin: '4px 0', fontSize: 11, color: '#EF4444', fontFamily: '"DM Sans", sans-serif' }}>{customError}</p>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => { setShowAddCustom(false); setCustomError('') }}
                style={{ flex: 1, height: 30, borderRadius: 5, border: '1px solid #E5E7EB', background: 'transparent', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustom}
                style={{ flex: 2, height: 30, borderRadius: 5, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}
              >
                Add Policy
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            style={{
              width:        '100%',
              height:       32,
              borderRadius: 6,
              border:       '1.5px dashed #E5E7EB',
              background:   'transparent',
              color:        '#6B7280',
              fontSize:     12,
              fontWeight:   500,
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          6,
              fontFamily:   '"DM Sans", sans-serif',
              transition:   'border-color 0.1s, color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
          >
            <Plus size={13} strokeWidth={2} />
            Add Custom Policy
          </button>
        )}
      </div>
    </motion.div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontFamily: '"DM Sans", sans-serif' }}>
      {children}
    </div>
  )
}

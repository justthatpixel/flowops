/**
 * ModeSwitcher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-bar dropdown that toggles between Architect Mode and Dream Mode.
 *
 * Visual:
 *   Architect Mode  →  indigo pill with chevron
 *   Dream Mode      →  purple/dark pill with ✦ and "SIMULATION" badge
 *
 * The dropdown closes on outside click via a useEffect listener.
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ShieldCheck, Sparkles } from 'lucide-react'
import { useGuardrailStore, type InfraMode } from '@/store/guardrailStore'

const MODE_META: Record<InfraMode, {
  label:       string
  description: string
  bgColor:     string
  textColor:   string
  borderColor: string
  icon:        React.ReactNode
}> = {
  architect: {
    label:       'Architect Mode',
    description: 'Production workspace · Guardrails active',
    bgColor:     '#EEF2FF',
    textColor:   '#4338CA',
    borderColor: '#C7D2FE',
    icon:        <ShieldCheck size={12} strokeWidth={2.5} />,
  },
  dream: {
    label:       'Dream Mode',
    description: 'Sandbox · Simulation only · No files written',
    bgColor:     '#1E1B4B',
    textColor:   '#A78BFA',
    borderColor: '#4C1D95',
    icon:        <Sparkles size={12} strokeWidth={2} />,
  },
}

export default function ModeSwitcher() {
  const mode    = useGuardrailStore((s) => s.mode)
  const setMode = useGuardrailStore((s) => s.setMode)

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const meta = MODE_META[mode]

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          background:   meta.bgColor,
          border:       `1px solid ${meta.borderColor}`,
          borderRadius: 6,
          padding:      '5px 10px',
          fontSize:     12,
          fontWeight:   600,
          color:        meta.textColor,
          cursor:       'pointer',
          fontFamily:   '"DM Sans", sans-serif',
          transition:   'opacity 0.15s',
          whiteSpace:   'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        {meta.icon}
        {meta.label}
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          style={{
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position:     'absolute',
            top:          'calc(100% + 6px)',
            right:        0,
            width:        230,
            background:   '#FFFFFF',
            border:       '1px solid #E5E7EB',
            borderRadius: 8,
            boxShadow:    '0 4px 16px rgba(0,0,0,0.10)',
            overflow:     'hidden',
            zIndex:       50,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding:    '8px 12px 6px',
              fontSize:   10,
              fontWeight: 700,
              color:      '#9CA3AF',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: '"DM Sans", sans-serif',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            Designer Mode
          </div>

          {/* Options */}
          {(Object.entries(MODE_META) as [InfraMode, typeof MODE_META[InfraMode]][]).map(([key, m]) => {
            const isActive = mode === key
            return (
              <button
                key={key}
                onClick={() => { setMode(key); setOpen(false) }}
                style={{
                  width:          '100%',
                  display:        'flex',
                  alignItems:     'flex-start',
                  gap:            10,
                  padding:        '10px 12px',
                  background:     isActive ? m.bgColor + '80' : 'transparent',
                  border:         'none',
                  borderBottom:   '1px solid #F3F4F6',
                  cursor:         'pointer',
                  textAlign:      'left',
                  transition:     'background 0.1s',
                  fontFamily:     '"DM Sans", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Mode icon chip */}
                <div
                  style={{
                    width:          24,
                    height:         24,
                    borderRadius:   5,
                    background:     m.bgColor,
                    border:         `1px solid ${m.borderColor}`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                    marginTop:      1,
                    color:          m.textColor,
                  }}
                >
                  {m.icon}
                </div>

                <div>
                  <div
                    style={{
                      fontSize:   13,
                      fontWeight: isActive ? 700 : 500,
                      color:      isActive ? m.textColor : '#111827',
                      lineHeight: 1.3,
                    }}
                  >
                    {m.label}
                    {isActive && (
                      <span
                        style={{
                          marginLeft:  6,
                          fontSize:    9,
                          fontWeight:  700,
                          color:       m.textColor,
                          background:  m.bgColor,
                          border:      `1px solid ${m.borderColor}`,
                          borderRadius: 3,
                          padding:     '1px 5px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize:   11,
                      color:      '#6B7280',
                      marginTop:  2,
                      lineHeight: 1.4,
                    }}
                  >
                    {m.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

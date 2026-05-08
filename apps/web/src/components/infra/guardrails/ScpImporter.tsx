/**
 * ScpImporter.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-in panel for loading an AWS Organisation SCP document into the
 * guardrail pipeline (Layer 3).
 *
 * TABS
 *   Paste JSON  — raw textarea → parse & load
 *   Examples    — 4 pre-built SCP templates (one click to load)
 *
 * STATUS
 *   When an SCP is already loaded the header shows a green "Active" badge,
 *   a statement count, and a "Remove" button.
 *
 * The component writes the parsed ScpDocument into guardrailStore via
 * setScpDocument().  GuardrailPanel reads it back to run the live simulation.
 */

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, CheckCircle, AlertCircle, FileJson, ChevronRight, Trash2 } from 'lucide-react'
import { useGuardrailStore } from '@/store/guardrailStore'
import {
  parseScpDocument,
  SCP_EXAMPLES,
  type ScpDocument,
} from '@/utils/scpSimulator'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScpImporterProps {
  onClose: () => void
}

// ─── Label styles (shared) ────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize:      10,
  fontWeight:    700,
  color:         '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom:  5,
  fontFamily:    '"DM Sans", sans-serif',
  display:       'block',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScpImporter({ onClose }: ScpImporterProps) {
  const scpDocument   = useGuardrailStore((s) => s.scpDocument) as ScpDocument | null
  const setScpDocument = useGuardrailStore((s) => s.setScpDocument)

  const [tab,       setTab]       = useState<'paste' | 'examples'>('paste')
  const [json,      setJson]      = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  // Pre-fill textarea if document already loaded
  useEffect(() => {
    if (scpDocument && !json) {
      setJson(JSON.stringify(scpDocument, null, 2))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleParse() {
    setError(null)
    const result = parseScpDocument(json.trim())
    if ('error' in result) {
      setError(result.error ?? 'Failed to parse SCP document')
      return
    }
    setScpDocument(result.doc)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  function handleLoadExample(exampleJson: string) {
    const result = parseScpDocument(exampleJson)
    if ('error' in result) return  // shouldn't happen with built-in examples
    setScpDocument(result.doc)
    setJson(JSON.stringify(result.doc, null, 2))
    setTab('paste')
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  function handleRemove() {
    setScpDocument(null)
    setJson('')
    setError(null)
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const statementCount = scpDocument
    ? (scpDocument as ScpDocument).Statement.length
    : 0

  const denyCount = scpDocument
    ? (scpDocument as ScpDocument).Statement.filter((s) => s.Effect === 'Deny').length
    : 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      exit={{   x: 340, opacity: 0 }}
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
        overflowY:     'auto',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      '14px 16px 12px',
          borderBottom: '1px solid #F3F4F6',
          background:   scpDocument ? '#F0FDF4' : '#F9FAFB',
          flexShrink:   0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileJson size={15} color={scpDocument ? '#16A34A' : '#6366F1'} strokeWidth={2} />
          <span
            style={{
              fontSize:   13,
              fontWeight: 700,
              color:      '#111827',
              flex:       1,
            }}
          >
            SCP Guardrail
          </span>

          {/* Active badge */}
          {scpDocument && (
            <span
              style={{
                fontSize:     9,
                fontWeight:   800,
                color:        '#16A34A',
                background:   '#DCFCE7',
                borderRadius: 4,
                padding:      '2px 6px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Active
            </span>
          )}

          <button
            onClick={onClose}
            style={{
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              color:         '#9CA3AF',
              padding:       4,
              borderRadius:  4,
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#374151' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
          Load an AWS Organisation SCP to simulate which actions would be denied before generating Terraform.
        </p>

        {/* Loaded document stats */}
        {scpDocument && (
          <div
            style={{
              marginTop:    10,
              padding:      '8px 10px',
              background:   '#FFFFFF',
              borderRadius: 6,
              border:       '1px solid #BBF7D0',
              display:      'flex',
              alignItems:   'center',
              gap:          10,
            }}
          >
            <CheckCircle size={13} color="#22C55E" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>
              <strong>{statementCount}</strong> statement{statementCount !== 1 ? 's' : ''} loaded
              {denyCount > 0 && (
                <span style={{ color: '#6B7280' }}>
                  {' · '}{denyCount} Deny rule{denyCount !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <button
              onClick={handleRemove}
              title="Remove SCP"
              style={{
                background:    'none',
                border:        'none',
                cursor:        'pointer',
                color:         '#EF4444',
                padding:       2,
                borderRadius:  4,
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                opacity:       0.7,
                flexShrink:    0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display:      'flex',
          borderBottom: '1px solid #F3F4F6',
          flexShrink:   0,
        }}
      >
        {(['paste', 'examples'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex:       1,
              padding:    '8px 0',
              border:     'none',
              background: 'none',
              fontSize:   11,
              fontWeight: tab === t ? 700 : 500,
              color:      tab === t ? '#6366F1' : '#9CA3AF',
              cursor:     'pointer',
              borderBottom: tab === t ? '2px solid #6366F1' : '2px solid transparent',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'color 0.15s, border-color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {t === 'paste' ? 'Paste JSON' : 'Examples'}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>

        {/* ── Paste tab ─────────────────────────────────────────────────────── */}
        {tab === 'paste' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={labelStyle}>SCP Policy Document (JSON)</label>
            <textarea
              ref={textareaRef}
              value={json}
              onChange={(e) => { setJson(e.target.value); setError(null) }}
              placeholder={`{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Deny",\n      "Action": "*",\n      "Resource": "*",\n      "Condition": { ... }\n    }\n  ]\n}`}
              spellCheck={false}
              style={{
                width:         '100%',
                height:        220,
                padding:       10,
                fontSize:      11,
                fontFamily:    '"JetBrains Mono", "Fira Code", monospace',
                lineHeight:    1.55,
                color:         '#1F2937',
                background:    '#F9FAFB',
                border:        `1px solid ${error ? '#FECACA' : '#E5E7EB'}`,
                borderRadius:  6,
                resize:        'vertical',
                outline:       'none',
                boxSizing:     'border-box',
                transition:    'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366F1' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = error ? '#FECACA' : '#E5E7EB' }}
            />

            {/* Error */}
            {error && (
              <div
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          7,
                  padding:      '8px 10px',
                  background:   '#FFF5F5',
                  borderRadius: 6,
                  border:       '1px solid #FECACA',
                }}
              >
                <AlertCircle size={13} color="#EF4444" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#DC2626', lineHeight: 1.5 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Success flash */}
            {justSaved && (
              <div
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          7,
                  padding:      '8px 10px',
                  background:   '#F0FDF4',
                  borderRadius: 6,
                  border:       '1px solid #BBF7D0',
                }}
              >
                <CheckCircle size={13} color="#22C55E" strokeWidth={2} />
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>
                  SCP loaded — Layer 3 is now active.
                </span>
              </div>
            )}

            {/* Parse button */}
            <button
              onClick={handleParse}
              disabled={!json.trim()}
              style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                gap:           6,
                background:    json.trim() ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#F3F4F6',
                border:        'none',
                borderRadius:  6,
                padding:       '8px 12px',
                fontSize:      12,
                fontWeight:    600,
                color:         json.trim() ? '#FFFFFF' : '#9CA3AF',
                cursor:        json.trim() ? 'pointer' : 'not-allowed',
                fontFamily:    '"DM Sans", sans-serif',
                boxShadow:     json.trim() ? '0 1px 4px rgba(99,102,241,0.35)' : 'none',
                transition:    'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (json.trim()) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <Upload size={12} strokeWidth={2.5} />
              Parse &amp; Load SCP
            </button>

            {/* Hint */}
            <p
              style={{
                fontSize:   10,
                color:      '#9CA3AF',
                margin:     0,
                lineHeight: 1.5,
              }}
            >
              Accepts both a full SCP policy document <code>{"{ Statement: [...] }"}</code> and the wrapped AWS format <code>{"{ Policy: { Statement: [...] } }"}</code>.
            </p>
          </div>
        )}

        {/* ── Examples tab ──────────────────────────────────────────────────── */}
        {tab === 'examples' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p
              style={{
                fontSize:    11,
                color:       '#6B7280',
                margin:      '0 0 6px',
                lineHeight:  1.5,
              }}
            >
              Click any example to load it into the simulator. You can edit it further in the Paste JSON tab.
            </p>

            {SCP_EXAMPLES.map((example) => (
              <button
                key={example.name}
                onClick={() => handleLoadExample(example.json)}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           10,
                  padding:       '10px 12px',
                  background:    '#FAFAFA',
                  border:        '1px solid #E5E7EB',
                  borderRadius:  8,
                  cursor:        'pointer',
                  textAlign:     'left',
                  width:         '100%',
                  transition:    'border-color 0.15s, background 0.15s',
                  fontFamily:    '"DM Sans", sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366F1'
                  e.currentTarget.style.background  = '#F5F3FF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.background  = '#FAFAFA'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize:   12,
                      fontWeight: 700,
                      color:      '#1F2937',
                      marginBottom: 2,
                    }}
                  >
                    {example.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>
                    {example.description}
                  </div>
                </div>
                <ChevronRight size={13} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
              </button>
            ))}

            <div
              style={{
                marginTop:    8,
                padding:      '10px 12px',
                background:   '#F9FAFB',
                borderRadius: 8,
                border:       '1px solid #E5E7EB',
              }}
            >
              <p
                style={{
                  fontSize:   10,
                  color:      '#9CA3AF',
                  margin:     0,
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: '#6B7280' }}>Tip:</strong> In production, export your real SCP via <code>aws organizations describe-policy --policy-id p-xxxx</code> and paste the <code>Content</code> field here.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

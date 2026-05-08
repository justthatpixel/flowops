/**
 * DreamMode.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dream Mode shell — two states:
 *
 *   IDLE      — objective input + example chips + Generate CTA
 *   GENERATED — live DreamCanvas (glowing ReactFlow) + toolbar strip
 *               with Infracost button + Reality Bridge button
 *
 * Generation is a 1.5s simulated delay (shimmer) then a keyword-parsed
 * architecture based on the objective text.
 *
 * Keyword → template mapping:
 *   "serverless" / "lambda" / "function"    → serverless, tier 3
 *   "ml" / "ai" / "inference" / "model"     → ml-inference, tier 3
 *   "static" / "cdn" / "jamstack" / "s3"   → static-api, tier 3
 *   "microservice" / "service mesh"         → microservices, tier 3
 *   "api" / "worker" / "queue"              → api-workers, tier 3
 *   else                                    → web-app, tier 3
 *
 * Phase 7: InfracostPanel accessible from the toolbar.
 * Phase 8: RealityBridge accessible from the toolbar.
 */

import { useState, useCallback }   from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Cpu, Database, Globe, Zap,
         TrendingDown, RefreshCw, ArrowUpDown } from 'lucide-react'
import { getTierLayout }           from '@/data/infra-templates'
import { useInfraStore }           from '@/store/infraStore'
import type { InfraComponent, InfraEdge, ArchTemplateId } from '@/types/infra'
import DreamCanvas                 from '../dream/DreamCanvas'
import RealityBridge               from '../dream/RealityBridge'
import InfracostPanel              from '../InfracostPanel'

// ─── Dot-grid background ──────────────────────────────────────────────────────

const DARK_GRID_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23333344'/%3E%3C/svg%3E")`

// ─── Example objectives ───────────────────────────────────────────────────────

const EXAMPLE_OBJECTIVES = [
  'Scale reads for 100k users on my Next.js app',
  'Build a serverless AI inference API',
  'Design a multi-region active-active setup',
  'Architect a zero-downtime blue/green deploy',
]

// ─── Keyword → template matcher ───────────────────────────────────────────────

function pickTemplate(objective: string): ArchTemplateId {
  const o = objective.toLowerCase()
  if (/serverless|lambda|\bfunction\b/.test(o))     return 'serverless'
  if (/\bml\b|ai|inference|model|gpu/.test(o))      return 'ml-inference'
  if (/static|jamstack|\bcdn\b|\bs3\b|nextjs|next\.js/.test(o)) return 'static-api'
  if (/microservice|service.?mesh/.test(o))          return 'microservices'
  if (/\bapi\b|worker|queue|\bsqs\b/.test(o))        return 'api-workers'
  return 'web-app'
}

// ─── Generated architecture state ────────────────────────────────────────────

interface GeneratedArch {
  objective:  string
  components: InfraComponent[]
  edges:      InfraEdge[]
  templateId: ArchTemplateId
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DreamMode() {
  const setComponents        = useInfraStore((s) => s.setComponents)

  const [objective,    setObjective]    = useState('')
  const [loading,      setLoading]      = useState(false)
  const [generated,    setGenerated]    = useState<GeneratedArch | null>(null)
  const [showBridge,   setShowBridge]   = useState(false)
  const [showCosts,    setShowCosts]    = useState(false)

  // ── Generate handler ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!objective.trim()) return
    setLoading(true)
    setShowBridge(false)
    setShowCosts(false)

    // Simulate AI generation with a 1.5s delay
    setTimeout(() => {
      const templateId = pickTemplate(objective)
      // Use tier 3 (100k users) — the "dream" scale
      const layout = getTierLayout(templateId, 3)
      setGenerated({
        objective:  objective.trim(),
        components: layout.components,
        edges:      layout.edges,
        templateId,
      })
      setLoading(false)
    }, 1500)
  }, [objective])

  const handleReset = useCallback(() => {
    setGenerated(null)
    setShowBridge(false)
    setShowCosts(false)
    setObjective('')
  }, [])

  // ── Apply constrained arch → switch to Architect Mode ─────────────────────
  const handleApply = useCallback(
    (components: InfraComponent[], edges: InfraEdge[]) => {
      setComponents(components, edges)
      // InfraDesigner handles the mode switch; we just note it was applied
    },
    [setComponents],
  )

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex:            1,
        display:         'flex',
        flexDirection:   'column',
        background:      '#0F0F13',
        backgroundImage: DARK_GRID_BG,
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* ── SIMULATION ONLY banner ────────────────────────────────────────── */}
      <div
        style={{
          background:     'rgba(251,191,36,0.10)',
          borderBottom:   '1px solid rgba(251,191,36,0.25)',
          padding:        '7px 20px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            8,
          flexShrink:     0,
        }}
      >
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            background:   'rgba(251,191,36,0.18)',
            border:       '1px solid rgba(251,191,36,0.40)',
            borderRadius: 20,
            padding:      '3px 10px',
          }}
        >
          <div
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   '#FBBF24',
              boxShadow:    '0 0 6px #FBBF24',
              animation:    'dreamPulse 2s infinite',
            }}
          />
          <span
            style={{
              fontSize:      10,
              fontWeight:    800,
              color:         '#FBBF24',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontFamily:    '"DM Sans", sans-serif',
            }}
          >
            Simulation Only
          </span>
        </div>
        <span
          style={{
            fontSize:   12,
            color:      '#A0A0B0',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          No AWS credentials used · Nothing is built · Terraform never written to disk
        </span>
      </div>

      {/* ── Body: IDLE vs GENERATED ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ─────── IDLE: objective form ─────── */}
        {!generated && !loading && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '40px 24px',
              gap:            28,
            }}
          >
            {/* Title */}
            <div style={{ textAlign: 'center', maxWidth: 520 }}>
              <div
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            8,
                  marginBottom:   12,
                }}
              >
                <div
                  style={{
                    width:          36,
                    height:         36,
                    borderRadius:   8,
                    background:     'rgba(139,92,246,0.15)',
                    border:         '1px solid rgba(139,92,246,0.35)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} color="#A78BFA" strokeWidth={1.8} />
                </div>
              </div>
              <h2
                style={{
                  fontSize:   26,
                  fontWeight: 700,
                  color:      '#F3F4F6',
                  fontFamily: '"DM Sans", sans-serif',
                  margin:     0,
                  lineHeight: 1.2,
                }}
              >
                What would you build with
                <br />
                <span
                  style={{
                    background:           'linear-gradient(90deg, #A78BFA, #60A5FA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor:  'transparent',
                  }}
                >
                  no constraints?
                </span>
              </h2>
              <p
                style={{
                  marginTop:  10,
                  fontSize:   13,
                  color:      '#6B7280',
                  lineHeight: 1.6,
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                Dream Mode lets you explore any architecture — Netflix-scale, multi-region,
                whatever you want. Use the{' '}
                <strong style={{ color: '#9CA3AF' }}>Reality Bridge</strong> to optimise
                the result for your actual budget.
              </p>
            </div>

            {/* Objective input */}
            <div style={{ width: '100%', maxWidth: 560 }}>
              <label
                style={{
                  display:       'block',
                  fontSize:      10,
                  fontWeight:    700,
                  color:         '#6B7280',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom:  6,
                  fontFamily:    '"DM Sans", sans-serif',
                }}
              >
                Objective
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
                placeholder="e.g. Scale reads for 100k users on my Next.js app"
                rows={2}
                style={{
                  width:        '100%',
                  boxSizing:    'border-box',
                  background:   'rgba(255,255,255,0.05)',
                  border:       '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 8,
                  padding:      '10px 14px',
                  fontSize:     14,
                  color:        '#F3F4F6',
                  fontFamily:   '"DM Sans", sans-serif',
                  outline:      'none',
                  resize:       'none',
                  lineHeight:   1.5,
                  transition:   'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
              />

              {/* Example chips */}
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EXAMPLE_OBJECTIVES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setObjective(ex)}
                    style={{
                      background:   'rgba(255,255,255,0.04)',
                      border:       '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 20,
                      padding:      '3px 10px',
                      fontSize:     11,
                      color:        '#9CA3AF',
                      cursor:       'pointer',
                      fontFamily:   '"DM Sans", sans-serif',
                      transition:   'background 0.1s, color 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(139,92,246,0.15)'
                      e.currentTarget.style.color      = '#C4B5FD'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.color      = '#9CA3AF'
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate CTA */}
            <button
              disabled={!objective.trim()}
              onClick={handleGenerate}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        8,
                background: objective.trim()
                  ? 'linear-gradient(135deg, #7C3AED, #4F46E5)'
                  : 'rgba(255,255,255,0.05)',
                border:     'none',
                borderRadius: 8,
                padding:    '11px 24px',
                fontSize:   14,
                fontWeight: 700,
                color:      objective.trim() ? '#FFFFFF' : '#4B5563',
                cursor:     objective.trim() ? 'pointer' : 'not-allowed',
                fontFamily: '"DM Sans", sans-serif',
                boxShadow:  objective.trim() ? '0 2px 12px rgba(124,58,237,0.45)' : 'none',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (objective.trim()) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <Sparkles size={15} strokeWidth={2} />
              Generate Dream Architecture
            </button>

            {/* Capability hints */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560, marginTop: 8 }}>
              {[
                { icon: Cpu,          label: 'Any compute',    sub: 'GPU, bare metal, spot' },
                { icon: Database,     label: 'Any database',   sub: 'Aurora, DynamoDB, Redshift' },
                { icon: Globe,        label: 'Multi-region',   sub: 'Global Accelerator, Route 53' },
                { icon: TrendingDown, label: 'Infracost est.', sub: 'Line-item breakdown' },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          8,
                    background:   'rgba(255,255,255,0.03)',
                    border:       '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                    padding:      '8px 12px',
                    minWidth:     120,
                  }}
                >
                  <Icon size={14} color="#6B7280" strokeWidth={1.8} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#D1D5DB', fontFamily: '"DM Sans", sans-serif' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─────── LOADING: shimmer ─────── */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex' }}
          >
            <DreamCanvas components={[]} edges={[]} isLoading />
          </motion.div>
        )}

        {/* ─────── GENERATED: canvas + toolbar ─────── */}
        {generated && !loading && (
          <motion.div
            key="generated"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
          >
            {/* Toolbar strip */}
            <div
              style={{
                height:       44,
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background:   'rgba(255,255,255,0.03)',
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                padding:      '0 16px',
                flexShrink:   0,
              }}
            >
              {/* Objective recap */}
              <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif', fontStyle: 'italic' }}>
                "{generated.objective}"
              </span>
              <span
                style={{
                  fontSize:     9,
                  fontWeight:   700,
                  color:        '#A78BFA',
                  background:   'rgba(167,139,250,0.12)',
                  borderRadius: 4,
                  padding:      '2px 6px',
                  letterSpacing:'0.05em',
                  textTransform:'uppercase',
                  fontFamily:   '"DM Sans", sans-serif',
                }}
              >
                {generated.templateId.replace(/-/g, ' ')}
              </span>

              <div style={{ flex: 1 }} />

              {/* Cost button */}
              <button
                onClick={() => { setShowCosts((v) => !v); setShowBridge(false) }}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          5,
                  background:   showCosts ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  border:       `1px solid ${showCosts ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: 6,
                  padding:      '4px 10px',
                  fontSize:     11,
                  fontWeight:   600,
                  color:        showCosts ? '#A5B4FC' : '#9CA3AF',
                  cursor:       'pointer',
                  fontFamily:   '"DM Sans", sans-serif',
                  transition:   'all 0.15s',
                }}
              >
                <TrendingDown size={11} strokeWidth={2} />
                Costs
              </button>

              {/* Reality Bridge button */}
              <button
                onClick={() => { setShowBridge((v) => !v); setShowCosts(false) }}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          5,
                  background:   showBridge
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(124,58,237,0.3))'
                    : 'rgba(255,255,255,0.05)',
                  border:       `1px solid ${showBridge ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: 6,
                  padding:      '4px 10px',
                  fontSize:     11,
                  fontWeight:   600,
                  color:        showBridge ? '#C4B5FD' : '#9CA3AF',
                  cursor:       'pointer',
                  fontFamily:   '"DM Sans", sans-serif',
                  transition:   'all 0.15s',
                }}
              >
                <ArrowUpDown size={11} strokeWidth={2} />
                Reality Bridge
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                title="Start over"
                style={{
                  background:   'none',
                  border:       '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding:      '4px 8px',
                  cursor:       'pointer',
                  color:        '#6B7280',
                  display:      'flex',
                  alignItems:   'center',
                  transition:   'color 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280' }}
              >
                <RefreshCw size={11} strokeWidth={2} />
              </button>
            </div>

            {/* Canvas layer */}
            <div style={{ flex: 1, position: 'relative' }}>
              <DreamCanvas
                components={generated.components}
                edges={generated.edges}
              />

              {/* Infracost overlay panel */}
              <AnimatePresence>
                {showCosts && (
                  <InfracostPanel onClose={() => setShowCosts(false)} />
                )}
              </AnimatePresence>

              {/* Reality Bridge bottom sheet */}
              <AnimatePresence>
                {showBridge && (
                  <RealityBridge
                    dreamComponents={generated.components}
                    dreamEdges={generated.edges}
                    objective={generated.objective}
                    onClose={() => setShowBridge(false)}
                    onApply={handleApply}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

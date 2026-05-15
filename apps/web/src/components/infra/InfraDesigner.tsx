/**
 * InfraDesigner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen overlay (Epic 2) that slides up from the bottom of the viewport
 * when a pipeline Deploy node is clicked.
 *
 * LAYOUT (fixed, inset 0, z-index 100):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  TopBar: ← Back · FlowOps Infra · breadcrumb · [Terraform▶] │  52px
 *   │  TemplatePicker: Web App | Serverless | Microservices | …   │  44px
 *   │  StatsBar: Cost · Capacity · Headroom · Template            │  56px (+ warning banner)
 *   ├──────────────────────────────────────────────────────────────┤
 *   │                                                              │
 *   │   InfraCanvas (full-width, position: relative)              │  flex: 1
 *   │                                                              │
 *   │   ScaleSlider (abs, top-right corner)                       │
 *   │                                                              │
 *   │   InfraConfigPanel (abs, right: 0, when node selected)      │  300px
 *   └──────────────────────────────────────────────────────────────┘
 *
 * PANEL OVERLAY PATTERN
 *   InfraConfigPanel is `position: absolute; right: 0` — it overlays the canvas
 *   rather than shrinking it.  This prevents ReactFlow from recalculating node
 *   positions (which would trigger a one-frame black repaint).
 *
 * STATE
 *   All state lives in infraStore (Zustand).  This component only reads:
 *     isOpen, closeDesigner, deployNodeId, templateId, scaleTier, selectedComponentId
 *
 * ENTRY POINT
 *   Opened by usePipelineStore → openDesigner(deployNodeId) which is called
 *   when the user clicks the "Open Designer" button in the Deploy node's config
 *   panel (or will be wired there in Phase 7).
 *
 * TERRAFORM (Phase 6)
 *   "Generate Terraform" button in the top bar calls generateTerraform() with
 *   the current canvas components → stores result via setTerraform() → opens
 *   TerraformPanel overlay (z-index 200, above this designer at z-index 100).
 *   Closing TerraformPanel returns to the designer without clearing the result,
 *   so re-opening is instant (no re-generation needed unless the canvas changed).
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Zap, Terminal, Sparkles, Settings2, Shield, TrendingDown, AlertOctagon, CheckCircle, GitCompareArrows } from 'lucide-react'
import { useInfraStore, SCALE_TIERS } from '@/store/infraStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { useGuardrailStore } from '@/store/guardrailStore'
import type { AuditEntry } from '@/store/guardrailStore'
import { generateTerraform } from '@/utils/terraformGenerator'
import { budgetFillPercent, budgetBarColor, formatBudgetLabel } from '@/utils/budgetChecker'
import { runOpaCheck } from '@/utils/opaService'
import { runFullGuardrailCheck, summariseResult } from '@/utils/guardrailEngine'
import type { ScpDocument } from '@/utils/scpSimulator'
import InfraCanvas from './InfraCanvas'
import InfraSidebar from './InfraSidebar'
import StatsBar from './StatsBar'
import ScaleSlider from './ScaleSlider'
import InfraConfigPanel from './InfraConfigPanel'
import TemplatePicker from './TemplatePicker'
import TerraformPanel from './TerraformPanel'
import InfraAIPanel from './InfraAIPanel'
import ModeSwitcher from './modes/ModeSwitcher'
import DreamMode from './modes/DreamMode'
import BudgetSetup from './guardrails/BudgetSetup'
import PolicyManager from './guardrails/PolicyManager'
import GuardrailPanel from './guardrails/GuardrailPanel'
import ScpImporter from './guardrails/ScpImporter'
import InfracostPanel from './InfracostPanel'
import AuditLog from './audit/AuditLog'
import PlanApplyBar from './PlanApplyBar'

export default function InfraDesigner() {
  const { isOpen, closeDesigner, deployNodeId, templateId, scaleTier, selectedComponentId, components, setTerraform, liveStats, planMode, setPlanMode } = useInfraStore()
  const { nodes } = usePipelineStore()
  const mode              = useGuardrailStore((s) => s.mode)
  const budgetConfig      = useGuardrailStore((s) => s.budgetConfig)
  const budgetConfigured  = useGuardrailStore((s) => s.budgetConfigured)
  const setCurrentCost    = useGuardrailStore((s) => s.setCurrentMonthlyCost)

  // Keep guardrailStore.currentMonthlyCost in sync with the live canvas cost
  useEffect(() => {
    setCurrentCost(liveStats.costMonthly)
  }, [liveStats.costMonthly, setCurrentCost])

  // Local state: whether the TerraformPanel overlay is visible.
  // The generated HCL lives in infraStore.terraform so it persists across opens.
  const [showTerraform, setShowTerraform] = useState(false)

  // Local state: whether the AI sidebar is visible (slides in from the left).
  const [showAI, setShowAI] = useState(false)

  // Show BudgetSetup modal on first entry to Architect Mode
  const [showBudgetSetup, setShowBudgetSetup] = useState(false)
  useEffect(() => {
    if (isOpen && mode === 'architect' && !budgetConfigured) {
      setShowBudgetSetup(true)
    }
  }, [isOpen, mode, budgetConfigured])

  // PolicyManager panel
  const [showPolicies, setShowPolicies] = useState(false)

  // SCP Importer panel
  const [showScp, setShowScp] = useState(false)

  // Infracost panel
  const [showCosts, setShowCosts] = useState(false)

  // Guardrail block modal
  const [blockModal, setBlockModal] = useState<{ reason: string; layer: string } | null>(null)

  // Live OPA violations (needed for badge count in top bar + PolicyManager props)
  const activePolicies  = useGuardrailStore((s) => s.activePolicies)
  const customPolicies  = useGuardrailStore((s) => s.customPolicies)
  const scpDocument     = useGuardrailStore((s) => s.scpDocument) as ScpDocument | null
  const addAuditEntry   = useGuardrailStore((s) => s.addAuditEntry)
  const currentCost     = useGuardrailStore((s) => s.currentMonthlyCost)

  const opaViolations = useMemo(
    () => runOpaCheck(components, activePolicies, customPolicies).violations,
    [components, activePolicies, customPolicies],
  )

  /** Run all 3 guardrail layers, write an audit entry, then generate HCL if all pass. */
  function handleGenerateTerraform() {
    const check = runFullGuardrailCheck({
      components,
      currentMonthlyCost:  currentCost,
      proposedMonthlyCost: liveStats.costMonthly,
      budgetConfig,
      activePolicies,
      customPolicies,
      scpDocument,
    })

    // Audit entry
    const entry: AuditEntry = {
      id:          `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp:   Date.now(),
      action:      `Generate Terraform — ${templateId} / tier ${scaleTier}`,
      costResult:  check.cost.pass  ? 'pass' : 'block',
      opaResult:   check.opa.pass   ? 'pass' : 'block',
      scpResult:   check.scp.pass   ? 'pass' : 'block',
      outcome:     check.pass ? 'written' : 'blocked',
      blockReason: check.pass ? undefined : summariseResult(check),
    }
    addAuditEntry(entry)

    if (!check.pass) {
      const layerLabel =
        check.blockedAt === 'cost'   ? 'Cost Guardrail'
        : check.blockedAt === 'policy' ? 'OPA Policy'
        : 'SCP'
      const reason =
        check.cost.reason  ||
        check.opa.reason   ||
        check.scp.reason   ||
        'A guardrail check failed.'
      setBlockModal({ reason, layer: layerLabel })
      return
    }

    const files = generateTerraform(components, templateId, scaleTier)
    setTerraform(files)
    setShowTerraform(true)
  }

  const deployNode = deployNodeId ? nodes.find((n) => n.id === deployNodeId) : null
  const tier = SCALE_TIERS[scaleTier]

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        background: '#F7F7F5',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 20,
          gap: 12,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Back button */}
        <button
          onClick={closeDesigner}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 500,
            color: '#6B7280',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'border-color 0.15s, color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.borderColor = '#3B82F6'
            el.style.color = '#3B82F6'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.borderColor = '#E5E7EB'
            el.style.color = '#6B7280'
          }}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Back to Pipeline
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#E5E7EB' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.2px',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            FlowOps
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#8B5CF6',
              background: '#F3F0FF',
              padding: '1px 6px',
              borderRadius: 4,
              letterSpacing: '0.5px',
            }}
          >
            Infra
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#E5E7EB' }} />

        {/* Context breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#6B7280',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {deployNode && (
            <>
              <span style={{ color: '#9CA3AF' }}>{deployNode.data.label}</span>
              <span style={{ color: '#D1D5DB' }}>·</span>
            </>
          )}
          <span style={{ fontWeight: 600, color: '#374151' }}>
            {templateId}
          </span>
          <span style={{ color: '#D1D5DB' }}>·</span>
          <span>{tier.userCount}</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Budget progress bar — Architect Mode only */}
        {mode === 'architect' && (() => {
          const fill  = budgetFillPercent(liveStats.costMonthly, budgetConfig.monthlyCap)
          const color = budgetBarColor(fill)
          return (
            <div
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        8,
                flexShrink: 0,
              }}
            >
              {/* Labels */}
              <span
                style={{
                  fontSize:   11,
                  color:      '#6B7280',
                  fontFamily: '"DM Sans", sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatBudgetLabel(liveStats.costMonthly)}
                <span style={{ color: '#D1D5DB' }}> / </span>
                {formatBudgetLabel(budgetConfig.monthlyCap)}/mo
              </span>

              {/* Progress track */}
              <div
                style={{
                  width:        80,
                  height:       6,
                  borderRadius: 3,
                  background:   '#F3F4F6',
                  overflow:     'hidden',
                  flexShrink:   0,
                }}
              >
                <div
                  style={{
                    width:        `${fill}%`,
                    height:       '100%',
                    borderRadius: 3,
                    background:   color,
                    transition:   'width 0.4s ease, background 0.3s',
                  }}
                />
              </div>

              {/* Percentage */}
              <span
                style={{
                  fontSize:   11,
                  fontWeight: 600,
                  color:      color,
                  fontFamily: '"DM Sans", sans-serif',
                  minWidth:   30,
                }}
              >
                {Math.round(fill)}%
              </span>

              {/* Edit guardrails button */}
              <button
                onClick={() => setShowBudgetSetup(true)}
                title="Edit guardrails"
                style={{
                  background:   'transparent',
                  border:       '1px solid #E5E7EB',
                  borderRadius: 5,
                  width:        24,
                  height:       24,
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  cursor:       'pointer',
                  color:        '#9CA3AF',
                  padding:      0,
                  flexShrink:   0,
                  transition:   'border-color 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366F1'
                  e.currentTarget.style.color       = '#6366F1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.color       = '#9CA3AF'
                }}
              >
                <Settings2 size={12} strokeWidth={2} />
              </button>
            </div>
          )
        })()}

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#E5E7EB', flexShrink: 0 }} />

        {/* Mode switcher */}
        <ModeSwitcher />

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#E5E7EB', flexShrink: 0 }} />

        {/* Policies button — Architect Mode only */}
        {mode === 'architect' && (() => {
          const errorCount = opaViolations.filter((v) => v.severity === 'error').length
          return (
            <button
              onClick={() => { setShowPolicies((v) => !v); setShowScp(false) }}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          5,
                background:   showPolicies
                  ? '#F0FDF4'
                  : errorCount > 0 ? '#FFF5F5' : 'transparent',
                border:       showPolicies
                  ? '1px solid #BBF7D0'
                  : errorCount > 0 ? '1px solid #FECACA' : '1px solid #E5E7EB',
                borderRadius: 6,
                padding:      '5px 10px',
                fontSize:     12,
                fontWeight:   600,
                color:        showPolicies
                  ? '#15803D'
                  : errorCount > 0 ? '#DC2626' : '#6B7280',
                cursor:       'pointer',
                fontFamily:   '"DM Sans", sans-serif',
                flexShrink:   0,
                transition:   'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!showPolicies) {
                  e.currentTarget.style.borderColor = '#22C55E'
                  e.currentTarget.style.color = '#15803D'
                }
              }}
              onMouseLeave={(e) => {
                if (!showPolicies) {
                  e.currentTarget.style.borderColor = errorCount > 0 ? '#FECACA' : '#E5E7EB'
                  e.currentTarget.style.color = errorCount > 0 ? '#DC2626' : '#6B7280'
                }
              }}
            >
              <Shield size={12} strokeWidth={2} />
              Policies
              {errorCount > 0 && (
                <span
                  style={{
                    fontSize:     9,
                    fontWeight:   800,
                    color:        '#EF4444',
                    background:   '#FEE2E2',
                    borderRadius: 8,
                    padding:      '1px 5px',
                    marginLeft:   2,
                  }}
                >
                  {errorCount}
                </span>
              )}
            </button>
          )
        })()}

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#E5E7EB', flexShrink: 0 }} />

        {/* Infracost button — Architect Mode only */}
        {mode === 'architect' && (
          <button
            onClick={() => { setShowCosts((v) => !v); setShowPolicies(false); setShowScp(false) }}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          5,
              background:   showCosts ? '#EEF2FF' : 'transparent',
              border:       showCosts ? '1px solid #C7D2FE' : '1px solid #E5E7EB',
              borderRadius: 6,
              padding:      '5px 10px',
              fontSize:     12,
              fontWeight:   600,
              color:        showCosts ? '#4338CA' : '#6B7280',
              cursor:       'pointer',
              fontFamily:   '"DM Sans", sans-serif',
              flexShrink:   0,
              transition:   'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!showCosts) {
                e.currentTarget.style.borderColor = '#6366F1'
                e.currentTarget.style.color = '#4338CA'
              }
            }}
            onMouseLeave={(e) => {
              if (!showCosts) {
                e.currentTarget.style.borderColor = '#E5E7EB'
                e.currentTarget.style.color = '#6B7280'
              }
            }}
          >
            <TrendingDown size={12} strokeWidth={2} />
            Costs
          </button>
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#E5E7EB', flexShrink: 0 }} />

        {/* Ask AI button */}
        <button
          onClick={() => setShowAI((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: showAI
              ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
              : 'none',
            border: showAI ? 'none' : '1px solid #C7D2FE',
            borderRadius: 6,
            padding: '5px 11px',
            fontSize: 12,
            fontWeight: 600,
            color: showAI ? '#FFFFFF' : '#6366F1',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!showAI) {
              e.currentTarget.style.background = '#EEF2FF'
              e.currentTarget.style.borderColor = '#6366F1'
            }
          }}
          onMouseLeave={(e) => {
            if (!showAI) {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderColor = '#C7D2FE'
            }
          }}
        >
          <Sparkles size={12} strokeWidth={2} />
          Ask AI
        </button>

        {/* Plan View button — Architect Mode only */}
        {mode === 'architect' && (
          <button
            onClick={() => setPlanMode(!planMode)}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              background:   planMode
                ? 'linear-gradient(135deg, #059669, #047857)'
                : 'transparent',
              border:       planMode ? 'none' : '1px solid #D1FAE5',
              borderRadius: 6,
              padding:      '6px 12px',
              fontSize:     12,
              fontWeight:   600,
              color:        planMode ? '#FFFFFF' : '#059669',
              cursor:       'pointer',
              fontFamily:   '"DM Sans", sans-serif',
              boxShadow:    planMode ? '0 1px 4px rgba(5,150,105,0.4)' : 'none',
              transition:   'all 0.15s',
              flexShrink:   0,
            }}
            onMouseEnter={(e) => {
              if (!planMode) {
                e.currentTarget.style.background = '#ECFDF5'
                e.currentTarget.style.borderColor = '#6EE7B7'
              }
            }}
            onMouseLeave={(e) => {
              if (!planMode) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#D1FAE5'
              }
            }}
          >
            <GitCompareArrows size={13} strokeWidth={2} />
            {planMode ? 'Exit Plan View' : 'Plan View'}
          </button>
        )}

        {/* Generate Terraform button — Architect Mode only */}
        {mode === 'architect' && (
          <button
            onClick={handleGenerateTerraform}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        6,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              border:     'none',
              borderRadius: 6,
              padding:    '6px 12px',
              fontSize:   12,
              fontWeight: 600,
              color:      '#FFFFFF',
              cursor:     'pointer',
              fontFamily: '"DM Sans", sans-serif',
              boxShadow:  '0 1px 4px rgba(99,102,241,0.35)',
              transition: 'opacity 0.15s, box-shadow 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.88'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(99,102,241,0.35)'
            }}
          >
            <Terminal size={13} strokeWidth={2.5} />
            Generate Terraform
          </button>
        )}

        {/* Region badge */}
        <div
          style={{
            fontSize: 11,
            color: '#6B7280',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 5,
            padding: '3px 8px',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 500,
          }}
        >
          us-east-1
        </div>
      </div>

      {/* ── Mode-specific body ──────────────────────────────────────────────── */}
      {mode === 'dream' ? (
        /* Dream Mode: glowing canvas + Infracost + Reality Bridge */
        <DreamMode />
      ) : (
        /* Architect Mode: existing Epic 2 layout, no behaviour change */
        <>
          {/* ── Template picker ──────────────────────────────────────────────── */}
          <TemplatePicker />

          {/* ── Stats bar ────────────────────────────────────────────────────── */}
          <StatsBar />

          {/* ── Sidebar + Canvas + right panel ───────────────────────────────── */}
          {/* InfraSidebar sits to the left; canvas takes the remaining space.
              The config panel overlays absolutely so ReactFlow never repaints
              when the panel opens/closes (avoids the black flash). */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Drag-and-drop service library */}
            <InfraSidebar />

            {/* Canvas area — position: relative so absolute overlays work */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <InfraCanvas />
            <ScaleSlider />

            {/* Right config panel — absolute overlay, no animation to prevent canvas flash */}
            {selectedComponentId && (
              <div
                style={{
                  position: 'absolute',
                  top:      0,
                  right:    0,
                  bottom:   0,
                  width:    300,
                  zIndex:   20,
                }}
              >
                <InfraConfigPanel />
              </div>
            )}

            {/* Left AI panel — slides in from the left over the canvas */}
            <AnimatePresence>
              {showAI && (
                <InfraAIPanel onClose={() => setShowAI(false)} />
              )}
            </AnimatePresence>

            {/* Guardrail status panel — bottom-left overlay */}
            <GuardrailPanel onConfigureScp={() => { setShowScp(true); setShowPolicies(false) }} />

            {/* Policy Manager — slides in from the right over the canvas */}
            <AnimatePresence>
              {showPolicies && (
                <PolicyManager
                  violations={opaViolations}
                  onClose={() => setShowPolicies(false)}
                />
              )}
            </AnimatePresence>

            {/* SCP Importer — slides in from the right over the canvas */}
            <AnimatePresence>
              {showScp && (
                <ScpImporter onClose={() => setShowScp(false)} />
              )}
            </AnimatePresence>

            {/* Infracost panel — slides in from the right over the canvas */}
            <AnimatePresence>
              {showCosts && (
                <InfracostPanel onClose={() => setShowCosts(false)} />
              )}
            </AnimatePresence>

            {/* Plan Apply Bar — floating bottom bar when plan mode is active */}
            <AnimatePresence>
              {planMode && (
                <PlanApplyBar onExit={() => setPlanMode(false)} />
              )}
            </AnimatePresence>
            </div>{/* end canvas area */}
          </div>{/* end sidebar + canvas row */}

          {/* ── Audit Log — collapsible strip below canvas ────────────────────── */}
          <AuditLog />

          {/* ── Terraform HCL panel — slides up above everything ──────────────── */}
          <AnimatePresence>
            {showTerraform && (
              <TerraformPanel onClose={() => setShowTerraform(false)} />
            )}
          </AnimatePresence>

        </>
      )}

      {/* ── Budget Setup modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBudgetSetup && (
          <BudgetSetup onClose={() => setShowBudgetSetup(false)} />
        )}
      </AnimatePresence>

      {/* ── Guardrail block modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {blockModal && (
          <motion.div
            key="block-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            style={{
              position:        'fixed',
              inset:           0,
              background:      'rgba(0,0,0,0.55)',
              zIndex:          300,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              padding:         24,
            }}
            onClick={() => setBlockModal(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{   scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background:   '#FFFFFF',
                borderRadius: 14,
                boxShadow:    '0 8px 40px rgba(239,68,68,0.25)',
                border:       '1px solid #FECACA',
                width:        420,
                overflow:     'hidden',
                fontFamily:   '"DM Sans", sans-serif',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding:      '16px 20px 14px',
                  background:   '#FFF5F5',
                  borderBottom: '1px solid #FEE2E2',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                }}
              >
                <div
                  style={{
                    width:          36,
                    height:         36,
                    borderRadius:   8,
                    background:     '#FEE2E2',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                  }}
                >
                  <AlertOctagon size={18} color="#EF4444" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    Terraform Write Blocked
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                    Blocked by {blockModal.layer}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 20px 20px' }}>
                <p
                  style={{
                    fontSize:   13,
                    color:      '#374151',
                    lineHeight: 1.6,
                    margin:     '0 0 16px',
                  }}
                >
                  {blockModal.reason}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setBlockModal(null); setShowPolicies(true) }}
                    style={{
                      flex:         1,
                      background:   '#F9FAFB',
                      border:       '1px solid #E5E7EB',
                      borderRadius: 7,
                      padding:      '8px 14px',
                      fontSize:     12,
                      fontWeight:   600,
                      color:        '#374151',
                      cursor:       'pointer',
                      fontFamily:   '"DM Sans", sans-serif',
                    }}
                  >
                    View Policies
                  </button>
                  <button
                    onClick={() => setBlockModal(null)}
                    style={{
                      flex:         1,
                      background:   'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      border:       'none',
                      borderRadius: 7,
                      padding:      '8px 14px',
                      fontSize:     12,
                      fontWeight:   700,
                      color:        '#FFFFFF',
                      cursor:       'pointer',
                      fontFamily:   '"DM Sans", sans-serif',
                      boxShadow:    '0 1px 4px rgba(99,102,241,0.35)',
                    }}
                  >
                    <CheckCircle size={12} strokeWidth={2.5} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    OK, I'll fix it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

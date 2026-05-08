/**
 * GuardrailPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact status panel (bottom-left of the canvas) showing live guardrail
 * check results for all enabled layers.
 *
 * Layer 1 — Cost:   budget fill vs. cap + rise threshold
 * Layer 2 — OPA:    policy violation count from opaService
 * Layer 3 — SCP:    live simulation via simulateScp + deriveProposedActions
 *
 * Renders as an absolute overlay inside the canvas area div.
 * A "✗ N violations" badge turns red when any error-level violations exist.
 *
 * Props:
 *   onConfigureScp  — callback to open the ScpImporter panel
 */

import { useMemo } from 'react'
import { ShieldCheck, DollarSign, Shield, Lock, ChevronRight } from 'lucide-react'
import { useInfraStore } from '@/store/infraStore'
import { useGuardrailStore } from '@/store/guardrailStore'
import { runOpaCheck } from '@/utils/opaService'
import { budgetFillPercent, budgetBarColor, formatBudgetLabel } from '@/utils/budgetChecker'
import {
  simulateScp,
  deriveProposedActions,
  type ScpDocument,
} from '@/utils/scpSimulator'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GuardrailPanelProps {
  onConfigureScp?: () => void
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  icon:       React.ReactNode
  label:      string
  status:     'pass' | 'fail' | 'warn' | 'skip'
  detail:     string
  onClick?:   () => void
  clickHint?: string
}

function Row({ icon, label, status, detail, onClick, clickHint }: RowProps) {
  const statusColor = status === 'pass' ? '#22C55E'
    : status === 'fail' ? '#EF4444'
    : status === 'warn' ? '#F59E0B'
    : '#9CA3AF'

  const statusIcon = status === 'pass' ? '✓'
    : status === 'fail' ? '✗'
    : status === 'warn' ? '!'
    : '–'

  return (
    <div
      onClick={onClick}
      title={clickHint}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        7,
        padding:    '4px 0',
        cursor:     onClick ? 'pointer' : 'default',
        borderRadius: 4,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = '#F9FAFB'
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Layer icon */}
      <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0 }}>
        {icon}
      </div>

      {/* Status pill */}
      <span
        style={{
          fontSize:     10,
          fontWeight:   700,
          color:        statusColor,
          background:   statusColor + '18',
          borderRadius: 4,
          padding:      '1px 5px',
          minWidth:     14,
          textAlign:    'center',
          flexShrink:   0,
          fontFamily:   '"DM Sans", sans-serif',
        }}
      >
        {statusIcon}
      </span>

      {/* Label */}
      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', flexShrink: 0, fontFamily: '"DM Sans", sans-serif' }}>
        {label}
      </span>

      {/* Detail */}
      <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif', marginLeft: 'auto', textAlign: 'right', lineHeight: 1.3 }}>
        {detail}
      </span>

      {/* Chevron for clickable rows */}
      {onClick && (
        <ChevronRight size={10} color="#D1D5DB" strokeWidth={2} style={{ flexShrink: 0 }} />
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuardrailPanel({ onConfigureScp }: GuardrailPanelProps) {
  const components     = useInfraStore((s) => s.components)
  const liveStats      = useInfraStore((s) => s.liveStats)
  const budgetConfig   = useGuardrailStore((s) => s.budgetConfig)
  const activePolicies = useGuardrailStore((s) => s.activePolicies)
  const customPolicies = useGuardrailStore((s) => s.customPolicies)
  const scpDocument    = useGuardrailStore((s) => s.scpDocument) as ScpDocument | null

  // ── Layer 1: Cost ───────────────────────────────────────────────────────────
  const fill     = budgetFillPercent(liveStats.costMonthly, budgetConfig.monthlyCap)
  const barColor = budgetBarColor(fill)
  const costStatus: RowProps['status'] = fill >= 90 ? 'fail' : fill >= 70 ? 'warn' : 'pass'
  const costDetail = `${formatBudgetLabel(liveStats.costMonthly)} / ${formatBudgetLabel(budgetConfig.monthlyCap)}/mo (${Math.round(fill)}%)`

  // ── Layer 2: OPA ────────────────────────────────────────────────────────────
  const opaResult = useMemo(
    () => runOpaCheck(components, activePolicies, customPolicies),
    [components, activePolicies, customPolicies],
  )
  const errorCount   = opaResult.violations.filter((v) => v.severity === 'error').length
  const warningCount = opaResult.violations.filter((v) => v.severity === 'warning').length
  const opaStatus: RowProps['status'] = errorCount > 0 ? 'fail' : warningCount > 0 ? 'warn' : 'pass'
  const opaDetail = errorCount > 0
    ? `${errorCount} error${errorCount !== 1 ? 's' : ''}`
    : warningCount > 0
      ? `${warningCount} warning${warningCount !== 1 ? 's' : ''}`
      : `${activePolicies.length} policies pass`

  // ── Layer 3: SCP ────────────────────────────────────────────────────────────
  const scpResult = useMemo(() => {
    if (!scpDocument) return null
    const proposed = deriveProposedActions(components)
    return simulateScp(scpDocument, proposed)
  }, [scpDocument, components])

  const scpStatus: RowProps['status'] = !scpDocument
    ? 'skip'
    : scpResult!.pass ? 'pass' : 'fail'

  const scpDetail = !scpDocument
    ? 'Configure →'
    : scpResult!.pass
      ? `${(scpDocument as ScpDocument).Statement.length} rules · clear`
      : `${scpResult!.denials.length} action${scpResult!.denials.length !== 1 ? 's' : ''} denied`

  // ── Overall ─────────────────────────────────────────────────────────────────
  const allPass   = costStatus === 'pass' && opaStatus === 'pass' && (scpStatus === 'pass' || scpStatus === 'skip')
  const anyFail   = costStatus === 'fail' || opaStatus === 'fail' || scpStatus === 'fail'

  return (
    <div
      style={{
        position:     'absolute',
        bottom:       24,
        left:         24,
        width:        280,
        background:   '#FFFFFF',
        border:       `1px solid ${anyFail ? '#FECACA' : '#E5E7EB'}`,
        borderRadius: 10,
        boxShadow:    anyFail
          ? '0 2px 16px rgba(239,68,68,0.12)'
          : '0 2px 12px rgba(0,0,0,0.07)',
        zIndex:       15,
        overflow:     'hidden',
        transition:   'border-color 0.2s, box-shadow 0.2s',
        fontFamily:   '"DM Sans", sans-serif',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          7,
          padding:      '8px 12px 7px',
          borderBottom: '1px solid #F3F4F6',
          background:   anyFail ? '#FFF5F5' : allPass ? '#F0FDF4' : '#FFFBEB',
        }}
      >
        <ShieldCheck
          size={13}
          color={anyFail ? '#EF4444' : allPass ? '#22C55E' : '#F59E0B'}
          strokeWidth={2.5}
        />
        <span
          style={{
            fontSize:   11,
            fontWeight: 700,
            color:      anyFail ? '#DC2626' : allPass ? '#15803D' : '#92400E',
            flex:       1,
          }}
        >
          Guardrail Check
        </span>
        <span
          style={{
            fontSize:     9,
            fontWeight:   800,
            color:        anyFail ? '#EF4444' : allPass ? '#22C55E' : '#F59E0B',
            background:   anyFail ? '#FEE2E2' : allPass ? '#DCFCE7' : '#FEF3C7',
            borderRadius: 4,
            padding:      '1px 6px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {anyFail ? 'BLOCKED' : allPass ? 'CLEAR' : 'CAUTION'}
        </span>
      </div>

      {/* ── Rows ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '6px 12px 8px', display: 'flex', flexDirection: 'column' }}>
        <Row
          icon={<DollarSign size={11} strokeWidth={2} />}
          label="Cost"
          status={costStatus}
          detail={costDetail}
        />
        {/* Cost bar */}
        <div style={{ marginLeft: 23, marginBottom: 4 }}>
          <div style={{ width: '100%', height: 3, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ width: `${fill}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        </div>

        <Row
          icon={<Shield size={11} strokeWidth={2} />}
          label="OPA"
          status={opaStatus}
          detail={opaDetail}
        />
        <Row
          icon={<Lock size={11} strokeWidth={2} />}
          label="SCP"
          status={scpStatus}
          detail={scpDetail}
          onClick={onConfigureScp}
          clickHint={scpDocument ? 'Edit SCP document' : 'Configure SCP guardrail'}
        />
      </div>

      {/* ── SCP denial list ────────────────────────────────────────────────── */}
      {scpResult && !scpResult.pass && (
        <div style={{ borderTop: '1px solid #FEE2E2', background: '#FFF5F5', padding: '6px 12px' }}>
          {scpResult.denials.slice(0, 2).map((d, i) => (
            <div
              key={i}
              style={{ fontSize: 10, color: '#DC2626', lineHeight: 1.4, marginBottom: i < 1 ? 3 : 0 }}
            >
              • {d.reason}
            </div>
          ))}
          {scpResult.denials.length > 2 && (
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
              + {scpResult.denials.length - 2} more denied action{scpResult.denials.length - 2 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* ── OPA violation list ─────────────────────────────────────────────── */}
      {anyFail && !scpResult?.denials.length && opaResult.violations.filter((v) => v.severity === 'error').length > 0 && (
        <div style={{ borderTop: '1px solid #FEE2E2', background: '#FFF5F5', padding: '6px 12px' }}>
          {opaResult.violations
            .filter((v) => v.severity === 'error')
            .slice(0, 2)
            .map((v, i) => (
              <div
                key={i}
                style={{ fontSize: 10, color: '#DC2626', lineHeight: 1.4, marginBottom: i < 1 ? 3 : 0 }}
              >
                • {v.message}
              </div>
            ))}
          {opaResult.violations.filter((v) => v.severity === 'error').length > 2 && (
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
              + {opaResult.violations.filter((v) => v.severity === 'error').length - 2} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}

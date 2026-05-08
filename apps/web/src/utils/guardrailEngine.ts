/**
 * guardrailEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the full 3-layer guardrail pipeline (Phase 5).
 *
 *   Layer 1 — Cost    runBudgetCheck()
 *   Layer 2 — OPA     runOpaCheck()   → opaResultToGuardrail()
 *   Layer 3 — SCP     simulateScp()   → scpResultToGuardrail()
 *
 * Layers run in sequence; the first failure sets `blockedAt` but all three
 * results are always returned so the UI can show the full picture.
 *
 * The `FullGuardrailResult` is also written to `guardrailStore.auditLog` by the
 * caller (InfraDesigner) so it is not side-effecting itself.
 */

import type { InfraComponent }  from '@/types/infra'
import type { BudgetConfig }    from '@/store/guardrailStore'
import type { GuardrailResult } from './budgetChecker'
import type { ScpDocument }     from './scpSimulator'
import { runBudgetCheck }                           from './budgetChecker'
import { runOpaCheck, opaResultToGuardrail }        from './opaService'
import { simulateScp, deriveProposedActions,
         scpResultToGuardrail }                     from './scpSimulator'

// ─── Result ───────────────────────────────────────────────────────────────────

export interface FullGuardrailResult {
  pass:       boolean
  cost:       GuardrailResult
  opa:        GuardrailResult
  scp:        GuardrailResult
  /** Which layer was the first to block, or undefined if all pass. */
  blockedAt?: 'cost' | 'policy' | 'scp'
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface GuardrailCheckInput {
  components:           InfraComponent[]
  /** The cost currently shown on the canvas (before any proposed changes). */
  currentMonthlyCost:   number
  /** The cost after the proposed operation (usually the same as current for "write" checks). */
  proposedMonthlyCost:  number
  budgetConfig:         BudgetConfig
  activePolicies:       string[]
  customPolicies:       { name: string; rego: string }[]
  scpDocument:          ScpDocument | null
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runFullGuardrailCheck(input: GuardrailCheckInput): FullGuardrailResult {
  const {
    components, currentMonthlyCost, proposedMonthlyCost,
    budgetConfig, activePolicies, customPolicies, scpDocument,
  } = input

  // ── Layer 1: Cost ────────────────────────────────────────────────────────────
  const costResult = runBudgetCheck({
    currentMonthlyCost,
    proposedMonthlyCost,
    config: budgetConfig,
  })

  // ── Layer 2: OPA ─────────────────────────────────────────────────────────────
  const opaCheckResult = runOpaCheck(components, activePolicies, customPolicies)
  const opaResult      = opaResultToGuardrail(opaCheckResult)

  // ── Layer 3: SCP ─────────────────────────────────────────────────────────────
  let scpResult: GuardrailResult
  if (!scpDocument) {
    scpResult = { pass: true, layer: 'scp' }
  } else {
    const proposed = deriveProposedActions(components)
    const simResult = simulateScp(scpDocument, proposed)
    scpResult = scpResultToGuardrail(simResult)
  }

  // ── Aggregate ────────────────────────────────────────────────────────────────
  const blockedAt: FullGuardrailResult['blockedAt'] =
    !costResult.pass ? 'cost'
    : !opaResult.pass ? 'policy'
    : !scpResult.pass ? 'scp'
    : undefined

  return {
    pass: !blockedAt,
    cost: costResult,
    opa:  opaResult,
    scp:  scpResult,
    blockedAt,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compact one-line summary for the audit log. */
export function summariseResult(result: FullGuardrailResult): string {
  if (result.pass) return 'All guardrail checks passed.'
  const layer = result.blockedAt === 'cost'   ? 'Cost'
              : result.blockedAt === 'policy' ? 'OPA Policy'
              : 'SCP'
  const reason =
    result.cost.reason   ||
    result.opa.reason    ||
    result.scp.reason    ||
    'No additional detail.'
  return `Blocked by ${layer}: ${reason}`
}

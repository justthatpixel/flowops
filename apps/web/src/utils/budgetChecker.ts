/**
 * budgetChecker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure-function budget guardrail (Layer 1 of 4).
 *
 * Two checks in sequence:
 *   1. Absolute cap check  — proposed cost > budgetCap × hardBlockAtPercent
 *   2. Rise threshold check — cost increase > riseThresholdPercent
 *
 * Returns a GuardrailResult that the UI and guardrailEngine both consume.
 * No side effects, no async — runs synchronously from the AI suggestion path.
 */

import type { BudgetConfig } from '@/store/guardrailStore'

// ─── Result type (shared across all 4 guardrail layers) ──────────────────────

export type GuardrailLayer = 'cost' | 'policy' | 'scp' | 'write'

export interface GuardrailResult {
  pass:          boolean
  layer:         GuardrailLayer
  reason?:       string           // human-readable block reason
  suggestedFix?: string           // AI-generated or static suggestion
  detail?: {
    currentCost:  number
    proposedCost: number
    risePercent:  number
    budgetCap:    number
    usedPercent:  number          // proposed / cap as 0–100
  }
}

// ─── Budget check ─────────────────────────────────────────────────────────────

export interface BudgetCheckInput {
  currentMonthlyCost:  number   // current estimated cost from live canvas
  proposedMonthlyCost: number   // cost after the proposed change
  config:              BudgetConfig
}

export function runBudgetCheck(input: BudgetCheckInput): GuardrailResult {
  const { currentMonthlyCost, proposedMonthlyCost, config } = input
  const { monthlyCap, riseThresholdPercent, hardBlockAtPercent } = config

  const hardLimit    = monthlyCap * (hardBlockAtPercent / 100)
  const usedPercent  = (proposedMonthlyCost / monthlyCap) * 100
  const risePercent  = currentMonthlyCost > 0
    ? ((proposedMonthlyCost - currentMonthlyCost) / currentMonthlyCost) * 100
    : 0

  const detail = {
    currentCost:  Math.round(currentMonthlyCost),
    proposedCost: Math.round(proposedMonthlyCost),
    risePercent:  Math.round(risePercent * 10) / 10,
    budgetCap:    monthlyCap,
    usedPercent:  Math.round(usedPercent * 10) / 10,
  }

  // ── Check 1: absolute cap ─────────────────────────────────────────────────
  if (proposedMonthlyCost > hardLimit) {
    return {
      pass:  false,
      layer: 'cost',
      reason: `This change would bring estimated cost to $${detail.proposedCost}/mo, `
        + `exceeding your hard limit of $${Math.round(hardLimit)}/mo `
        + `(${hardBlockAtPercent}% of your $${monthlyCap}/mo budget cap).`,
      suggestedFix:
        'Downsize the instance class, reduce replica count, or remove a redundant component.',
      detail,
    }
  }

  // ── Check 2: rise threshold ───────────────────────────────────────────────
  if (risePercent > riseThresholdPercent) {
    return {
      pass:  false,
      layer: 'cost',
      reason: `This change increases estimated cost by ${detail.risePercent}% `
        + `($${detail.currentCost} → $${detail.proposedCost}/mo), `
        + `above your ${riseThresholdPercent}% rise threshold.`,
      suggestedFix:
        'Split this into smaller changes to stay within the rise threshold, '
        + 'or raise the threshold in Guardrail settings.',
      detail,
    }
  }

  return { pass: true, layer: 'cost', detail }
}

// ─── Progress bar helpers ─────────────────────────────────────────────────────

/** Returns a 0–100 fill percentage for the budget bar. */
export function budgetFillPercent(currentCost: number, cap: number): number {
  if (cap <= 0) return 0
  return Math.min(100, (currentCost / cap) * 100)
}

/** Maps fill % to a status colour. */
export function budgetBarColor(fillPercent: number): string {
  if (fillPercent >= 90) return '#EF4444'  // red  — at/over hard block
  if (fillPercent >= 70) return '#F59E0B'  // amber — caution zone
  return '#22C55E'                          // green — healthy
}

/** Formats a USD number for display, e.g. 1234 → "$1.2k", 340 → "$340" */
export function formatBudgetLabel(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`
  return `$${Math.round(usd)}`
}

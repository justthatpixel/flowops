/**
 * guardrailStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store for Epic 3: Architect Mode + Dream Mode state.
 *
 * Phase 1: mode switcher (architect | dream)
 * Phase 2: budget guardrails config
 * Phase 3: OPA policies
 * Phase 4: SCP document
 * Phase 5: audit log entries
 */

import { create } from 'zustand'
import type { ScpDocument } from '@/utils/scpSimulator'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InfraMode = 'architect' | 'dream'

export interface BudgetConfig {
  monthlyCap:            number   // USD / month
  riseThresholdPercent:  number   // e.g. 10 → block if change raises cost >10%
  scope:                 'per_pipeline' | 'global'
  hardBlockAtPercent:    number   // e.g. 90 → hard block at 90% of cap
}

export interface AuditEntry {
  id:           string
  timestamp:    number          // Date.now()
  action:       string
  costResult:   'pass' | 'block' | 'skip'
  opaResult:    'pass' | 'block' | 'skip'
  scpResult:    'pass' | 'block' | 'skip'
  outcome:      'written' | 'blocked'
  blockReason?: string
  aiSuggestion?:string
}

interface GuardrailStore {
  // ── Mode ────────────────────────────────────────────────────────────────
  /** Active designer mode. Always resets to 'architect' on page load. */
  mode: InfraMode

  // ── Budget (Phase 2) ────────────────────────────────────────────────────
  budgetConfig:           BudgetConfig
  budgetConfigured:       boolean   // true once user completes BudgetSetup modal

  // ── Current spend (updated when liveStats change) ───────────────────────
  currentMonthlyCost:     number    // USD/mo from infra canvas liveStats

  // ── OPA policies (Phase 3) ──────────────────────────────────────────────
  activePolicies:         string[]  // list of policy file names that are enabled
  customPolicies:         { name: string; rego: string }[]

  // ── SCP document (Phase 4) ─────────────────────────────────────────────
  scpDocument:            ScpDocument | null

  // ── Audit log (Phase 5) ────────────────────────────────────────────────
  auditLog:               AuditEntry[]

  // ── Actions ─────────────────────────────────────────────────────────────
  setMode:                (mode: InfraMode) => void
  setBudgetConfig:        (config: BudgetConfig) => void
  setCurrentMonthlyCost:  (cost: number) => void
  togglePolicy:           (name: string) => void
  addCustomPolicy:        (name: string, rego: string) => void
  setScpDocument:         (doc: ScpDocument | null) => void
  addAuditEntry:          (entry: AuditEntry) => void
  clearAuditLog:          () => void
}

// ─── Default budget ───────────────────────────────────────────────────────────

const DEFAULT_BUDGET: BudgetConfig = {
  monthlyCap:           500,
  riseThresholdPercent: 10,
  scope:                'per_pipeline',
  hardBlockAtPercent:   90,
}

// ─── Default active policies ──────────────────────────────────────────────────

const DEFAULT_POLICIES = [
  'allowed_resources',
  'allowed_regions',
  'instance_families',
  'required_tags',
  'encryption',
  'public_access',
]

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGuardrailStore = create<GuardrailStore>((set) => ({
  mode:               'architect',
  budgetConfig:       DEFAULT_BUDGET,
  budgetConfigured:   false,
  currentMonthlyCost: 0,
  activePolicies:     DEFAULT_POLICIES,
  customPolicies:     [],
  scpDocument:        null,
  auditLog:           [],

  setMode: (mode) => set({ mode }),

  setBudgetConfig: (config) => set({ budgetConfig: config, budgetConfigured: true }),

  setCurrentMonthlyCost: (cost) => set({ currentMonthlyCost: cost }),

  togglePolicy: (name) =>
    set((state) => ({
      activePolicies: state.activePolicies.includes(name)
        ? state.activePolicies.filter((p) => p !== name)
        : [...state.activePolicies, name],
    })),

  addCustomPolicy: (name, rego) =>
    set((state) => ({
      customPolicies: [...state.customPolicies.filter((p) => p.name !== name), { name, rego }],
    })),

  setScpDocument: (doc) => set({ scpDocument: doc }),

  addAuditEntry: (entry) =>
    set((state) => ({
      auditLog: [entry, ...state.auditLog].slice(0, 200), // keep last 200
    })),

  clearAuditLog: () => set({ auditLog: [] }),
}))

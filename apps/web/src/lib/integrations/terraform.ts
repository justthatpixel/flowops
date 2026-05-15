/**
 * terraform.ts — Terraform Cloud / Enterprise API client
 * ─────────────────────────────────────────────────────────────────────────────
 * Docs: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
 * Plan JSON format: https://developer.hashicorp.com/terraform/internals/json-format
 *
 * Required token: User or Team token with Read + Plan:Read permissions.
 * Create at: https://app.terraform.io/app/settings/tokens
 */

const TF_BASE = 'https://app.terraform.io/api/v2'

// ─── Run / Workspace types ────────────────────────────────────────────────────

export type TFRunStatus =
  | 'pending'
  | 'plan_queued'
  | 'planning'
  | 'planned'
  | 'cost_estimating'
  | 'cost_estimated'
  | 'policy_checking'
  | 'policy_checked'
  | 'confirmed'
  | 'apply_queued'
  | 'applying'
  | 'applied'
  | 'discarded'
  | 'errored'
  | 'canceled'
  | 'force_canceled'
  | 'planned_and_finished'

export interface TFRun {
  id: string
  planId: string | null     // plan relationship ID — needed for JSON output
  status: TFRunStatus
  message: string
  isDestroy: boolean
  createdAt: string
  triggeredBy: string
  resourcesAdded: number
  resourcesChanged: number
  resourcesDestroyed: number
  isConfirmable: boolean
  commitSha: string | null
  commitUrl: string | null
}

export interface TFWorkspace {
  id: string
  name: string
  locked: boolean
  resourceCount: number
  vcsRepoIdentifier: string | null
  terraformVersion: string
  updatedAt: string
}

// ─── Plan JSON types (Terraform plan representation format) ───────────────────

/** Actions in the plan JSON: create / delete / update / no-op / read */
export type TFAction = 'create' | 'delete' | 'update' | 'no-op' | 'read'

export interface TFResourceChange {
  address: string               // "module.vpc.aws_instance.web"
  moduleAddress: string | null  // "module.vpc" or null
  type: string                  // "aws_instance"
  name: string                  // "web"
  providerName: string          // "registry.terraform.io/hashicorp/aws"
  /** Array of actions. Usually 1 element; replace = ["delete","create"] or ["create","delete"] */
  actions: TFAction[]
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  /** Keys whose values are unknown until apply (marked true in the raw JSON) */
  afterUnknown: Record<string, boolean>
  /** Derived: attributes that differ between before and after */
  changedKeys: string[]
}

export interface TFOutputChange {
  name: string
  actions: TFAction[]
  before: unknown
  after: unknown
}

export interface TFPlanResult {
  runId: string
  planId: string
  runStatus: TFRunStatus
  runMessage: string
  createdAt: string
  commitSha: string | null
  isDestroy: boolean
  resourceChanges: TFResourceChange[]
  outputChanges: TFOutputChange[]
  summary: {
    add: number
    change: number
    remove: number
    replace: number
    noOp: number
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class TerraformClient {
  constructor(
    private readonly token: string,
    private readonly organization: string,
  ) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${TF_BASE}${path}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/vnd.api+json',
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Terraform ${res.status}${body ? ': ' + body.slice(0, 200) : ''}`)
    }
    return res.json() as Promise<T>
  }

  // ── Workspace ──────────────────────────────────────────────────────────────

  async getWorkspace(workspaceName: string): Promise<TFWorkspace> {
    const raw = await this.get<any>(
      `/organizations/${this.organization}/workspaces/${workspaceName}`,
    )
    const a = raw.data.attributes
    return {
      id:                raw.data.id,
      name:              a.name,
      locked:            a.locked ?? false,
      resourceCount:     a['resource-count'] ?? 0,
      vcsRepoIdentifier: a['vcs-repo']?.identifier ?? null,
      terraformVersion:  a['terraform-version'] ?? '',
      updatedAt:         a['updated-at'] ?? '',
    }
  }

  // ── Runs ───────────────────────────────────────────────────────────────────

  async getWorkspaceRuns(workspaceId: string, perPage = 10): Promise<TFRun[]> {
    const raw = await this.get<any>(
      `/workspaces/${workspaceId}/runs`,
      { 'page[size]': String(perPage) },
    )
    return (raw.data ?? []).map((r: any) => {
      const a = r.attributes
      return {
        id:                 r.id,
        planId:             r.relationships?.plan?.data?.id ?? null,
        status:             a.status as TFRunStatus,
        message:            a.message ?? '',
        isDestroy:          a['is-destroy'] ?? false,
        createdAt:          a['created-at'] ?? '',
        triggeredBy:        a.source ?? 'api',
        resourcesAdded:     a['resource-additions']    ?? 0,
        resourcesChanged:   a['resource-changes']      ?? 0,
        resourcesDestroyed: a['resource-destructions'] ?? 0,
        isConfirmable:      a.actions?.['is-confirmable'] ?? false,
        commitSha:          r.relationships?.['configuration-version']?.data?.id ?? null,
        commitUrl:          null,
      }
    })
  }

  // ── Plan JSON output ────────────────────────────────────────────────────────

  /**
   * Fetch the structured plan JSON for a given plan ID.
   * TFC returns a 307 redirect to a signed S3 URL; fetch follows it automatically.
   * Requires: plan must be in "finished" state.
   */
  async getPlanJson(planId: string): Promise<any> {
    // First try the direct JSON output endpoint
    const res = await fetch(`${TF_BASE}/plans/${planId}/json-output`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/vnd.api+json',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      throw new Error(`Plan JSON fetch failed: ${res.status}`)
    }
    return res.json()
  }

  /**
   * Full flow: workspace name → latest actionable run → plan JSON → parsed diff.
   * Falls back gracefully if the plan isn't available yet.
   */
  async getLatestPlan(workspaceName: string): Promise<TFPlanResult> {
    const workspace = await this.getWorkspace(workspaceName)
    const runs      = await this.getWorkspaceRuns(workspace.id, 5)

    // Find the most recent run that has a plan (skip purely pending runs)
    const run = runs.find((r) => r.planId !== null) ?? runs[0]
    if (!run) throw new Error('No runs found for workspace')
    if (!run.planId) throw new Error('Run has no associated plan')

    // Runs that are still planning don't have a JSON output yet
    const hasJson = [
      'planned', 'planned_and_finished', 'cost_estimated', 'cost_estimating',
      'policy_checking', 'policy_checked', 'confirmed',
      'apply_queued', 'applying', 'applied',
    ].includes(run.status)

    if (!hasJson) {
      // Return a skeleton with the counts from run attributes instead
      return {
        runId:      run.id,
        planId:     run.planId,
        runStatus:  run.status,
        runMessage: run.message,
        createdAt:  run.createdAt,
        commitSha:  run.commitSha,
        isDestroy:  run.isDestroy,
        resourceChanges: [],
        outputChanges:   [],
        summary: {
          add:     0,
          change:  0,
          remove:  0,
          replace: 0,
          noOp:    0,
        },
      }
    }

    const planJson = await this.getPlanJson(run.planId)
    return parsePlanJson(run, planJson)
  }

  // ── Convenience ────────────────────────────────────────────────────────────

  async getWorkspaceAndRuns(workspaceName: string, perPage = 10) {
    const workspace = await this.getWorkspace(workspaceName)
    const runs      = await this.getWorkspaceRuns(workspace.id, perPage)
    return { workspace, runs }
  }
}

// ─── Plan JSON parser ─────────────────────────────────────────────────────────

function parsePlanJson(run: TFRun, json: any): TFPlanResult {
  const rawChanges: any[] = json.resource_changes ?? []

  const resourceChanges: TFResourceChange[] = rawChanges
    .filter((rc) => {
      // Skip no-op changes
      const actions: TFAction[] = rc.change?.actions ?? []
      return !(actions.length === 1 && actions[0] === 'no-op')
    })
    .map((rc) => {
      const actions: TFAction[] = rc.change?.actions ?? []
      const before = rc.change?.before ?? null
      const after  = rc.change?.after  ?? null
      const afterUnknown: Record<string, boolean> = rc.change?.after_unknown ?? {}

      // Compute which keys actually changed
      const changedKeys = computeChangedKeys(before, after, afterUnknown)

      return {
        address:      rc.address,
        moduleAddress: rc.module_address ?? null,
        type:         rc.type,
        name:         rc.name,
        providerName: rc.provider_name ?? '',
        actions,
        before,
        after,
        afterUnknown,
        changedKeys,
      }
    })

  // Summary
  let add = 0, change = 0, remove = 0, replace = 0, noOp = 0
  for (const rc of rawChanges) {
    const actions: TFAction[] = rc.change?.actions ?? []
    if (actions.includes('create') && actions.includes('delete')) replace++
    else if (actions[0] === 'create')  add++
    else if (actions[0] === 'delete')  remove++
    else if (actions[0] === 'update')  change++
    else if (actions[0] === 'no-op')   noOp++
  }

  // Output changes
  const outputChanges: TFOutputChange[] = Object.entries(json.output_changes ?? {}).map(
    ([name, oc]: [string, any]) => ({
      name,
      actions: oc.actions ?? [],
      before:  oc.change?.before ?? null,
      after:   oc.change?.after  ?? null,
    }),
  )

  return {
    runId:      run.id,
    planId:     run.planId!,
    runStatus:  run.status,
    runMessage: run.message,
    createdAt:  run.createdAt,
    commitSha:  run.commitSha,
    isDestroy:  run.isDestroy,
    resourceChanges,
    outputChanges,
    summary: { add, change, remove, replace, noOp },
  }
}

/** Compute attribute keys that differ between before and after */
function computeChangedKeys(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  afterUnknown: Record<string, boolean>,
): string[] {
  if (!before && !after) return []
  if (!before) return Object.keys(after!).filter((k) => !isNoisyKey(k)).slice(0, 12)
  if (!after)  return Object.keys(before).filter((k) => !isNoisyKey(k)).slice(0, 12)

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changed: string[] = []
  for (const k of allKeys) {
    if (isNoisyKey(k)) continue
    const bv = before[k]
    const av = afterUnknown[k] ? '(known after apply)' : after[k]
    if (JSON.stringify(bv) !== JSON.stringify(av)) changed.push(k)
  }
  return changed.slice(0, 15)
}

/** Skip computed / internal Terraform attributes that clutter the diff */
function isNoisyKey(k: string): boolean {
  return /^(id|arn|timeouts|tags_all|owner_id|requester_managed|default_|self_link)/.test(k)
    || k.endsWith('_id') && k !== 'vpc_id' && k !== 'subnet_id' && k !== 'security_group_id'
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function tfActionLabel(actions: TFAction[]): string {
  if (actions.includes('create') && actions.includes('delete')) return 'replace'
  return actions[0] ?? 'no-op'
}

export function tfActionSymbol(actions: TFAction[]): string {
  const a = tfActionLabel(actions)
  return a === 'create' ? '+' : a === 'delete' ? '-' : a === 'update' ? '~' : a === 'replace' ? '±' : ' '
}

export const TF_ACTION_COLOR: Record<string, string> = {
  create:  '#22C55E',
  delete:  '#EF4444',
  update:  '#F59E0B',
  replace: '#F97316',
  'no-op': '#9CA3AF',
  read:    '#6B7280',
}

export const TF_ACTION_BG: Record<string, string> = {
  create:  '#F0FDF4',
  delete:  '#FEF2F2',
  update:  '#FFFBEB',
  replace: '#FFF7ED',
  'no-op': '#F3F4F6',
  read:    '#F3F4F6',
}

export function fmtTFValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (v === '(known after apply)') return '(known after apply)'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'string') {
    if (v.length > 40) return '"' + v.slice(0, 37) + '…"'
    return '"' + v + '"'
  }
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return `[${v.length}]`
  if (typeof v === 'object') return '{…}'
  return String(v)
}

const RUN_STATUS_LABEL: Record<TFRunStatus, string> = {
  pending:              'Pending',
  plan_queued:          'Plan Queued',
  planning:             'Planning…',
  planned:              'Planned',
  cost_estimating:      'Cost Est.',
  cost_estimated:       'Cost Est.',
  policy_checking:      'Policy Check',
  policy_checked:       'Policy OK',
  confirmed:            'Confirmed',
  apply_queued:         'Apply Queued',
  applying:             'Applying…',
  applied:              'Applied',
  discarded:            'Discarded',
  errored:              'Error',
  canceled:             'Canceled',
  force_canceled:       'Force Canceled',
  planned_and_finished: 'No Changes',
}

export function tfStatusLabel(s: TFRunStatus): string {
  return RUN_STATUS_LABEL[s] ?? s
}

export function tfStatusColor(s: TFRunStatus): string {
  if (['applied', 'planned_and_finished', 'policy_checked'].includes(s)) return '#22C55E'
  if (['errored', 'canceled', 'force_canceled'].includes(s))              return '#EF4444'
  if (['planning', 'applying', 'plan_queued', 'apply_queued'].includes(s)) return '#3B82F6'
  if (['planned', 'confirmed', 'cost_estimated'].includes(s))             return '#F59E0B'
  return '#6B7280'
}

export function tfRelative(iso: string): string {
  const diff = Date.now() - Date.parse(iso)
  const min  = Math.floor(diff / 60_000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

/** Short resource address — drops module prefix for display */
export function shortAddress(address: string): string {
  const parts = address.split('.')
  if (parts.length > 2) return parts.slice(-2).join('.')
  return address
}

/** Provider short name: "registry.terraform.io/hashicorp/aws" → "aws" */
export function shortProvider(providerName: string): string {
  return providerName.split('/').pop() ?? providerName
}

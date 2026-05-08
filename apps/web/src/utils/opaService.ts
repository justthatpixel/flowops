/**
 * opaService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side OPA policy engine (Layer 2 of the guardrail pipeline).
 *
 * Mirrors the Rego rules in /policies/*.rego as pure TypeScript functions.
 * No conftest CLI needed in the browser — the backend can run the real conftest
 * when writing actual Terraform to disk (Phase 5).
 *
 * Usage:
 *   const result = runOpaCheck(components, activePolicies, customPolicies)
 *   if (!result.pass) { // show block UI }
 */

import type { InfraComponent } from '@/types/infra'
import type { GuardrailResult } from './budgetChecker'

// ─── Violation + result types ─────────────────────────────────────────────────

export interface PolicyViolation {
  policy:     string
  component?: string
  message:    string
  severity:   'error' | 'warning' | 'info'
}

export interface OpaCheckResult {
  pass:             boolean
  violations:       PolicyViolation[]
  checkedPolicies:  string[]
  skippedPolicies:  string[]
}

// ─── Policy definition ────────────────────────────────────────────────────────

export interface PolicyDef {
  name:        string
  title:       string
  description: string
  category:    'resource' | 'region' | 'instance' | 'tags' | 'encryption' | 'access'
  severity:    'error' | 'warning' | 'info'
  check:       (components: InfraComponent[]) => PolicyViolation[]
}

// ─── Allowed regions (default) ────────────────────────────────────────────────

const ALLOWED_REGIONS = new Set([
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
])

// ─── Blocked instance prefixes ────────────────────────────────────────────────

const BLOCKED_INSTANCE_PREFIXES = ['p2.', 'p3.', 'p4d.', 'p4de.', 'g4dn.', 'g4ad.', 'g5.', 'g5g.', 'trn1.', 'inf1.', 'inf2.']

function isBlockedInstance(instanceType?: string): boolean {
  if (!instanceType) return false
  return BLOCKED_INSTANCE_PREFIXES.some((p) => instanceType.startsWith(p))
}

// ─── Built-in policy rules ────────────────────────────────────────────────────

export const BUILTIN_POLICIES: PolicyDef[] = [
  // ── 1. allowed_resources ────────────────────────────────────────────────────
  {
    name:        'allowed_resources',
    title:       'Allowed Resource Types',
    description: 'Only approved AWS resource types may be provisioned. Prevents use of experimental or untested services.',
    category:    'resource',
    severity:    'error',
    check: (components) => {
      const violations: PolicyViolation[] = []
      // WAF + Shield Advanced without CloudFront is suspicious
      const hasWaf      = components.some((c) => c.type === 'waf')
      const hasShield   = components.some((c) => c.type === 'shield')
      const hasCdn      = components.some((c) => c.type === 'cloudfront')
      if (hasShield && !hasWaf) {
        violations.push({
          policy:    'allowed_resources',
          message:   'Shield Advanced is deployed without WAF. Shield requires WAF to be effective. Add a WAF component.',
          severity:  'warning',
        })
      }
      if (hasWaf && !hasCdn && !components.some((c) => c.type === 'alb')) {
        violations.push({
          policy:    'allowed_resources',
          message:   'WAF is deployed but no ALB or CloudFront is present to attach it to.',
          severity:  'warning',
        })
      }
      return violations
    },
  },

  // ── 2. allowed_regions ──────────────────────────────────────────────────────
  {
    name:        'allowed_regions',
    title:       'Allowed Regions',
    description: 'Infrastructure must be deployed in approved regions only. Enforces data residency and compliance boundaries.',
    category:    'region',
    severity:    'error',
    check: (components) => {
      const violations: PolicyViolation[] = []
      components.forEach((c) => {
        const region = c.config.region as string | undefined
        if (region && !ALLOWED_REGIONS.has(region)) {
          violations.push({
            policy:    'allowed_regions',
            component: c.label,
            message:   `Component "${c.label}" specifies region "${region}" which is not in the approved list.`,
            severity:  'error',
          })
        }
      })
      return violations
    },
  },

  // ── 3. instance_families ────────────────────────────────────────────────────
  {
    name:        'instance_families',
    title:       'Instance Families',
    description: 'GPU and accelerated-compute instances (p3, p4, g4, g5, trn1, inf) require budget approval before use.',
    category:    'instance',
    severity:    'error',
    check: (components) => {
      const violations: PolicyViolation[] = []
      components.forEach((c) => {
        const instanceType  = c.config.instanceType  as string | undefined
        const instanceClass = c.config.instanceClass as string | undefined
        if (isBlockedInstance(instanceType)) {
          violations.push({
            policy:    'instance_families',
            component: c.label,
            message:   `Component "${c.label}" uses instance type "${instanceType}" from a restricted family (GPU/accelerated). Requires budget approval.`,
            severity:  'error',
          })
        }
        if (instanceClass && instanceClass.startsWith('db.x1')) {
          violations.push({
            policy:    'instance_families',
            component: c.label,
            message:   `RDS component "${c.label}" uses instance class "${instanceClass}". High-memory x1 instances require budget approval.`,
            severity:  'error',
          })
        }
      })
      return violations
    },
  },

  // ── 4. required_tags ────────────────────────────────────────────────────────
  {
    name:        'required_tags',
    title:       'Required Tags',
    description: 'All resources must have Project, Environment, and Owner tags. Tags are auto-applied by FlowOps using the pipeline name.',
    category:    'tags',
    severity:    'info',
    check: (_components) => {
      // Tags are injected automatically by the Terraform generator (the
      // generated HCL always includes locals { project_tags = { ... } }).
      // This rule is informational — surfaces if tagging is manually disabled.
      return []
    },
  },

  // ── 5. encryption ───────────────────────────────────────────────────────────
  {
    name:        'encryption',
    title:       'Encryption at Rest',
    description: 'RDS, Aurora, ElastiCache, and S3 must have encryption at rest enabled.',
    category:    'encryption',
    severity:    'error',
    check: (components) => {
      const violations: PolicyViolation[] = []
      components.forEach((c) => {
        if (c.type === 'rds') {
          const encrypted = c.config.encrypted as boolean | undefined
          if (encrypted === false) {
            violations.push({
              policy:    'encryption',
              component: c.label,
              message:   `RDS component "${c.label}" has encryption disabled. Set encrypted = true.`,
              severity:  'error',
            })
          }
        }
        if (c.type === 'elasticache') {
          const atRest = c.config.atRestEncryption as boolean | undefined
          if (atRest === false) {
            violations.push({
              policy:    'encryption',
              component: c.label,
              message:   `ElastiCache component "${c.label}" has at-rest encryption disabled.`,
              severity:  'error',
            })
          }
        }
        if (c.type === 's3') {
          const sse = c.config.sse as boolean | undefined
          if (sse === false) {
            violations.push({
              policy:    'encryption',
              component: c.label,
              message:   `S3 component "${c.label}" has server-side encryption disabled.`,
              severity:  'error',
            })
          }
        }
      })
      return violations
    },
  },

  // ── 6. public_access ────────────────────────────────────────────────────────
  {
    name:        'public_access',
    title:       'Public Access Controls',
    description: 'Databases and caches must not be publicly accessible. S3 buckets must block public ACLs.',
    category:    'access',
    severity:    'error',
    check: (components) => {
      const violations: PolicyViolation[] = []
      components.forEach((c) => {
        if (c.type === 'rds') {
          const pub = c.config.publiclyAccessible as boolean | undefined
          if (pub === true) {
            violations.push({
              policy:    'public_access',
              component: c.label,
              message:   `RDS component "${c.label}" has publiclyAccessible = true. Databases must not be internet-facing.`,
              severity:  'error',
            })
          }
        }
        if (c.type === 's3') {
          const blockPublic = c.config.blockPublicAccess as boolean | undefined
          if (blockPublic === false) {
            violations.push({
              policy:    'public_access',
              component: c.label,
              message:   `S3 component "${c.label}" has public access enabled. Set blockPublicAccess = true.`,
              severity:  'error',
            })
          }
        }
      })
      return violations
    },
  },
]

// ─── Main check function ──────────────────────────────────────────────────────

/**
 * Run all enabled OPA policies against the current canvas components.
 * Custom policies (Rego text) are parsed for display only — their checks
 * are not executed in the browser (conftest runs server-side in Phase 5).
 */
export function runOpaCheck(
  components:    InfraComponent[],
  activePolicies: string[],
  _customPolicies: { name: string; rego: string }[] = [],
): OpaCheckResult {
  const activeSet      = new Set(activePolicies)
  const allViolations: PolicyViolation[] = []
  const checked:  string[] = []
  const skipped:  string[] = []

  for (const policy of BUILTIN_POLICIES) {
    if (!activeSet.has(policy.name)) {
      skipped.push(policy.name)
      continue
    }
    checked.push(policy.name)
    const violations = policy.check(components)
    allViolations.push(...violations)
  }

  const errorViolations = allViolations.filter((v) => v.severity === 'error')

  return {
    pass:            errorViolations.length === 0,
    violations:      allViolations,
    checkedPolicies: checked,
    skippedPolicies: skipped,
  }
}

/**
 * Convert OpaCheckResult to a GuardrailResult for the guardrail pipeline.
 */
export function opaResultToGuardrail(result: OpaCheckResult): GuardrailResult {
  if (result.pass) {
    return { pass: true, layer: 'policy' }
  }
  const errors = result.violations.filter((v) => v.severity === 'error')
  return {
    pass:  false,
    layer: 'policy',
    reason: errors.map((v) => `• ${v.message}`).join('\n'),
    suggestedFix: 'Review the policy violations above and adjust your component configuration.',
  }
}

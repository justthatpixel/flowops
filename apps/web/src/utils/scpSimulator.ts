/**
 * scpSimulator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side SCP simulation engine (Layer 3 of the guardrail pipeline).
 *
 * Parses an AWS Organisation Service Control Policy (SCP) document and
 * evaluates whether a set of proposed infrastructure actions would be denied.
 * No AWS API calls are made — this is a pure offline simulation.
 *
 * SCP evaluation model (simplified IAM policy logic):
 *   1. An explicit Deny always wins.
 *   2. An action is allowed only if it is not matched by any Deny statement.
 *   3. Condition keys checked: aws:RequestedRegion, ec2:InstanceType (subset).
 *
 * Usage:
 *   const result = simulateScp(scpDocument, proposedActions)
 *   if (!result.pass) { // show BLOCKED UI }
 */

import type { GuardrailResult } from './budgetChecker'
import type { InfraComponent } from '@/types/infra'

// ─── SCP document types (subset of AWS IAM policy schema) ─────────────────────

export interface ScpStatement {
  Sid?:       string
  Effect:     'Allow' | 'Deny'
  Action:     string | string[]
  Resource:   string | string[]
  Condition?: Record<string, Record<string, string | string[]>>
}

export interface ScpDocument {
  Version?:   string
  Statement:  ScpStatement[]
}

// ─── Proposed action (derived from InfraComponent) ───────────────────────────

export interface ProposedAction {
  action:    string   // e.g. "ec2:RunInstances"
  resource:  string   // e.g. "arn:aws:ec2:*:*:instance/*"
  context?:  {        // condition context values
    region?:       string
    instanceType?: string
    service?:      string
  }
  componentLabel?: string
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface ScpDenial {
  action:         string
  componentLabel: string
  reason:         string
  statementSid?:  string
}

export interface ScpSimResult {
  pass:    boolean
  denials: ScpDenial[]
}

// ─── Wildcard matcher ─────────────────────────────────────────────────────────

/** Returns true if `pattern` (which may contain * or ?) matches `value`. */
function wildcardMatch(pattern: string, value: string): boolean {
  const p = pattern.toLowerCase()
  const v = value.toLowerCase()
  if (p === '*') return true
  // Convert to regex: escape special chars, replace * → .*, ? → .
  const escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`).test(v)
}

function matchesAction(pattern: string | string[], action: string): boolean {
  const patterns = Array.isArray(pattern) ? pattern : [pattern]
  return patterns.some((p) => wildcardMatch(p, action))
}

function matchesResource(pattern: string | string[], resource: string): boolean {
  const patterns = Array.isArray(pattern) ? pattern : [pattern]
  return patterns.some((p) => wildcardMatch(p, resource))
}

// ─── Condition evaluation ─────────────────────────────────────────────────────

function evaluateCondition(
  condition: Record<string, Record<string, string | string[]>> | undefined,
  context:   ProposedAction['context'],
): boolean {
  if (!condition || !context) return true   // no condition → always matches

  for (const [operator, keyMap] of Object.entries(condition)) {
    const op = operator.toLowerCase()

    for (const [key, value] of Object.entries(keyMap)) {
      const keyLower = key.toLowerCase()
      const values   = Array.isArray(value) ? value : [value]

      let contextValue: string | undefined
      if (keyLower === 'aws:requestedregion') contextValue = context.region
      else if (keyLower === 'ec2:instancetype') contextValue = context.instanceType
      else continue  // unknown condition key — skip (assume no match)

      if (!contextValue) continue

      if (op === 'stringequals' || op === 'stringequalsignorecase') {
        const matched = values.some((v) =>
          v.toLowerCase() === contextValue!.toLowerCase()
        )
        // StringNotEquals is the inverse
        if (op === 'stringequals' && !matched) return false
      } else if (op === 'stringnotequals' || op === 'stringnotequalsignorecase') {
        const matched = values.some((v) =>
          v.toLowerCase() === contextValue!.toLowerCase()
        )
        if (matched) return false  // condition denies this context value
      } else if (op === 'stringlike') {
        const matched = values.some((v) => wildcardMatch(v, contextValue!))
        if (!matched) return false
      } else if (op === 'stringnotlike') {
        const matched = values.some((v) => wildcardMatch(v, contextValue!))
        if (matched) return false
      }
      // Other operators (ArnLike, IpAddress, etc.) — skip, assume no match
    }
  }

  return true
}

// ─── Core simulation ──────────────────────────────────────────────────────────

export function simulateScp(
  scpDoc:   ScpDocument,
  proposed: ProposedAction[],
): ScpSimResult {
  const denials: ScpDenial[] = []

  const denyStatements = scpDoc.Statement.filter((s) => s.Effect === 'Deny')

  for (const action of proposed) {
    for (const stmt of denyStatements) {
      if (!matchesAction(stmt.Action, action.action)) continue
      if (!matchesResource(stmt.Resource, action.resource)) continue
      if (!evaluateCondition(stmt.Condition, action.context)) continue

      // This action is denied by this statement
      denials.push({
        action:         action.action,
        componentLabel: action.componentLabel ?? action.action,
        reason:         `Action "${action.action}" is denied by SCP statement` +
                        (stmt.Sid ? ` "${stmt.Sid}"` : '') + '.',
        statementSid:   stmt.Sid,
      })
      break  // one denial is enough for this action
    }
  }

  return { pass: denials.length === 0, denials }
}

// ─── Derive proposed actions from InfraComponent[] ───────────────────────────

/** Maps an AWS service type to the IAM actions Terraform would call. */
export function deriveProposedActions(components: InfraComponent[]): ProposedAction[] {
  const actions: ProposedAction[] = []

  for (const c of components) {
    const region = (c.config.region as string | undefined) ?? 'us-east-1'

    switch (c.type) {
      case 'ecs':
        actions.push(
          { action: 'ecs:CreateCluster',        resource: 'arn:aws:ecs:*:*:cluster/*',    context: { region }, componentLabel: c.label },
          { action: 'ecs:CreateService',         resource: 'arn:aws:ecs:*:*:service/*',    context: { region }, componentLabel: c.label },
          { action: 'ecs:RegisterTaskDefinition', resource: '*',                           context: { region }, componentLabel: c.label },
        )
        break
      case 'rds':
        actions.push(
          { action: 'rds:CreateDBInstance',     resource: 'arn:aws:rds:*:*:db:*',         context: { region }, componentLabel: c.label },
        )
        break
      case 'elasticache':
        actions.push(
          { action: 'elasticache:CreateCacheCluster', resource: '*',                      context: { region }, componentLabel: c.label },
        )
        break
      case 'alb':
        actions.push(
          { action: 'elasticloadbalancing:CreateLoadBalancer', resource: '*',             context: { region }, componentLabel: c.label },
        )
        break
      case 'cloudfront':
        actions.push(
          { action: 'cloudfront:CreateDistribution', resource: '*',                      context: { region: 'us-east-1' }, componentLabel: c.label },
        )
        break
      case 'lambda':
        actions.push(
          { action: 'lambda:CreateFunction',    resource: 'arn:aws:lambda:*:*:function:*', context: { region }, componentLabel: c.label },
        )
        break
      case 's3':
        actions.push(
          { action: 's3:CreateBucket',          resource: 'arn:aws:s3:::*',               context: { region }, componentLabel: c.label },
        )
        break
      case 'sqs':
        actions.push(
          { action: 'sqs:CreateQueue',          resource: 'arn:aws:sqs:*:*:*',            context: { region }, componentLabel: c.label },
        )
        break
      case 'dynamodb':
        actions.push(
          { action: 'dynamodb:CreateTable',     resource: 'arn:aws:dynamodb:*:*:table/*', context: { region }, componentLabel: c.label },
        )
        break
      case 'nat_gateway':
        actions.push(
          { action: 'ec2:CreateNatGateway',     resource: '*',                            context: { region }, componentLabel: c.label },
        )
        break
      case 'waf':
        actions.push(
          { action: 'wafv2:CreateWebACL',       resource: '*',                            context: { region }, componentLabel: c.label },
        )
        break
      case 'api_gateway':
        actions.push(
          { action: 'apigateway:POST',          resource: 'arn:aws:apigateway:*::/*',     context: { region }, componentLabel: c.label },
        )
        break
      case 'route53':
        actions.push(
          { action: 'route53:CreateHostedZone', resource: '*',                            context: { region: 'us-east-1' }, componentLabel: c.label },
        )
        break
      case 'shield':
        actions.push(
          { action: 'shield:CreateProtection',  resource: '*',                            context: { region: 'us-east-1' }, componentLabel: c.label },
        )
        break
    }
  }

  return actions
}

// ─── Convert to GuardrailResult ───────────────────────────────────────────────

export function scpResultToGuardrail(result: ScpSimResult): GuardrailResult {
  if (result.pass) return { pass: true, layer: 'scp' }
  return {
    pass:  false,
    layer: 'scp',
    reason: `${result.denials.length} action(s) would be denied by your SCPs:\n` +
            result.denials.map((d) => `• ${d.reason}`).join('\n'),
    suggestedFix: 'These actions are blocked at the AWS Organisation level. Update your SCPs or remove the affected components.',
  }
}

// ─── Parse + validate an SCP JSON string ─────────────────────────────────────

export function parseScpDocument(json: string): { doc: ScpDocument; error?: never } | { doc?: never; error: string } {
  try {
    const parsed = JSON.parse(json) as unknown

    // Handle both top-level policy (has Statement directly) and wrapped format
    const candidate = parsed as Record<string, unknown>
    const doc: ScpDocument = Array.isArray(candidate.Statement)
      ? (candidate as unknown as ScpDocument)
      : (candidate as { Policy?: { Statement: ScpStatement[] } }).Policy
        ? { Statement: (candidate as { Policy: { Statement: ScpStatement[] } }).Policy.Statement }
        : (() => { throw new Error('No Statement array found') })()

    if (!Array.isArray(doc.Statement)) throw new Error('Statement must be an array')

    for (const stmt of doc.Statement) {
      if (stmt.Effect !== 'Allow' && stmt.Effect !== 'Deny') {
        throw new Error(`Invalid Effect "${stmt.Effect}" — must be Allow or Deny`)
      }
      if (!stmt.Action)   throw new Error('Statement missing Action')
      if (!stmt.Resource) throw new Error('Statement missing Resource')
    }

    return { doc }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── Well-known SCP examples (shown in ScpImporter as quick-load) ─────────────

export const SCP_EXAMPLES: { name: string; description: string; json: string }[] = [
  {
    name: 'DenyRegionsOutsideEU',
    description: 'Block any API call outside EU regions',
    json: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Sid:      'DenyRegionsOutsideEU',
        Effect:   'Deny',
        Action:   '*',
        Resource: '*',
        Condition: {
          StringNotLike: {
            'aws:RequestedRegion': ['eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1'],
          },
        },
      }],
    }, null, 2),
  },
  {
    name: 'DenyGPUInstances',
    description: 'Block GPU and accelerated compute instances',
    json: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Sid:      'DenyGPUInstances',
        Effect:   'Deny',
        Action:   ['ec2:RunInstances'],
        Resource: 'arn:aws:ec2:*:*:instance/*',
        Condition: {
          StringLike: {
            'ec2:InstanceType': ['p2.*', 'p3.*', 'p4d.*', 'g4dn.*', 'g5.*', 'trn1.*', 'inf1.*', 'inf2.*'],
          },
        },
      }],
    }, null, 2),
  },
  {
    name: 'DenyRootUser',
    description: 'Block all actions by the root account',
    json: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Sid:      'DenyRootUser',
        Effect:   'Deny',
        Action:   '*',
        Resource: '*',
        Condition: {
          StringEquals: { 'aws:PrincipalType': 'Root' },
        },
      }],
    }, null, 2),
  },
  {
    name: 'RequireEncryption',
    description: 'Deny unencrypted EBS volumes and S3 uploads',
    json: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid:      'DenyUnencryptedEBS',
          Effect:   'Deny',
          Action:   'ec2:CreateVolume',
          Resource: '*',
          Condition: {
            StringNotLike: { 'ec2:Encrypted': 'true' },
          },
        },
        {
          Sid:      'DenyUnencryptedS3PutObject',
          Effect:   'Deny',
          Action:   's3:PutObject',
          Resource: '*',
          Condition: {
            StringNotEquals: { 's3:x-amz-server-side-encryption': 'aws:kms' },
          },
        },
      ],
    }, null, 2),
  },
]

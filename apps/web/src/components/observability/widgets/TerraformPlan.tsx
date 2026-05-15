/**
 * TerraformPlan.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full split-pane Terraform plan diff — Production State (left) vs Proposed
 * Changes (right), with a Terraform Apply button and inline confirmation.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Header: workspace · commit · status · summary pills         │
 *   ├──────────────────────────┬───────────────────────────────────┤
 *   │  PRODUCTION STATE        │  PROPOSED CHANGES                 │
 *   │  (what's deployed now)   │  (after terraform apply)          │
 *   ├──────────────────────────┼───────────────────────────────────┤
 *   │  resource rows — left shows before, right shows after        │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  [⚠ 7 resource changes]          [Cancel]  [🚀 Apply Now]   │
 *   └──────────────────────────────────────────────────────────────┘
 */

import { useState } from 'react'
import {
  Cloud, ChevronDown, ChevronRight, RefreshCw,
  Play, AlertTriangle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useTerraformPlan } from '@/hooks/useTerraform'
import {
  tfActionLabel,
  tfActionSymbol,
  tfStatusLabel,
  tfStatusColor,
  tfRelative,
  shortAddress,
  fmtTFValue,
  TF_ACTION_COLOR,
  TF_ACTION_BG,
  type TFResourceChange,
  type TFPlanResult,
} from '@/lib/integrations/terraform'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplyState = 'idle' | 'confirming' | 'applying' | 'applied' | 'failed'

// ─── Demo plan (production-realistic) ────────────────────────────────────────

const DEMO_PLAN: TFPlanResult = {
  runId: 'run-demo', planId: 'plan-demo', runStatus: 'planned',
  runMessage: 'prod infra upgrade v2.4.1',
  createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  commitSha: 'a3f9c12', isDestroy: false,
  summary: { add: 3, change: 2, remove: 1, replace: 1, noOp: 0 },
  outputChanges: [
    { name: 'api_endpoint',   actions: ['update'], before: 'https://old.api.example.com',    after: 'https://api.example.com' },
    { name: 'alb_dns_name',   actions: ['update'], before: 'old-alb.us-east-1.elb.amazonaws.com', after: 'new-alb.us-east-1.elb.amazonaws.com' },
  ],
  resourceChanges: [
    {
      address: 'aws_instance.api_server', moduleAddress: null, type: 'aws_instance', name: 'api_server',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['create'],
      before: null,
      after: { ami: 'ami-0c55b159cbfafe1f0', instance_type: 't3.medium', key_name: 'prod-key', subnet_id: 'subnet-0a1b2c3d' },
      afterUnknown: { id: true, public_ip: true, private_ip: true },
      changedKeys: ['ami', 'instance_type', 'key_name', 'subnet_id'],
    },
    {
      address: 'aws_db_instance.postgres', moduleAddress: null, type: 'aws_db_instance', name: 'postgres',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['update'],
      before: { engine_version: '14.5', instance_class: 'db.t3.micro', allocated_storage: 20, multi_az: false, backup_retention: 3 },
      after:  { engine_version: '15.4', instance_class: 'db.t3.small', allocated_storage: 50, multi_az: true,  backup_retention: 7 },
      afterUnknown: {}, changedKeys: ['engine_version', 'instance_class', 'allocated_storage', 'multi_az', 'backup_retention'],
    },
    {
      address: 'aws_s3_bucket.static_assets', moduleAddress: null, type: 'aws_s3_bucket', name: 'static_assets',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['create'],
      before: null,
      after: { bucket: 'prod-static-assets-v2', versioning: true, lifecycle_rule: 'enabled' },
      afterUnknown: { id: true, arn: true, bucket_domain_name: true },
      changedKeys: ['bucket', 'versioning', 'lifecycle_rule'],
    },
    {
      address: 'aws_cloudwatch_log_group.api', moduleAddress: null, type: 'aws_cloudwatch_log_group', name: 'api',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['create'],
      before: null,
      after: { name: '/aws/ec2/api-server', retention_in_days: 30 },
      afterUnknown: { id: true }, changedKeys: ['name', 'retention_in_days'],
    },
    {
      address: 'aws_security_group.api_sg', moduleAddress: null, type: 'aws_security_group', name: 'api_sg',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['update'],
      before: { description: 'API security group', ingress_from_port: 80,  ingress_to_port: 80,  cidr_blocks: '0.0.0.0/0' },
      after:  { description: 'API SG v2 — HTTPS',  ingress_from_port: 443, ingress_to_port: 443, cidr_blocks: '10.0.0.0/8'  },
      afterUnknown: {}, changedKeys: ['description', 'ingress_from_port', 'ingress_to_port', 'cidr_blocks'],
    },
    {
      address: 'aws_elb.legacy_lb', moduleAddress: null, type: 'aws_elb', name: 'legacy_lb',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['delete'],
      before: { name: 'legacy-lb', scheme: 'internet-facing', listener_port: 80, cross_zone: false },
      after: null,
      afterUnknown: {}, changedKeys: ['name', 'scheme', 'listener_port', 'cross_zone'],
    },
    {
      address: 'aws_route53_record.api', moduleAddress: null, type: 'aws_route53_record', name: 'api',
      providerName: 'registry.terraform.io/hashicorp/aws', actions: ['delete', 'create'],
      before: { type: 'A',     ttl: 300, records: '10.0.0.1' },
      after:  { type: 'CNAME', ttl: 60,  records: 'new-alb.us-east-1.elb.amazonaws.com' },
      afterUnknown: {}, changedKeys: ['type', 'ttl', 'records'],
    },
  ],
}

// ─── Action badge ─────────────────────────────────────────────────────────────

function ActionBadge({ actions }: { actions: string[] }) {
  const action = tfActionLabel(actions as any)
  const symbol = tfActionSymbol(actions as any)
  const color  = TF_ACTION_COLOR[action] ?? '#6B7280'
  const bg     = TF_ACTION_BG[action]    ?? '#F3F4F6'
  const labels: Record<string, string> = {
    create: 'CREATE', update: 'CHANGE', delete: 'DESTROY', replace: 'REPLACE', 'no-op': 'NO-OP',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
      color, background: bg, border: `1px solid ${color}30`,
      borderRadius: 4, padding: '2px 6px',
      fontFamily: '"DM Sans", sans-serif',
    }}>
      <span style={{ fontSize: 11, lineHeight: 1, fontFamily: '"JetBrains Mono", monospace', fontWeight: 900 }}>{symbol}</span>
      {labels[action] ?? action.toUpperCase()}
    </span>
  )
}

// ─── Single resource diff row ─────────────────────────────────────────────────

function ResourceDiffRow({ rc }: { rc: TFResourceChange }) {
  const [expanded, setExpanded] = useState(true)
  const action   = tfActionLabel(rc.actions as any)
  const isCreate = action === 'create'
  const isDelete = action === 'delete'
  const keys     = rc.changedKeys.slice(0, 6)

  const rowBg = isCreate ? '#F0FDF4' : isDelete ? '#FFF5F5' : action === 'replace' ? '#FFFBEB' : '#F8FAFF'

  return (
    <div style={{ borderBottom: '1px solid #F0F2F5' }}>
      {/* Resource header */}
      <div
        onClick={() => keys.length > 0 && setExpanded(p => !p)}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          cursor: keys.length > 0 ? 'pointer' : 'default',
          background: rowBg,
        }}
      >
        {/* LEFT: production state */}
        <div style={{
          padding: '7px 10px',
          borderRight: '2px solid #E5E7EB',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {isCreate ? (
            <span style={{ fontSize: 10, color: '#D1D5DB', fontStyle: 'italic', fontFamily: '"DM Sans", sans-serif' }}>
              — not deployed
            </span>
          ) : (
            <>
              <ActionBadge actions={isDelete ? ['delete'] : rc.actions} />
              <span style={{
                fontSize: 10, fontWeight: 600, color: isDelete ? '#EF4444' : '#374151',
                fontFamily: '"JetBrains Mono", monospace',
                textDecoration: isDelete ? 'line-through' : 'none',
                opacity: isDelete ? 0.7 : 1,
              }}>
                {shortAddress(rc.address)}
              </span>
            </>
          )}
          {!isCreate && <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginLeft: 'auto' }}>
            {rc.type}
          </span>}
        </div>

        {/* RIGHT: proposed changes */}
        <div style={{
          padding: '7px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {isDelete ? (
            <span style={{ fontSize: 10, color: '#D1D5DB', fontStyle: 'italic', fontFamily: '"DM Sans", sans-serif' }}>
              — will be destroyed
            </span>
          ) : (
            <>
              <ActionBadge actions={rc.actions} />
              <span style={{
                fontSize: 10, fontWeight: 600, color: isCreate ? '#16A34A' : '#374151',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                {shortAddress(rc.address)}
              </span>
            </>
          )}
          {!isDelete && <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginLeft: 'auto' }}>
            {rc.type}
          </span>}
          {keys.length > 0 && (
            <span style={{ marginLeft: 2 }}>
              {expanded
                ? <ChevronDown size={10} color="#9CA3AF" />
                : <ChevronRight size={10} color="#9CA3AF" />}
            </span>
          )}
        </div>
      </div>

      {/* Attribute diff rows */}
      {expanded && keys.length > 0 && keys.map((key) => {
        const bv = rc.before?.[key] ?? null
        const av = rc.afterUnknown?.[key] ? '(known after apply)' : (rc.after?.[key] ?? null)
        const bStr = fmtTFValue(bv)
        const aStr = fmtTFValue(av)
        const changed = bStr !== aStr

        return (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#FAFBFC' }}>
            {/* LEFT cell: current/before */}
            <div style={{
              padding: '3px 10px 3px 20px',
              borderRight: '2px solid #E5E7EB',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"JetBrains Mono", monospace', width: 110, flexShrink: 0 }}>
                {key}
              </span>
              <span style={{
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                color: isCreate ? '#D1D5DB' : changed ? '#DC2626' : '#4B5563',
                textDecoration: (!isCreate && changed && !isDelete) ? 'line-through' : 'none',
                opacity: isCreate ? 0.5 : 1,
              }}>
                {isCreate ? '—' : bStr}
              </span>
            </div>
            {/* RIGHT cell: proposed/after */}
            <div style={{
              padding: '3px 10px 3px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: changed && !isDelete ? (isCreate ? '#F0FDF420' : '#FFFBEB40') : 'transparent',
            }}>
              <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"JetBrains Mono", monospace', width: 110, flexShrink: 0 }}>
                {key}
              </span>
              <span style={{
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                color: isDelete ? '#D1D5DB' : isCreate ? '#16A34A' : changed ? '#D97706' : '#4B5563',
                fontWeight: changed ? 600 : 400,
                opacity: isDelete ? 0.5 : 1,
              }}>
                {isDelete ? '—' : aStr}
              </span>
              {changed && !isDelete && !isCreate && (
                <span style={{
                  fontSize: 8, color: '#D97706', background: '#FEF3C7',
                  border: '1px solid #FDE68A', borderRadius: 3,
                  padding: '1px 4px', fontFamily: '"DM Sans", sans-serif', fontWeight: 700,
                  marginLeft: 'auto', flexShrink: 0,
                }}>
                  changed
                </span>
              )}
            </div>
          </div>
        )
      })}

      {rc.changedKeys.length > 6 && expanded && (
        <div style={{ padding: '2px 10px 4px 20px', fontSize: 9, color: '#9CA3AF', background: '#FAFBFC', fontFamily: '"DM Sans", sans-serif' }}>
          +{rc.changedKeys.length - 6} more attributes…
        </div>
      )}
    </div>
  )
}

// ─── Apply footer ─────────────────────────────────────────────────────────────

function ApplyFooter({ plan, isDemo }: { plan: TFPlanResult; isDemo: boolean }) {
  const [applyState, setApplyState] = useState<ApplyState>('idle')
  const total = plan.summary.add + plan.summary.change + plan.summary.remove + plan.summary.replace

  const handleApply = () => {
    if (applyState === 'idle') { setApplyState('confirming'); return }
    if (applyState === 'confirming') {
      setApplyState('applying')
      // Simulate apply
      setTimeout(() => setApplyState(isDemo ? 'failed' : 'applied'), 3200)
    }
  }

  const reset = () => setApplyState('idle')

  if (applyState === 'applied') {
    return (
      <div style={{
        padding: '10px 14px', borderTop: '2px solid #BBF7D0',
        background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <CheckCircle2 size={16} color="#16A34A" />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D', fontFamily: '"DM Sans", sans-serif', flex: 1 }}>
          Apply complete — {plan.summary.add} added, {plan.summary.change} changed, {plan.summary.remove} destroyed
        </span>
        <button onClick={reset} style={{
          fontSize: 10, color: '#16A34A', background: 'none', border: '1px solid #BBF7D0',
          borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
        }}>Refresh</button>
      </div>
    )
  }

  if (applyState === 'failed') {
    return (
      <div style={{
        padding: '10px 14px', borderTop: '2px solid #FECACA',
        background: '#FFF5F5', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <XCircle size={16} color="#DC2626" />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', fontFamily: '"DM Sans", sans-serif', flex: 1 }}>
          {isDemo ? 'Connect Terraform Cloud to run real applies.' : 'Apply failed — check logs for details.'}
        </span>
        <button onClick={reset} style={{
          fontSize: 10, color: '#DC2626', background: 'none', border: '1px solid #FECACA',
          borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
        }}>Dismiss</button>
      </div>
    )
  }

  if (applyState === 'applying') {
    return (
      <div style={{
        padding: '10px 14px', borderTop: '2px solid #BFDBFE',
        background: '#EFF6FF', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Loader2 size={15} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', fontFamily: '"DM Sans", sans-serif', flex: 1 }}>
          Applying changes to <strong>prod-infra</strong>…
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: '#3B82F6',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (applyState === 'confirming') {
    return (
      <div style={{
        padding: '9px 14px', borderTop: '2px solid #FDE68A',
        background: '#FFFBEB', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', fontFamily: '"DM Sans", sans-serif' }}>
            This will modify production infrastructure ({total} resource{total !== 1 ? 's' : ''}).
          </div>
          <div style={{ fontSize: 10, color: '#B45309', fontFamily: '"DM Sans", sans-serif', marginTop: 1 }}>
            {plan.summary.remove > 0 && `⚠ ${plan.summary.remove} resource${plan.summary.remove > 1 ? 's' : ''} will be permanently destroyed. `}
            This action cannot be undone.
          </div>
        </div>
        <button onClick={reset} style={{
          fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F9FAFB',
          border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px',
          cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', flexShrink: 0,
        }}>
          Cancel
        </button>
        <button onClick={handleApply} style={{
          fontSize: 11, fontWeight: 700, color: '#FFFFFF',
          background: 'linear-gradient(135deg, #DC2626, #EF4444)',
          border: 'none', borderRadius: 6, padding: '5px 14px',
          cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
        }}>
          <Play size={11} fill="white" strokeWidth={0} />
          Confirm Apply
        </button>
      </div>
    )
  }

  // idle
  return (
    <div style={{
      padding: '9px 14px', borderTop: '1px solid #E5E7EB',
      background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', flex: 1 }}>
        {total} resource change{total !== 1 ? 's' : ''} pending
        {plan.outputChanges.length > 0 && ` · ${plan.outputChanges.length} output${plan.outputChanges.length > 1 ? 's' : ''} updated`}
      </span>
      {isDemo && (
        <span style={{ fontSize: 9, color: '#A78BFA', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 4, padding: '2px 6px', fontFamily: '"DM Sans", sans-serif', fontWeight: 600 }}>
          DEMO
        </span>
      )}
      <button onClick={handleApply} style={{
        fontSize: 11, fontWeight: 700, color: '#FFFFFF',
        background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
        border: 'none', borderRadius: 6, padding: '6px 16px',
        cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
      >
        <Play size={11} fill="white" strokeWidth={0} />
        Terraform Apply
      </button>
    </div>
  )
}

// ─── Inject CSS animations once ───────────────────────────────────────────────

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('tf-widget-styles')) return
  const el = document.createElement('style')
  el.id = 'tf-widget-styles'
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50%       { opacity: 1;   transform: scale(1.15); }
    }
  `
  document.head.appendChild(el)
}
if (typeof document !== 'undefined') injectStyles()

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function TerraformPlan({ id }: { id: string }) {
  const { plan: livePlan, loading, error, configured } = useTerraformPlan()

  const plan   = configured ? livePlan : (livePlan ?? DEMO_PLAN)
  const isDemo = !configured

  const runStatus   = plan?.runStatus
  const statusColor = runStatus ? tfStatusColor(runStatus) : '#9CA3AF'
  const statusLabel = runStatus ? tfStatusLabel(runStatus) : ''
  const changes     = plan?.resourceChanges ?? []
  const isPlanning  = runStatus === 'planning' || runStatus === 'plan_queued'

  return (
    <BaseWidget
      id={id}
      title="Terraform Plan"
      icon={Cloud}
      iconColor="#7C3AED"
      loading={loading && !plan}
      error={error}
      unconfigured={false}
      integrationName="Terraform Cloud"
      headerRight={plan ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDemo && (
            <span style={{ fontSize: 9, color: '#A78BFA', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 4, padding: '1px 6px', fontFamily: '"DM Sans", sans-serif', fontWeight: 700 }}>
              DEMO
            </span>
          )}
          {plan.commitSha && (
            <span style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#8B5CF6', background: '#F5F3FF', padding: '1px 5px', borderRadius: 4 }}>
              {plan.commitSha.slice(0, 7)}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, background: statusColor + '18', padding: '1px 7px', borderRadius: 99, fontFamily: '"DM Sans", sans-serif' }}>
            {statusLabel}
          </span>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
            {tfRelative(plan.createdAt)}
          </span>
        </div>
      ) : null}
    >
      {/* ── Summary bar ───────────────────────────────────────────────────── */}
      {plan && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderBottom: '1px solid #F0F2F5',
          background: '#F8FAFC', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: '"DM Sans", sans-serif', marginRight: 2 }}>
            Plan:
          </span>
          {[
            { label: `${plan.summary.add} to add`,     color: TF_ACTION_COLOR.create,  bg: TF_ACTION_BG.create,  show: plan.summary.add     > 0 },
            { label: `${plan.summary.change} to change`, color: TF_ACTION_COLOR.update, bg: TF_ACTION_BG.update,  show: plan.summary.change  > 0 },
            { label: `${plan.summary.replace} to replace`,color: TF_ACTION_COLOR.replace,bg:TF_ACTION_BG.replace,  show: plan.summary.replace > 0 },
            { label: `${plan.summary.remove} to destroy`,color: TF_ACTION_COLOR.delete,  bg: TF_ACTION_BG.delete,  show: plan.summary.remove  > 0 },
          ].filter(i => i.show).map(item => (
            <span key={item.label} style={{
              fontSize: 11, fontWeight: 700, color: item.color, background: item.bg,
              padding: '2px 8px', borderRadius: 99, fontFamily: '"DM Sans", sans-serif',
              border: `1px solid ${item.color}25`,
            }}>
              {item.label}
            </span>
          ))}
          {plan.summary.add === 0 && plan.summary.change === 0 && plan.summary.remove === 0 && plan.summary.replace === 0 && (
            <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600, fontFamily: '"DM Sans", sans-serif' }}>
              ✓ No changes
            </span>
          )}
        </div>
      )}

      {/* ── Planning spinner ─────────────────────────────────────────────── */}
      {plan && isPlanning && (
        <div style={{ padding: '20px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={18} color="#3B82F6" style={{ animation: 'spin 2s linear infinite' }} />
          <span style={{ fontSize: 12, color: '#3B82F6', fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
            {runStatus === 'plan_queued' ? 'Plan queued…' : 'Planning in progress…'}
          </span>
        </div>
      )}

      {/* ── Split-pane column headers ─────────────────────────────────────── */}
      {plan && !isPlanning && changes.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          borderBottom: '2px solid #E5E7EB',
        }}>
          <div style={{
            padding: '5px 10px', borderRight: '2px solid #E5E7EB',
            background: '#FFF5F5',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '"DM Sans", sans-serif' }}>
              Production State
            </span>
            <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginLeft: 2 }}>
              (current)
            </span>
          </div>
          <div style={{
            padding: '5px 10px',
            background: '#F0FDF4',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '"DM Sans", sans-serif' }}>
              Proposed Changes
            </span>
            <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginLeft: 2 }}>
              (after apply)
            </span>
          </div>
        </div>
      )}

      {/* ── Resource rows ─────────────────────────────────────────────────── */}
      {plan && !isPlanning && changes.map((rc) => (
        <ResourceDiffRow key={rc.address} rc={rc} />
      ))}

      {/* ── No-changes state ─────────────────────────────────────────────── */}
      {plan && !isPlanning && changes.length === 0 && (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#16A34A', fontFamily: '"DM Sans", sans-serif', fontSize: 12 }}>
          ✓ No changes — infrastructure is up to date
        </div>
      )}

      {/* ── Apply footer ─────────────────────────────────────────────────── */}
      {plan && !isPlanning && (changes.length > 0) && (
        <ApplyFooter plan={plan} isDemo={isDemo} />
      )}
    </BaseWidget>
  )
}

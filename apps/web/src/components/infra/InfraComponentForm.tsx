/**
 * InfraComponentForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 5 — per-component configuration forms for the InfraConfigPanel.
 *
 * HOW IT WORKS
 *  InfraConfigPanel renders <InfraComponentForm component={...} /> at the
 *  bottom of the right-side panel. This file looks at `component.type` and
 *  renders the matching sub-form (EcsForm, RdsForm, etc.).
 *
 *  Every field calls `updateComponentConfig(id, { key: value })` on change,
 *  which immediately patches the store and triggers a liveStats recompute —
 *  so StatsBar and ScaleSlider update in real time as you edit.
 *
 * ADDING A NEW FIELD
 *  1. Add the field to the relevant *Form component below.
 *  2. Make sure the key matches what costCalculator.ts / capacityEstimator.ts
 *     reads from `component.config`.
 *  3. If it's a new service type, add a new *Form and a case in the switch.
 *
 * SHARED PRIMITIVES
 *  FormRow    – label + child in a column
 *  FormSelect – styled <select> element
 *  FormInput  – styled <input type="number" | "text"> element
 *  Toggle     – boolean checkbox styled as a pill
 *
 * SUPPORTED SERVICE TYPES
 *  Compute:      ecs, ecs_task, ec2_asg, lambda, elastic_beanstalk
 *  Networking:   vpc, public_subnet, private_subnet, alb, nat_gateway,
 *                route53, cloudfront, api_gateway
 *  Database:     rds, rds_mysql, aurora_serverless, aurora_global,
 *                dynamodb, elasticache, elasticache_memcached
 *  Storage:      s3, efs, ecr
 *  Security:     iam_role, waf, shield, shield_advanced, security_group,
 *                secrets_manager, kms
 *  Messaging:    sqs, sns, eventbridge, kinesis
 *  Observability:cloudwatch_dashboard, cloudwatch_alarm, xray
 *  Custom:       custom
 */

import { useInfraStore } from '@/store/infraStore'
import type { InfraComponent, AwsServiceType } from '@/types/infra'

// ─── Design tokens (match the rest of the panel) ─────────────────────────────
const FONT   = '"DM Sans", sans-serif'
const BORDER = '1px solid #E5E7EB'

// ─── Shared primitive components ─────────────────────────────────────────────

/** Wraps a label + control in a vertical stack. */
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: FONT,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

/** Shared styles for <select> and <input> elements. */
const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 32,
  border: BORDER,
  borderRadius: 5,
  padding: '0 8px',
  fontSize: 12,
  fontFamily: FONT,
  color: '#111827',
  background: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
}

/** Styled dropdown. `value` / `onChange` are standard controlled inputs. */
function FormSelect({
  value,
  onChange,
  children,
}: {
  value: string | number
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={INPUT_STYLE}
      onFocus={(e)  => (e.currentTarget.style.borderColor = '#3B82F6')}
      onBlur={(e)   => (e.currentTarget.style.borderColor = '#E5E7EB')}
    >
      {children}
    </select>
  )
}

/** Styled text or number input. Calls onChange with the raw string value. */
function FormInput({
  type = 'number',
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  type?: 'number' | 'text'
  value: string | number
  onChange: (v: string) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={INPUT_STYLE}
      onFocus={(e)  => (e.currentTarget.style.borderColor = '#3B82F6')}
      onBlur={(e)   => (e.currentTarget.style.borderColor = '#E5E7EB')}
    />
  )
}

/**
 * Boolean pill toggle.
 * Renders a labelled checkbox as a small pill button (checked = blue).
 */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: 12,
        color: '#374151',
        userSelect: 'none',
      }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? '#3B82F6' : '#D1D5DB',
          position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.15s',
          }}
        />
      </div>
      {label}
    </label>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: FONT,
        marginBottom: 10,
        marginTop: 4,
        paddingBottom: 6,
        borderBottom: '1px solid #F3F4F6',
      }}
    >
      {children}
    </div>
  )
}

// ─── Per-service form components ──────────────────────────────────────────────
// Each receives the full `InfraComponent` and a `patch` callback that merges
// a partial config update into the store.

type PatchFn = (patch: Record<string, unknown>) => void

// ── ECS Fargate ───────────────────────────────────────────────────────────────
function EcsForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg = component.config

  // Valid vCPU / memory combinations for Fargate
  // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
  const memoryOptions: Record<number, number[]> = {
    0.25: [0.5, 1, 2],
    0.5:  [1, 2, 3, 4],
    1:    [2, 3, 4, 5, 6, 7, 8],
    2:    [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    4:    [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    8:    [16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60],
    16:   [32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120],
  }

  const vcpu      = (cfg.vcpu as number)     ?? 0.5
  const memoryGb  = (cfg.memoryGb as number) ?? 1
  const count     = (cfg.count as number)    ?? 1
  const maxCount  = (cfg.maxCount as number) ?? 0    // 0 = no autoscaling

  const validMemory = memoryOptions[vcpu] ?? [1]

  return (
    <>
      <SectionHeading>Compute</SectionHeading>

      <FormRow label="vCPU">
        <FormSelect
          value={vcpu}
          onChange={(v) => {
            const newVcpu = parseFloat(v)
            // Reset memory to the first valid option for this vCPU size
            const defaultMem = (memoryOptions[newVcpu] ?? [1])[0]
            patch({ vcpu: newVcpu, memoryGb: defaultMem })
          }}
        >
          {[0.25, 0.5, 1, 2, 4, 8, 16].map((v) => (
            <option key={v} value={v}>{v} vCPU</option>
          ))}
        </FormSelect>
      </FormRow>

      <FormRow label="Memory (GB)">
        <FormSelect
          value={memoryGb}
          onChange={(v) => patch({ memoryGb: parseFloat(v) })}
        >
          {validMemory.map((m) => (
            <option key={m} value={m}>{m} GB</option>
          ))}
        </FormSelect>
      </FormRow>

      <SectionHeading>Scaling</SectionHeading>

      <FormRow label="Desired Tasks">
        <FormInput
          value={count}
          min={1}
          max={maxCount || 500}
          onChange={(v) => patch({ count: parseInt(v, 10) || 1 })}
        />
      </FormRow>

      <FormRow label="Max Tasks (autoscaling — 0 = disabled)">
        <FormInput
          value={maxCount}
          min={0}
          max={1000}
          onChange={(v) => patch({ maxCount: parseInt(v, 10) || 0 })}
        />
      </FormRow>

      {/* Cost hint based on current settings */}
      <div style={{
        marginTop: 4,
        padding: '6px 8px',
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 5,
        fontSize: 10,
        color: '#166534',
        fontFamily: FONT,
      }}>
        ~${((vcpu * 0.04048 + memoryGb * 0.004445) * count * 730).toFixed(0)}/mo at desired count
      </div>
    </>
  )
}

// ── RDS / Aurora ──────────────────────────────────────────────────────────────
function RdsForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg = component.config

  const instanceClass = (cfg.instanceClass as string) ?? 'db.t3.micro'
  const multiAz       = (cfg.multiAz as boolean)      ?? false
  const engine        = (cfg.engine as string)         ?? 'postgres'

  return (
    <>
      <SectionHeading>Instance</SectionHeading>

      <FormRow label="Engine">
        <FormSelect value={engine} onChange={(v) => patch({ engine: v })}>
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="aurora-postgresql">Aurora PostgreSQL</option>
          <option value="aurora-mysql">Aurora MySQL</option>
        </FormSelect>
      </FormRow>

      <FormRow label="Instance Class">
        <FormSelect value={instanceClass} onChange={(v) => patch({ instanceClass: v })}>
          <optgroup label="Burstable (dev/test)">
            <option value="db.t3.micro">db.t3.micro  — 2 vCPU / 1 GB</option>
            <option value="db.t3.small">db.t3.small  — 2 vCPU / 2 GB</option>
            <option value="db.t3.medium">db.t3.medium — 2 vCPU / 4 GB</option>
            <option value="db.t3.large">db.t3.large  — 2 vCPU / 8 GB</option>
          </optgroup>
          <optgroup label="Memory-optimised (production)">
            <option value="db.r6g.large">db.r6g.large    — 2 vCPU / 16 GB</option>
            <option value="db.r6g.xlarge">db.r6g.xlarge  — 4 vCPU / 32 GB</option>
            <option value="db.r6g.2xlarge">db.r6g.2xlarge — 8 vCPU / 64 GB</option>
          </optgroup>
        </FormSelect>
      </FormRow>

      <SectionHeading>Availability</SectionHeading>

      <Toggle
        label="Multi-AZ (standby replica)"
        checked={multiAz}
        onChange={(v) => patch({ multiAz: v })}
      />
      <div style={{ marginTop: 6, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Multi-AZ doubles cost but provides automatic failover in ~60s.
      </div>
    </>
  )
}

// ── ElastiCache ───────────────────────────────────────────────────────────────
function ElasticacheForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg      = component.config
  const nodeType = (cfg.nodeType as string) ?? 'cache.t3.small'
  const nodes    = (cfg.nodes   as number)  ?? 1

  return (
    <>
      <SectionHeading>Cache Node</SectionHeading>

      <FormRow label="Node Type">
        <FormSelect value={nodeType} onChange={(v) => patch({ nodeType: v })}>
          <optgroup label="Burstable">
            <option value="cache.t3.micro">cache.t3.micro  — 0.5 GB</option>
            <option value="cache.t3.small">cache.t3.small  — 1.4 GB</option>
            <option value="cache.t3.medium">cache.t3.medium — 3.1 GB</option>
          </optgroup>
          <optgroup label="Memory-optimised">
            <option value="cache.r6g.large">cache.r6g.large   — 13 GB</option>
            <option value="cache.r6g.xlarge">cache.r6g.xlarge  — 26 GB</option>
            <option value="cache.r6g.2xlarge">cache.r6g.2xlarge — 52 GB</option>
          </optgroup>
        </FormSelect>
      </FormRow>

      <FormRow label="Number of Nodes">
        <FormInput
          value={nodes}
          min={1}
          max={6}
          onChange={(v) => patch({ nodes: parseInt(v, 10) || 1 })}
        />
      </FormRow>

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Tip: Use ≥2 nodes (primary + replica) for read HA. Use ≥3 for cluster mode.
      </div>
    </>
  )
}

// ── NAT Gateway ───────────────────────────────────────────────────────────────
function NatForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const count = (component.config.count as number) ?? 1

  return (
    <>
      <SectionHeading>Deployment</SectionHeading>

      <FormRow label="Number of NAT Gateways">
        <FormSelect value={count} onChange={(v) => patch({ count: parseInt(v, 10) })}>
          <option value={1}>1 — Single AZ (dev / cost-saving)</option>
          <option value={2}>2 — Two AZs (production minimum)</option>
          <option value={3}>3 — Three AZs (full HA)</option>
        </FormSelect>
      </FormRow>

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Each NAT Gateway costs $0.045/hr + $0.045/GB processed. One per AZ
        avoids cross-AZ data transfer fees.
      </div>
    </>
  )
}

// ── Application Load Balancer ─────────────────────────────────────────────────
function AlbForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const scheme = (component.config.scheme as string) ?? 'internet-facing'

  return (
    <>
      <SectionHeading>Scheme</SectionHeading>

      <FormRow label="Facing">
        <FormSelect value={scheme} onChange={(v) => patch({ scheme: v })}>
          <option value="internet-facing">Internet-facing (public)</option>
          <option value="internal">Internal (private VPC only)</option>
        </FormSelect>
      </FormRow>

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Internal ALBs are used for service-to-service routing inside a VPC.
      </div>
    </>
  )
}

// ── Lambda ────────────────────────────────────────────────────────────────────
function LambdaForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg        = component.config
  const memoryMb   = (cfg.memoryMb   as number) ?? 512
  const durationMs = (cfg.durationMs as number) ?? 200
  const arch       = (cfg.arch       as string) ?? 'x86_64'

  // Compute rough monthly cost (assuming 1M invocations/mo by default)
  const gbSec        = (memoryMb / 1024) * (durationMs / 1000) * 1_000_000
  const computeCost  = Math.max(0, gbSec - 400_000) * 0.0000166667
  const estimatedUSD = computeCost + 0.20 // ~1M invocations

  return (
    <>
      <SectionHeading>Function Config</SectionHeading>

      <FormRow label="Memory (MB)">
        <FormSelect value={memoryMb} onChange={(v) => patch({ memoryMb: parseInt(v, 10) })}>
          {[128, 256, 512, 1024, 2048, 3008].map((m) => (
            <option key={m} value={m}>{m} MB</option>
          ))}
        </FormSelect>
      </FormRow>

      <FormRow label="Timeout (ms)">
        <FormInput
          value={durationMs}
          min={100}
          max={900000}
          step={100}
          onChange={(v) => patch({ durationMs: parseInt(v, 10) || 200 })}
        />
      </FormRow>

      <FormRow label="Architecture">
        <FormSelect value={arch} onChange={(v) => patch({ arch: v })}>
          <option value="x86_64">x86_64 (default)</option>
          <option value="arm64">arm64 (Graviton2 — 20% cheaper)</option>
        </FormSelect>
      </FormRow>

      <div style={{
        marginTop: 4,
        padding: '6px 8px',
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 5,
        fontSize: 10,
        color: '#166534',
        fontFamily: FONT,
      }}>
        Est. ~${estimatedUSD.toFixed(2)}/mo at 1M invocations
      </div>
    </>
  )
}

// ── API Gateway ───────────────────────────────────────────────────────────────
function ApiGatewayForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const apiType = (component.config.apiType as string) ?? 'REST'

  return (
    <>
      <SectionHeading>API Type</SectionHeading>

      <FormRow label="Protocol">
        <FormSelect value={apiType} onChange={(v) => patch({ apiType: v })}>
          <option value="REST">REST API — $3.50/1M calls</option>
          <option value="HTTP">HTTP API — $1.00/1M calls (lower latency)</option>
          <option value="WebSocket">WebSocket API — $1.00/1M messages</option>
        </FormSelect>
      </FormRow>

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        HTTP APIs are ~70% cheaper than REST APIs. Use REST when you need
        request validation, API keys, or usage plans.
      </div>
    </>
  )
}

// ── CloudFront ────────────────────────────────────────────────────────────────
function CloudFrontForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const priceClass = (component.config.priceClass as string) ?? 'PriceClass_All'

  return (
    <>
      <SectionHeading>Edge Coverage</SectionHeading>

      <FormRow label="Price Class">
        <FormSelect value={priceClass} onChange={(v) => patch({ priceClass: v })}>
          <option value="PriceClass_All">All Edge Locations (best performance)</option>
          <option value="PriceClass_200">US, EU, Asia (most regions)</option>
          <option value="PriceClass_100">US + EU only (cheapest)</option>
        </FormSelect>
      </FormRow>

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Restricting edge locations reduces cost slightly but increases latency
        for users outside covered regions.
      </div>
    </>
  )
}

// ── S3 ────────────────────────────────────────────────────────────────────────
function S3Form({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg         = component.config
  const versioning  = (cfg.versioning  as boolean) ?? false
  const storageClass = (cfg.storageClass as string) ?? 'STANDARD'

  return (
    <>
      <SectionHeading>Storage</SectionHeading>

      <FormRow label="Storage Class">
        <FormSelect value={storageClass} onChange={(v) => patch({ storageClass: v })}>
          <option value="STANDARD">Standard — $0.023/GB</option>
          <option value="STANDARD_IA">Standard-IA — $0.0125/GB (infrequent access)</option>
          <option value="INTELLIGENT_TIERING">Intelligent Tiering (auto-optimise)</option>
        </FormSelect>
      </FormRow>

      <SectionHeading>Options</SectionHeading>

      <Toggle
        label="Versioning"
        checked={versioning}
        onChange={(v) => patch({ versioning: v })}
      />
      <div style={{ marginTop: 6, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Versioning retains every object version, enabling rollback and accidental
        deletion recovery. Increases storage cost.
      </div>
    </>
  )
}

// ── DynamoDB ──────────────────────────────────────────────────────────────────
function DynamoDbForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg         = component.config
  const billing     = (cfg.billing     as string)  ?? 'on-demand'
  const readCapacity  = (cfg.readCapacity  as number) ?? 5
  const writeCapacity = (cfg.writeCapacity as number) ?? 5

  return (
    <>
      <SectionHeading>Billing Mode</SectionHeading>

      <FormRow label="Capacity Mode">
        <FormSelect value={billing} onChange={(v) => patch({ billing: v })}>
          <option value="on-demand">On-Demand — pay per request</option>
          <option value="provisioned">Provisioned — fixed RCU/WCU</option>
        </FormSelect>
      </FormRow>

      {/* Only show RCU/WCU fields when provisioned mode is selected */}
      {billing === 'provisioned' && (
        <>
          <FormRow label="Read Capacity Units (RCU)">
            <FormInput
              value={readCapacity}
              min={1}
              max={40000}
              onChange={(v) => patch({ readCapacity: parseInt(v, 10) || 5 })}
            />
          </FormRow>
          <FormRow label="Write Capacity Units (WCU)">
            <FormInput
              value={writeCapacity}
              min={1}
              max={40000}
              onChange={(v) => patch({ writeCapacity: parseInt(v, 10) || 5 })}
            />
          </FormRow>
        </>
      )}

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        {billing === 'on-demand'
          ? 'On-Demand: $1.25/1M writes, $0.25/1M reads. No capacity planning.'
          : 'Provisioned: $0.00065/RCU/hr, $0.00325/WCU/hr. Use when traffic is predictable.'}
      </div>
    </>
  )
}

// ── SQS ───────────────────────────────────────────────────────────────────────
function SqsForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg       = component.config
  const queueType = (cfg.queueType    as string)  ?? 'standard'
  const retention = (cfg.retentionDays as number) ?? 4

  return (
    <>
      <SectionHeading>Queue Type</SectionHeading>

      <FormRow label="Type">
        <FormSelect value={queueType} onChange={(v) => patch({ queueType: v })}>
          <option value="standard">Standard — at-least-once, best-effort order</option>
          <option value="fifo">FIFO — exactly-once, strict order</option>
        </FormSelect>
      </FormRow>

      <FormRow label="Message Retention (days)">
        <FormSelect value={retention} onChange={(v) => patch({ retentionDays: parseInt(v, 10) })}>
          {[1, 4, 7, 14].map((d) => (
            <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
          ))}
        </FormSelect>
      </FormRow>

      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        FIFO queues cost 50% more but guarantee ordering. Use FIFO for financial
        transactions or workflows that must not process out of order.
      </div>
    </>
  )
}

// ── Route 53 ──────────────────────────────────────────────────────────────────
function Route53Form({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const failover  = (component.config.failover  as boolean) ?? false
  const latencyRR = (component.config.latencyRR as boolean) ?? false

  return (
    <>
      <SectionHeading>Routing Policy</SectionHeading>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Toggle
          label="Health-check failover"
          checked={failover}
          onChange={(v) => patch({ failover: v })}
        />
        <Toggle
          label="Latency-based routing"
          checked={latencyRR}
          onChange={(v) => patch({ latencyRR: v })}
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Failover routes traffic to a secondary region when the primary health
        check fails. Latency-based routing sends each user to the nearest region.
      </div>
    </>
  )
}

// ── WAF ───────────────────────────────────────────────────────────────────────
function WafForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const managed  = (component.config.managedRules as boolean) ?? true
  const rateLimit = (component.config.rateLimit   as number)  ?? 2000

  return (
    <>
      <SectionHeading>Protection</SectionHeading>

      <Toggle
        label="AWS Managed Rule Groups"
        checked={managed}
        onChange={(v) => patch({ managedRules: v })}
      />
      <div style={{ marginTop: 4, marginBottom: 10, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Covers OWASP Top 10, known bad inputs, and IP reputation lists.
      </div>

      <FormRow label="Rate Limit (req/5-min per IP — 0 = off)">
        <FormInput
          value={rateLimit}
          min={0}
          max={20000000}
          step={100}
          onChange={(v) => patch({ rateLimit: parseInt(v, 10) || 0 })}
        />
      </FormRow>
    </>
  )
}

// ── Shield ────────────────────────────────────────────────────────────────────
function ShieldForm({ component: _c }: { component: InfraComponent; patch: PatchFn }) {
  return (
    <>
      <SectionHeading>Protection Level</SectionHeading>
      <div style={{
        background: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        color: '#0369A1',
        fontFamily: FONT,
        lineHeight: 1.6,
      }}>
        <strong>Shield Standard</strong> is automatically enabled on all AWS resources at no cost.
        It protects against common L3/L4 DDoS attacks (SYN floods, reflection attacks).<br /><br />
        <strong>Shield Advanced</strong> ($3,000/mo) adds L7 protection, SRT 24/7 support,
        and cost protection for scaling during attacks.
      </div>
    </>
  )
}

// ── ECS Task Definition ───────────────────────────────────────────────────────
function EcsTaskForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg    = component.config
  const cpu    = (cfg.cpu    as number) ?? 256
  const memory = (cfg.memory as number) ?? 512
  const image  = (cfg.image  as string) ?? ''
  return (
    <>
      <SectionHeading>Task Resources</SectionHeading>
      <FormRow label="CPU Units">
        <FormSelect value={cpu} onChange={(v) => patch({ cpu: parseInt(v, 10) })}>
          <option value={256}>256 (0.25 vCPU)</option>
          <option value={512}>512 (0.5 vCPU)</option>
          <option value={1024}>1024 (1 vCPU)</option>
          <option value={2048}>2048 (2 vCPU)</option>
          <option value={4096}>4096 (4 vCPU)</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Memory (MB)">
        <FormSelect value={memory} onChange={(v) => patch({ memory: parseInt(v, 10) })}>
          {[512, 1024, 2048, 4096, 8192].map((m) => (
            <option key={m} value={m}>{m} MB</option>
          ))}
        </FormSelect>
      </FormRow>
      <FormRow label="Container Image">
        <FormInput type="text" value={image} placeholder="nginx:latest" onChange={(v) => patch({ image: v })} />
      </FormRow>
    </>
  )
}

// ── EC2 Auto Scaling Group ────────────────────────────────────────────────────
function Ec2AsgForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg             = component.config
  const instanceType    = (cfg.instanceType    as string) ?? 't3.medium'
  const minSize         = (cfg.minSize         as number) ?? 1
  const maxSize         = (cfg.maxSize         as number) ?? 4
  const desiredCapacity = (cfg.desiredCapacity as number) ?? 2
  return (
    <>
      <SectionHeading>Instance</SectionHeading>
      <FormRow label="Instance Type">
        <FormSelect value={instanceType} onChange={(v) => patch({ instanceType: v })}>
          <optgroup label="Burstable (t3)">
            <option value="t3.micro">t3.micro — 2 vCPU / 1 GB</option>
            <option value="t3.small">t3.small — 2 vCPU / 2 GB</option>
            <option value="t3.medium">t3.medium — 2 vCPU / 4 GB</option>
            <option value="t3.large">t3.large — 2 vCPU / 8 GB</option>
          </optgroup>
          <optgroup label="Compute (c6i)">
            <option value="c6i.large">c6i.large — 2 vCPU / 4 GB</option>
            <option value="c6i.xlarge">c6i.xlarge — 4 vCPU / 8 GB</option>
            <option value="c6i.2xlarge">c6i.2xlarge — 8 vCPU / 16 GB</option>
          </optgroup>
          <optgroup label="Memory (r6i)">
            <option value="r6i.large">r6i.large — 2 vCPU / 16 GB</option>
            <option value="r6i.xlarge">r6i.xlarge — 4 vCPU / 32 GB</option>
          </optgroup>
        </FormSelect>
      </FormRow>
      <SectionHeading>Scaling Limits</SectionHeading>
      <FormRow label="Minimum Instances">
        <FormInput value={minSize} min={0} max={maxSize} onChange={(v) => patch({ minSize: parseInt(v, 10) || 1 })} />
      </FormRow>
      <FormRow label="Desired Capacity">
        <FormInput value={desiredCapacity} min={minSize} max={maxSize} onChange={(v) => patch({ desiredCapacity: parseInt(v, 10) || 2 })} />
      </FormRow>
      <FormRow label="Maximum Instances">
        <FormInput value={maxSize} min={desiredCapacity} max={1000} onChange={(v) => patch({ maxSize: parseInt(v, 10) || 4 })} />
      </FormRow>
    </>
  )
}

// ── Elastic Beanstalk ─────────────────────────────────────────────────────────
function BeanstalkForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg          = component.config
  const platform     = (cfg.platform     as string) ?? 'node.js'
  const instanceType = (cfg.instanceType as string) ?? 't3.small'
  const minInstances = (cfg.minInstances as number) ?? 1
  const maxInstances = (cfg.maxInstances as number) ?? 4
  return (
    <>
      <SectionHeading>Platform</SectionHeading>
      <FormRow label="Runtime">
        <FormSelect value={platform} onChange={(v) => patch({ platform: v })}>
          <option value="node.js">Node.js</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="go">Go</option>
          <option value="docker">Docker</option>
          <option value="php">PHP</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Instance Type">
        <FormSelect value={instanceType} onChange={(v) => patch({ instanceType: v })}>
          <option value="t3.micro">t3.micro</option>
          <option value="t3.small">t3.small</option>
          <option value="t3.medium">t3.medium</option>
          <option value="t3.large">t3.large</option>
        </FormSelect>
      </FormRow>
      <SectionHeading>Scaling</SectionHeading>
      <FormRow label="Min Instances">
        <FormInput value={minInstances} min={1} max={maxInstances} onChange={(v) => patch({ minInstances: parseInt(v, 10) || 1 })} />
      </FormRow>
      <FormRow label="Max Instances">
        <FormInput value={maxInstances} min={minInstances} max={100} onChange={(v) => patch({ maxInstances: parseInt(v, 10) || 4 })} />
      </FormRow>
    </>
  )
}

// ── VPC ───────────────────────────────────────────────────────────────────────
function VpcForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg                = component.config
  const cidr               = (cfg.cidr               as string)  ?? '10.0.0.0/16'
  const enableDnsHostnames = (cfg.enableDnsHostnames  as boolean) ?? true
  return (
    <>
      <SectionHeading>IP Addressing</SectionHeading>
      <FormRow label="CIDR Block">
        <FormInput type="text" value={cidr} placeholder="10.0.0.0/16" onChange={(v) => patch({ cidr: v })} />
      </FormRow>
      <SectionHeading>DNS</SectionHeading>
      <Toggle label="Enable DNS Hostnames" checked={enableDnsHostnames} onChange={(v) => patch({ enableDnsHostnames: v })} />
      <div style={{ marginTop: 6, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Required for EC2 instances to receive public DNS names.
      </div>
    </>
  )
}

// ── Subnet (public + private) ─────────────────────────────────────────────────
function SubnetForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg              = component.config
  const cidr             = (cfg.cidr             as string) ?? '10.0.1.0/24'
  const availabilityZone = (cfg.availabilityZone as string) ?? 'us-east-1a'
  return (
    <>
      <SectionHeading>Subnet Config</SectionHeading>
      <FormRow label="CIDR Block">
        <FormInput type="text" value={cidr} placeholder="10.0.1.0/24" onChange={(v) => patch({ cidr: v })} />
      </FormRow>
      <FormRow label="Availability Zone">
        <FormSelect value={availabilityZone} onChange={(v) => patch({ availabilityZone: v })}>
          {['us-east-1a','us-east-1b','us-east-1c','eu-west-1a','eu-west-1b','ap-southeast-1a'].map((az) => (
            <option key={az} value={az}>{az}</option>
          ))}
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Place resources across multiple AZs for high availability.
      </div>
    </>
  )
}

// ── Aurora Serverless ─────────────────────────────────────────────────────────
function AuroraServerlessForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg    = component.config
  const engine = (cfg.engine as string) ?? 'aurora-postgresql'
  const minAcu = (cfg.minAcu as number) ?? 0.5
  const maxAcu = (cfg.maxAcu as number) ?? 16
  return (
    <>
      <SectionHeading>Engine</SectionHeading>
      <FormRow label="Database Engine">
        <FormSelect value={engine} onChange={(v) => patch({ engine: v })}>
          <option value="aurora-postgresql">Aurora PostgreSQL</option>
          <option value="aurora-mysql">Aurora MySQL</option>
        </FormSelect>
      </FormRow>
      <SectionHeading>Capacity (ACUs)</SectionHeading>
      <FormRow label="Minimum ACU (0.5 = scale to zero)">
        <FormSelect value={minAcu} onChange={(v) => patch({ minAcu: parseFloat(v) })}>
          {[0, 0.5, 1, 2, 4, 8].map((a) => (
            <option key={a} value={a}>{a === 0 ? '0 (scale to zero)' : `${a} ACU`}</option>
          ))}
        </FormSelect>
      </FormRow>
      <FormRow label="Maximum ACU">
        <FormSelect value={maxAcu} onChange={(v) => patch({ maxAcu: parseFloat(v) })}>
          {[2, 4, 8, 16, 32, 64, 128, 256].map((a) => (
            <option key={a} value={a}>{a} ACU</option>
          ))}
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        ~$0.12/ACU·hr. With min=0, the cluster pauses when idle — cold starts add ~5–30s.
      </div>
    </>
  )
}

// ── Aurora Global ─────────────────────────────────────────────────────────────
function AuroraGlobalForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg           = component.config
  const instanceClass = (cfg.instanceClass as string)   ?? 'db.r6g.large'
  const primaryRegion = (cfg.primaryRegion as string)   ?? 'us-east-1'
  const replicaRegion = (cfg.replicaRegion as string)   ?? 'eu-west-1'
  return (
    <>
      <SectionHeading>Instance</SectionHeading>
      <FormRow label="Instance Class">
        <FormSelect value={instanceClass} onChange={(v) => patch({ instanceClass: v })}>
          <option value="db.r6g.large">db.r6g.large — 2 vCPU / 16 GB</option>
          <option value="db.r6g.xlarge">db.r6g.xlarge — 4 vCPU / 32 GB</option>
          <option value="db.r6g.2xlarge">db.r6g.2xlarge — 8 vCPU / 64 GB</option>
        </FormSelect>
      </FormRow>
      <SectionHeading>Regions</SectionHeading>
      <FormRow label="Primary Region">
        <FormSelect value={primaryRegion} onChange={(v) => patch({ primaryRegion: v })}>
          {['us-east-1','us-west-2','eu-west-1','ap-southeast-1'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </FormSelect>
      </FormRow>
      <FormRow label="Replica Region">
        <FormSelect value={replicaRegion} onChange={(v) => patch({ replicaRegion: v })}>
          {['us-east-1','us-west-2','eu-west-1','ap-southeast-1'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Aurora Global replicates with typically &lt;1s lag. RTO &lt;1 min for regional failover.
      </div>
    </>
  )
}

// ── EFS ───────────────────────────────────────────────────────────────────────
function EfsForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg             = component.config
  const performanceMode = (cfg.performanceMode as string)  ?? 'generalPurpose'
  const throughputMode  = (cfg.throughputMode  as string)  ?? 'bursting'
  const encrypted       = (cfg.encrypted       as boolean) ?? true
  return (
    <>
      <SectionHeading>Performance</SectionHeading>
      <FormRow label="Performance Mode">
        <FormSelect value={performanceMode} onChange={(v) => patch({ performanceMode: v })}>
          <option value="generalPurpose">General Purpose (default, lower latency)</option>
          <option value="maxIO">Max I/O (higher throughput, higher latency)</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Throughput Mode">
        <FormSelect value={throughputMode} onChange={(v) => patch({ throughputMode: v })}>
          <option value="bursting">Bursting (scales with storage size)</option>
          <option value="provisioned">Provisioned (fixed throughput)</option>
          <option value="elastic">Elastic (auto-scales, recommended)</option>
        </FormSelect>
      </FormRow>
      <SectionHeading>Security</SectionHeading>
      <Toggle label="Encryption at rest (KMS)" checked={encrypted} onChange={(v) => patch({ encrypted: v })} />
    </>
  )
}

// ── ECR ───────────────────────────────────────────────────────────────────────
function EcrForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg             = component.config
  const imageScanOnPush = (cfg.imageScanOnPush as boolean) ?? true
  const encryptionType  = (cfg.encryptionType  as string)  ?? 'AES256'
  return (
    <>
      <SectionHeading>Security</SectionHeading>
      <Toggle label="Scan images on push" checked={imageScanOnPush} onChange={(v) => patch({ imageScanOnPush: v })} />
      <div style={{ marginTop: 4, marginBottom: 12, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Detects OS and language package vulnerabilities using Amazon Inspector.
      </div>
      <FormRow label="Encryption">
        <FormSelect value={encryptionType} onChange={(v) => patch({ encryptionType: v })}>
          <option value="AES256">AES-256 (default, AWS managed)</option>
          <option value="KMS">KMS (customer-managed key)</option>
        </FormSelect>
      </FormRow>
    </>
  )
}

// ── IAM Role ──────────────────────────────────────────────────────────────────
function IamRoleForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const assumedBy = (component.config.assumedBy as string) ?? 'lambda.amazonaws.com'
  return (
    <>
      <SectionHeading>Trust Relationship</SectionHeading>
      <FormRow label="Assumed By (Principal)">
        <FormSelect value={assumedBy} onChange={(v) => patch({ assumedBy: v })}>
          <option value="lambda.amazonaws.com">Lambda</option>
          <option value="ecs-tasks.amazonaws.com">ECS Tasks</option>
          <option value="ec2.amazonaws.com">EC2</option>
          <option value="apigateway.amazonaws.com">API Gateway</option>
          <option value="events.amazonaws.com">EventBridge</option>
          <option value="states.amazonaws.com">Step Functions</option>
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Define which AWS service can assume this role. Attach policies separately.
      </div>
    </>
  )
}

// ── Shield Advanced ───────────────────────────────────────────────────────────
function ShieldAdvancedForm({ component: _c }: { component: InfraComponent; patch: PatchFn }) {
  return (
    <>
      <SectionHeading>Shield Advanced</SectionHeading>
      <div style={{
        background: '#FFF5F5', border: '1px solid #FECACA',
        borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#991B1B',
        fontFamily: FONT, lineHeight: 1.6,
      }}>
        <strong>$3,000/month</strong> subscription (org-wide, covers unlimited resources).<br /><br />
        Includes 24/7 DDoS Response Team (SRT), advanced attack forensics, WAF integration,
        and cost protection for scaling events caused by DDoS attacks.
      </div>
    </>
  )
}

// ── Security Group ────────────────────────────────────────────────────────────
function SecurityGroupForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const description = (component.config.description as string) ?? ''
  return (
    <>
      <SectionHeading>Security Group</SectionHeading>
      <FormRow label="Description">
        <FormInput type="text" value={description} placeholder="Allow HTTPS from ALB" onChange={(v) => patch({ description: v })} />
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Define inbound and outbound rules. Rules are managed in the Terraform output.
        Attach this group to EC2, RDS, ECS, and other resources.
      </div>
    </>
  )
}

// ── Secrets Manager ───────────────────────────────────────────────────────────
function SecretsManagerForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg              = component.config
  const rotationEnabled  = (cfg.rotationEnabled as boolean) ?? false
  const rotationDays     = (cfg.rotationDays    as number)  ?? 30
  return (
    <>
      <SectionHeading>Rotation</SectionHeading>
      <Toggle label="Enable automatic rotation" checked={rotationEnabled} onChange={(v) => patch({ rotationEnabled: v })} />
      {rotationEnabled && (
        <FormRow label="Rotation Interval (days)">
          <FormSelect value={rotationDays} onChange={(v) => patch({ rotationDays: parseInt(v, 10) })}>
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>Every {d} days</option>
            ))}
          </FormSelect>
        </FormRow>
      )}
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        ~$0.40/secret/month + $0.05 per 10k API calls. Rotation uses a Lambda function
        to update the secret and any dependent services.
      </div>
    </>
  )
}

// ── KMS ───────────────────────────────────────────────────────────────────────
function KmsForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg         = component.config
  const keySpec     = (cfg.keySpec     as string)  ?? 'SYMMETRIC_DEFAULT'
  const multiRegion = (cfg.multiRegion as boolean) ?? false
  return (
    <>
      <SectionHeading>Key Configuration</SectionHeading>
      <FormRow label="Key Spec">
        <FormSelect value={keySpec} onChange={(v) => patch({ keySpec: v })}>
          <option value="SYMMETRIC_DEFAULT">Symmetric (AES-256) — most common</option>
          <option value="RSA_2048">RSA 2048-bit — asymmetric</option>
          <option value="RSA_4096">RSA 4096-bit — asymmetric</option>
          <option value="ECC_NIST_P256">ECC P-256 — signing</option>
        </FormSelect>
      </FormRow>
      <SectionHeading>Multi-Region</SectionHeading>
      <Toggle label="Multi-Region Key" checked={multiRegion} onChange={(v) => patch({ multiRegion: v })} />
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        ~$1/key/month + $0.03 per 10k API calls. Multi-region keys replicate to
        other regions for DR scenarios.
      </div>
    </>
  )
}

// ── SNS ───────────────────────────────────────────────────────────────────────
function SnsForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg      = component.config
  const fifo     = (cfg.fifo     as boolean) ?? false
  const protocol = (cfg.protocol as string)  ?? 'https'
  return (
    <>
      <SectionHeading>Topic Type</SectionHeading>
      <Toggle label="FIFO Topic (ordered, deduplication)" checked={fifo} onChange={(v) => patch({ fifo: v })} />
      <div style={{ marginTop: 4, marginBottom: 12, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        FIFO topics guarantee message order and deduplication. Standard topics are
        higher-throughput and support more subscription types.
      </div>
      <SectionHeading>Default Subscription Protocol</SectionHeading>
      <FormRow label="Protocol">
        <FormSelect value={protocol} onChange={(v) => patch({ protocol: v })}>
          <option value="https">HTTPS endpoint</option>
          <option value="sqs">SQS Queue</option>
          <option value="lambda">Lambda Function</option>
          <option value="email">Email</option>
          <option value="email-json">Email (JSON)</option>
        </FormSelect>
      </FormRow>
    </>
  )
}

// ── EventBridge ───────────────────────────────────────────────────────────────
function EventBridgeForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg                = component.config
  const scheduleExpression = (cfg.scheduleExpression as string) ?? 'rate(5 minutes)'
  const state              = (cfg.state              as string) ?? 'ENABLED'
  return (
    <>
      <SectionHeading>Schedule</SectionHeading>
      <FormRow label="Schedule Expression">
        <FormInput
          type="text"
          value={scheduleExpression}
          placeholder="rate(5 minutes) or cron(0 12 * * ? *)"
          onChange={(v) => patch({ scheduleExpression: v })}
        />
      </FormRow>
      <FormRow label="State">
        <FormSelect value={state} onChange={(v) => patch({ state: v })}>
          <option value="ENABLED">Enabled</option>
          <option value="DISABLED">Disabled</option>
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Use <code style={{ fontFamily: '"JetBrains Mono", monospace' }}>rate(N unit)</code> for
        fixed intervals or <code style={{ fontFamily: '"JetBrains Mono", monospace' }}>cron()</code> for
        scheduled expressions. ~$1/1M events.
      </div>
    </>
  )
}

// ── Kinesis ───────────────────────────────────────────────────────────────────
function KinesisForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg             = component.config
  const shardCount      = (cfg.shardCount      as number) ?? 1
  const retentionPeriod = (cfg.retentionPeriod as number) ?? 24
  return (
    <>
      <SectionHeading>Capacity</SectionHeading>
      <FormRow label="Shard Count">
        <FormInput
          value={shardCount} min={1} max={500}
          onChange={(v) => patch({ shardCount: parseInt(v, 10) || 1 })}
        />
      </FormRow>
      <div style={{ marginTop: -6, marginBottom: 12, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        Each shard supports 1 MB/s write, 2 MB/s read, 1000 records/s. ~$0.015/shard/hr.
      </div>
      <SectionHeading>Retention</SectionHeading>
      <FormRow label="Retention Period (hours)">
        <FormSelect value={retentionPeriod} onChange={(v) => patch({ retentionPeriod: parseInt(v, 10) })}>
          <option value={24}>24 hrs (default, included)</option>
          <option value={48}>48 hrs</option>
          <option value={72}>72 hrs</option>
          <option value={168}>168 hrs (7 days, $0.023/shard/hr)</option>
        </FormSelect>
      </FormRow>
    </>
  )
}

// ── CloudWatch Dashboard ──────────────────────────────────────────────────────
function CloudWatchDashboardForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const period = (component.config.period as number) ?? 300
  return (
    <>
      <SectionHeading>Dashboard</SectionHeading>
      <FormRow label="Default Period (seconds)">
        <FormSelect value={period} onChange={(v) => patch({ period: parseInt(v, 10) })}>
          <option value={60}>60s (1 min)</option>
          <option value={300}>300s (5 min — default)</option>
          <option value={900}>900s (15 min)</option>
          <option value={3600}>3600s (1 hr)</option>
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        ~$3/dashboard/month. Dashboards can span multiple regions and accounts.
      </div>
    </>
  )
}

// ── CloudWatch Alarm ──────────────────────────────────────────────────────────
function CloudWatchAlarmForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg                = component.config
  const threshold          = (cfg.threshold          as number) ?? 80
  const evaluationPeriods  = (cfg.evaluationPeriods  as number) ?? 2
  const comparisonOperator = (cfg.comparisonOperator as string) ?? 'GreaterThanThreshold'
  return (
    <>
      <SectionHeading>Alarm Condition</SectionHeading>
      <FormRow label="Comparison Operator">
        <FormSelect value={comparisonOperator} onChange={(v) => patch({ comparisonOperator: v })}>
          <option value="GreaterThanThreshold">Greater than threshold</option>
          <option value="GreaterThanOrEqualToThreshold">Greater than or equal</option>
          <option value="LessThanThreshold">Less than threshold</option>
          <option value="LessThanOrEqualToThreshold">Less than or equal</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Threshold">
        <FormInput value={threshold} min={0} onChange={(v) => patch({ threshold: parseFloat(v) || 80 })} />
      </FormRow>
      <FormRow label="Evaluation Periods">
        <FormInput value={evaluationPeriods} min={1} max={24} onChange={(v) => patch({ evaluationPeriods: parseInt(v, 10) || 2 })} />
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        ~$0.10/alarm/month. Alarm fires when the metric crosses the threshold for
        N consecutive evaluation periods.
      </div>
    </>
  )
}

// ── X-Ray ─────────────────────────────────────────────────────────────────────
function XrayForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const samplingRate = (component.config.samplingRate as number) ?? 5
  return (
    <>
      <SectionHeading>Sampling</SectionHeading>
      <FormRow label="Sampling Rate (% of requests)">
        <FormSelect value={samplingRate} onChange={(v) => patch({ samplingRate: parseInt(v, 10) })}>
          <option value={1}>1% (high traffic — cost-saving)</option>
          <option value={5}>5% (recommended default)</option>
          <option value={10}>10%</option>
          <option value={100}>100% (low traffic / debugging)</option>
        </FormSelect>
      </FormRow>
      <div style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF', fontFamily: FONT }}>
        $5/1M traces recorded + $0.50/1M traces retrieved. First 100k traces/mo free.
        Use 1–5% for production workloads to control cost.
      </div>
    </>
  )
}

// ── Custom Resource ───────────────────────────────────────────────────────────
function CustomForm({ component, patch }: { component: InfraComponent; patch: PatchFn }) {
  const cfg      = component.config
  const name     = (cfg.name     as string) ?? ''
  const endpoint = (cfg.endpoint as string) ?? ''
  const type     = (cfg.type     as string) ?? 'External API'
  const notes    = (cfg.notes    as string) ?? ''

  return (
    <>
      <SectionHeading>Resource Identity</SectionHeading>
      <FormRow label="Service Name">
        <FormInput type="text" value={name} placeholder="Stripe API" onChange={(v) => patch({ name: v })} />
      </FormRow>
      <FormRow label="Type">
        <FormSelect value={type} onChange={(v) => patch({ type: v })}>
          <option value="External API">External API</option>
          <option value="Third-party Service">Third-party Service</option>
          <option value="Internal Service">Internal Microservice</option>
          <option value="Database">External Database</option>
          <option value="Message Broker">Message Broker</option>
          <option value="CDN">CDN / Edge</option>
          <option value="Auth Provider">Auth Provider</option>
          <option value="Other">Other</option>
        </FormSelect>
      </FormRow>
      <SectionHeading>Connection</SectionHeading>
      <FormRow label="Endpoint / URL">
        <FormInput
          type="text"
          value={endpoint}
          placeholder="https://api.stripe.com"
          onChange={(v) => patch({ endpoint: v })}
        />
      </FormRow>
      <SectionHeading>Notes</SectionHeading>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT, marginBottom: 4 }}>
          Description / Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="e.g. Payment processing API. Rate limit: 100 req/s."
          rows={3}
          style={{
            width: '100%', border: '1px solid #E5E7EB', borderRadius: 5,
            padding: '6px 8px', fontSize: 12, fontFamily: FONT, color: '#111827',
            background: '#FFFFFF', outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', lineHeight: 1.5,
          }}
          onFocus={(e)  => (e.currentTarget.style.borderColor = '#3B82F6')}
          onBlur={(e)   => (e.currentTarget.style.borderColor = '#E5E7EB')}
        />
      </div>
      <div style={{ padding: '8px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 10, color: '#6B7280', fontFamily: FONT, lineHeight: 1.5 }}>
        Custom resources are documentation nodes — they appear in the architecture
        diagram and Terraform output as comments, but don't generate real AWS resources.
      </div>
    </>
  )
}

// ─── Main export — routes to the correct form ─────────────────────────────────

interface Props {
  /** The full component object from the store. */
  component: InfraComponent
}

/**
 * Renders the appropriate configuration form for any AWS service type.
 * Connects to `updateComponentConfig` in the store so every change
 * is immediately reflected in the canvas and StatsBar.
 */
export default function InfraComponentForm({ component }: Props) {
  const { updateComponentConfig } = useInfraStore()

  /**
   * `patch` is a partial config object — only the changed keys are sent.
   * The store merges it with the existing config via spread:
   *   { ...existing, ...patch }
   */
  const patch: PatchFn = (p) => updateComponentConfig(component.id, p)

  const type = component.type as AwsServiceType

  // Route to the correct form based on service type
  switch (type) {
    // ── Compute ────────────────────────────────────────────────────────────
    case 'ecs':               return <EcsForm               component={component} patch={patch} />
    case 'ecs_task':          return <EcsTaskForm           component={component} patch={patch} />
    case 'ec2_asg':           return <Ec2AsgForm            component={component} patch={patch} />
    case 'lambda':            return <LambdaForm            component={component} patch={patch} />
    case 'elastic_beanstalk': return <BeanstalkForm         component={component} patch={patch} />
    // ── Networking ─────────────────────────────────────────────────────────
    case 'vpc':               return <VpcForm               component={component} patch={patch} />
    case 'public_subnet':
    case 'private_subnet':    return <SubnetForm            component={component} patch={patch} />
    case 'alb':               return <AlbForm               component={component} patch={patch} />
    case 'nat_gateway':       return <NatForm               component={component} patch={patch} />
    case 'route53':           return <Route53Form           component={component} patch={patch} />
    case 'cloudfront':        return <CloudFrontForm        component={component} patch={patch} />
    case 'api_gateway':       return <ApiGatewayForm        component={component} patch={patch} />
    // ── Database ───────────────────────────────────────────────────────────
    case 'rds':
    case 'rds_mysql':         return <RdsForm               component={component} patch={patch} />
    case 'aurora_serverless': return <AuroraServerlessForm  component={component} patch={patch} />
    case 'aurora_global':     return <AuroraGlobalForm      component={component} patch={patch} />
    case 'dynamodb':          return <DynamoDbForm          component={component} patch={patch} />
    case 'elasticache':
    case 'elasticache_memcached': return <ElasticacheForm   component={component} patch={patch} />
    // ── Storage ────────────────────────────────────────────────────────────
    case 's3':                return <S3Form                component={component} patch={patch} />
    case 'efs':               return <EfsForm               component={component} patch={patch} />
    case 'ecr':               return <EcrForm               component={component} patch={patch} />
    // ── Security ───────────────────────────────────────────────────────────
    case 'iam_role':          return <IamRoleForm           component={component} patch={patch} />
    case 'waf':               return <WafForm               component={component} patch={patch} />
    case 'shield':            return <ShieldForm            component={component} patch={patch} />
    case 'shield_advanced':   return <ShieldAdvancedForm    component={component} patch={patch} />
    case 'security_group':    return <SecurityGroupForm     component={component} patch={patch} />
    case 'secrets_manager':   return <SecretsManagerForm    component={component} patch={patch} />
    case 'kms':               return <KmsForm               component={component} patch={patch} />
    // ── Messaging ──────────────────────────────────────────────────────────
    case 'sqs':               return <SqsForm               component={component} patch={patch} />
    case 'sns':               return <SnsForm               component={component} patch={patch} />
    case 'eventbridge':       return <EventBridgeForm       component={component} patch={patch} />
    case 'kinesis':           return <KinesisForm           component={component} patch={patch} />
    // ── Observability ──────────────────────────────────────────────────────
    case 'cloudwatch_dashboard': return <CloudWatchDashboardForm component={component} patch={patch} />
    case 'cloudwatch_alarm':  return <CloudWatchAlarmForm   component={component} patch={patch} />
    case 'xray':              return <XrayForm              component={component} patch={patch} />
    // ── Custom ─────────────────────────────────────────────────────────────
    case 'custom':            return <CustomForm            component={component} patch={patch} />
    default:
      return (
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: FONT }}>
          No configurable settings for this service type.
        </div>
      )
  }
}

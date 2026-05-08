/**
 * BaseAwsNode.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single ReactFlow custom node component used for ALL AWS service types.
 *
 * VISUAL STATES
 *   Default  — white card, 0.5px border #E5E5E5, subtle shadow
 *   Hovered  — slightly darker border, stronger shadow, tooltip popover
 *   Selected — 1.5px blue border (#3B82F6), light blue tint, glow ring
 *   NewDrop  — 300ms pulse ring animation on the frame the node is dropped
 *
 * NODE ANATOMY
 *   ┌──────────────────────────────────────┐
 *   │  [icon]  Label              [status] │
 *   │          serviceLabel   [cfg badge]  │
 *   └──────────────────────────────────────┘
 *
 * STATUS PILL
 *   pending    — grey, default state for freshly dragged nodes
 *   configured — blue, when the user has edited at least one config value
 *
 * CONFIG BADGE
 *   Short derived string showing the key setting:
 *   ECS → "0.5 vCPU", RDS → "db.t3.micro", Lambda → "128 MB", etc.
 *
 * SELECTION (performance critical)
 *   `selected` is read from `useInfraStore().selectedComponentId === id`
 *   inside this component — NOT passed via ReactFlow's `selected` prop and
 *   NOT in InfraCanvasInner's useMemo dep array.  This means selection state
 *   changes only re-render the two affected nodes; the canvas never flashes.
 *
 * DROP PULSE
 *   InfraCanvas sets `newlyDroppedId` in the store immediately after drop.
 *   This component reads it and runs a 300ms CSS keyframe, then calls
 *   `clearNewlyDropped()` so subsequent renders don't replay the animation.
 *
 * RIGHT-CLICK
 *   Fires `onContextMenu` which InfraCanvas intercepts to show a context menu.
 */

import { useState, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInfraStore }  from '@/store/infraStore'
import { AWS_NODE_CONFIG } from '@/lib/awsNodeConfig'
import type { AwsServiceType } from '@/types/infra'

export interface AwsNodeData extends Record<string, unknown> {
  type:   AwsServiceType
  label:  string
  config: Record<string, unknown>
}

type AwsNode = Node<AwsNodeData>

// ─── Inject CSS keyframe for drop pulse (once) ───────────────────────────────

const PULSE_STYLE_ID = 'flowops-drop-pulse'
function injectPulseStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(PULSE_STYLE_ID)) return
  const el = document.createElement('style')
  el.id    = PULSE_STYLE_ID
  el.textContent = `
    @keyframes dropPulse {
      0%   { box-shadow: 0 0 0 0px rgba(59,130,246,0.7); }
      50%  { box-shadow: 0 0 0 10px rgba(59,130,246,0.15); }
      100% { box-shadow: 0 0 0 0px rgba(59,130,246,0); }
    }
  `
  document.head.appendChild(el)
}

// ─── Config badge string ──────────────────────────────────────────────────────

function getConfigBadge(type: AwsServiceType, config: Record<string, unknown>): string | null {
  switch (type) {
    case 'ecs':               return config.vcpu ? `${config.vcpu} vCPU` : null
    case 'ecs_task':          return config.cpu  ? `${config.cpu} CPU` : null
    case 'ec2_asg':           return (config.instanceType as string | undefined) ?? null
    case 'lambda':            return config.memory ? `${config.memory} MB` : null
    case 'elastic_beanstalk': return (config.instanceType as string | undefined) ?? null
    case 'rds':
    case 'rds_mysql':         return (config.instanceClass as string | undefined)?.replace('db.', '') ?? null
    case 'aurora_serverless': return config.maxAcu ? `≤${config.maxAcu} ACU` : null
    case 'aurora_global':     return (config.instanceClass as string | undefined)?.replace('db.', '') ?? null
    case 'elasticache':
    case 'elasticache_memcached': return (config.nodeType as string | undefined)?.replace('cache.', '') ?? null
    case 'dynamodb':          return (config.billingMode as string | undefined) === 'provisioned' ? `${config.rcu}R/${config.wcu}W` : 'on-demand'
    case 'alb':               return (config.scheme as string | undefined)?.replace('internet-', '') ?? null
    case 'api_gateway':       return (config.apiType as string | undefined) ?? null
    case 'kinesis':           return config.shardCount ? `${config.shardCount} shard${Number(config.shardCount) !== 1 ? 's' : ''}` : null
    case 'sqs':               return (config.queueType as string | undefined) ?? null
    case 's3':                return (config.storageClass as string | undefined) ?? null
    case 'cloudfront':        return (config.priceClass as string | undefined)?.replace('PriceClass_', 'PC') ?? null
    case 'vpc':               return (config.cidr as string | undefined) ?? null
    case 'public_subnet':
    case 'private_subnet':    return (config.cidr as string | undefined) ?? null
    case 'custom':            return (config.type as string | undefined) ?? 'Custom'
    default:                  return null
  }
}

// ─── Status computation ───────────────────────────────────────────────────────
// "configured" = at least one config value differs from a simple default pattern.
// We use a lightweight heuristic: if any string value isn't the fallback region/plan
// or any numeric value is non-trivially set, we call it configured.
function getStatus(config: Record<string, unknown>): 'pending' | 'configured' {
  const vals = Object.values(config)
  // If more than 2 keys have been meaningfully set (we have at minimum region+one other)
  // treat as configured. This is a pragmatic heuristic.
  const nonDefault = vals.filter((v) => {
    if (typeof v === 'boolean')  return v === true
    if (typeof v === 'number')   return v > 0
    if (typeof v === 'string')   return v !== '' && v !== 'us-east-1'
    if (Array.isArray(v))        return v.length > 0
    return false
  })
  return nonDefault.length >= 2 ? 'configured' : 'pending'
}

// Pricing hints for tooltip
const PRICING_HINT: Partial<Record<AwsServiceType, string>> = {
  alb:                  '~$0.008/hr + LCU',
  ecs:                  '~$0.04048/vCPU·hr',
  ecs_task:             'No direct cost',
  ec2_asg:              'Varies by instance',
  lambda:               '~$0.20/1M requests',
  elastic_beanstalk:    'Underlying EC2 cost',
  rds:                  '~$0.017–$0.96/hr',
  rds_mysql:            '~$0.017–$0.96/hr',
  aurora_serverless:    '~$0.12/ACU·hr',
  aurora_global:        '~$0.20/replica·hr',
  dynamodb:             'On-demand / RCU+WCU',
  elasticache:          '~$0.034–$0.665/hr',
  elasticache_memcached:'~$0.034–$0.665/hr',
  nat_gateway:          '~$0.045/hr + $0.045/GB',
  cloudfront:           '~$0.0085/GB out',
  waf:                  '~$5/mo + $1/rule',
  shield:               'Included (Standard)',
  shield_advanced:      '$3,000/mo (org)',
  s3:                   '~$0.023/GB stored',
  efs:                  '~$0.30/GB·mo',
  ecr:                  '~$0.10/GB·mo',
  api_gateway:          '~$3.50/1M calls',
  sqs:                  '~$0.40/1M requests',
  sns:                  '~$0.50/1M publishes',
  eventbridge:          '~$1.00/1M events',
  kinesis:              '~$0.015/shard·hr',
  cloudwatch_dashboard: '~$3/dashboard·mo',
  cloudwatch_alarm:     '~$0.10/alarm·mo',
  xray:                 '~$5/1M traces',
  secrets_manager:      '~$0.40/secret·mo',
  kms:                  '~$1/key·mo',
  route53:              '~$0.50/hosted zone',
  iam_role:             'No direct cost',
  security_group:       'No direct cost',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BaseAwsNode({ id, data: rawData }: NodeProps<AwsNode>) {
  const data = rawData as unknown as AwsNodeData
  const { selectComponent, selectedComponentId, newlyDroppedId, clearNewlyDropped } = useInfraStore()

  const selected    = selectedComponentId === (id as string)
  const isNewDrop   = newlyDroppedId      === (id as string)
  const cfg         = AWS_NODE_CONFIG[data.type as AwsServiceType]
  const [hovered, setHovered] = useState(false)
  const pulsedRef   = useRef(false)

  // Inject CSS once
  useEffect(injectPulseStyles, [])

  // Clear newlyDroppedId after animation (300ms)
  useEffect(() => {
    if (isNewDrop && !pulsedRef.current) {
      pulsedRef.current = true
      const t = setTimeout(() => {
        clearNewlyDropped()
        pulsedRef.current = false
      }, 400)
      return () => clearTimeout(t)
    }
  }, [isNewDrop, clearNewlyDropped])

  if (!cfg) return null

  const pricingHint = PRICING_HINT[data.type as AwsServiceType]
  const configBadge = getConfigBadge(data.type as AwsServiceType, data.config ?? {})
  const status      = getStatus(data.config ?? {})

  const statusColor = status === 'configured' ? '#3B82F6' : '#9CA3AF'
  const statusBg    = status === 'configured' ? '#EFF6FF' : '#F3F4F6'

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Hover tooltip ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {hovered && !selected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position:     'absolute',
              bottom:       'calc(100% + 8px)',
              left:         '50%',
              transform:    'translateX(-50%)',
              width:        210,
              background:   '#1F2937',
              border:       '1px solid #374151',
              borderRadius: 7,
              padding:      '9px 11px',
              zIndex:       9999,
              pointerEvents:'none',
              whiteSpace:   'normal',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F9FAFB', fontFamily: '"DM Sans", sans-serif', marginBottom: 4 }}>
              {cfg.serviceLabel}
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5, marginBottom: pricingHint ? 5 : 0 }}>
              {cfg.description}
            </div>
            {pricingHint && (
              <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                {pricingHint}
              </div>
            )}
            <div
              style={{
                position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                width: 8, height: 8,
                background: '#1F2937', border: '1px solid #374151',
                borderTop: 'none', borderLeft: 'none', rotate: '45deg',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Node card ──────────────────────────────────────────────────────── */}
      <div
        onClick={() => selectComponent(id as string)}
        style={{
          background:   selected ? `${cfg.color}08` : '#FFFFFF',
          border:       selected
            ? `1.5px solid ${cfg.color}`
            : hovered
            ? '0.5px solid #94a3b8'
            : '0.5px solid #E5E5E5',
          borderRadius: 8,
          padding:      '8px 10px 7px',
          display:      'flex',
          alignItems:   'center',
          gap:          9,
          minWidth:     168,
          maxWidth:     230,
          cursor:       'pointer',
          boxShadow:    isNewDrop
            ? undefined  // controlled by animation
            : selected
            ? `0 0 0 3px ${cfg.color}22, 0 2px 6px rgba(0,0,0,0.08)`
            : hovered
            ? '0 2px 8px rgba(0,0,0,0.1)'
            : '0 1px 4px rgba(0,0,0,0.06)',
          animation:    isNewDrop ? 'dropPulse 0.4s ease-out' : undefined,
          transition:   'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        }}
      >
        {/* Service icon */}
        <div
          style={{
            width: 32, height: 32, borderRadius: 7,
            background: '#F8FAFC',
            border:     `1px solid ${cfg.color}30`,
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
          }}
        >
          <img
            src={cfg.icon}
            alt={cfg.serviceLabel}
            width={22} height={22}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Label + sub-row (service type + config badge) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Node label */}
          <div
            style={{
              fontSize: 11, fontWeight: 600, color: '#111827',
              fontFamily: '"DM Sans", sans-serif',
              lineHeight: 1.3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {data.label}
          </div>

          {/* Service type + config badge row */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
            }}
          >
            <span
              style={{
                fontSize:   9, color: '#9CA3AF',
                fontFamily: '"DM Sans", sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {cfg.serviceLabel}
            </span>

            {configBadge && (
              <>
                <span style={{ color: '#D1D5DB', fontSize: 8, flexShrink: 0 }}>·</span>
                <span
                  style={{
                    fontSize: 9, fontWeight: 600,
                    color:    cfg.color,
                    background: `${cfg.color}14`,
                    borderRadius: 3,
                    padding: '1px 4px',
                    fontFamily: '"DM Sans", sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 72,
                  }}
                >
                  {configBadge}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div
          style={{
            fontSize:     8, fontWeight: 700, color: statusColor,
            background:   statusBg,
            borderRadius: 4,
            padding:      '2px 5px',
            fontFamily:   '"DM Sans", sans-serif',
            letterSpacing:'0.04em',
            textTransform:'uppercase',
            flexShrink:   0,
            alignSelf:    'flex-start',
            marginTop:    1,
          }}
        >
          {status}
        </div>

        {/* ReactFlow handles */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: '#cbd5e1', border: '1.5px solid #94a3b8', width: 8, height: 8 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: '#cbd5e1', border: '1.5px solid #94a3b8', width: 8, height: 8 }}
        />

        {/* Extra handles on top and bottom for flexible routing */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ background: '#cbd5e1', border: '1.5px solid #94a3b8', width: 7, height: 7 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ background: '#cbd5e1', border: '1.5px solid #94a3b8', width: 7, height: 7 }}
        />
      </div>
    </div>
  )
}

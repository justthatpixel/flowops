/**
 * InfraConfigPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Right-side slide-in panel that appears when a user clicks an AWS service node
 * on the InfraCanvas.
 *
 * LAYOUT (300px wide, full canvas height, absolute overlay — no animation so
 * that ReactFlow never repaints and causes the "black flash" bug):
 *
 *   ┌────────────────────────────┐
 *   │  [Icon]  Label       [✕]  │  ← header: service icon, node label, close
 *   │           serviceLabel    │
 *   ├────────────────────────────┤
 *   │  Description card         │  ← brief service description
 *   │  Pricing table (dark)     │  ← us-east-1 on-demand reference
 *   │  ─────────────────────    │
 *   │  <InfraComponentForm>     │  ← Phase 5 live-edit config (all 14 types)
 *   │  AWS docs link            │
 *   └────────────────────────────┘
 *
 * DATA FLOW
 *   selectedComponentId (store) → finds InfraComponent in components[]
 *   → renders service-specific <InfraComponentForm>
 *   → form calls updateComponentConfig(id, patch) on every change
 *   → store recomputes liveStats immediately
 *
 * POSITIONING
 *   The parent (InfraDesigner) positions this as `position: absolute; right: 0`
 *   on top of the canvas so the canvas width never changes.  This is the key
 *   fix that prevents ReactFlow from triggering a repaint + black frame.
 */

import { useState, useRef, useCallback } from 'react'
import { X, ExternalLink, Trash2 } from 'lucide-react'
import { useInfraStore } from '@/store/infraStore'
import { AWS_NODE_CONFIG } from '@/lib/awsNodeConfig'
import InfraComponentForm from './InfraComponentForm'
import type { AwsServiceType } from '@/types/infra'

// ─── Pricing reference table ─────────────────────────────────────────────────
// Snapshot of us-east-1 on-demand rates (May 2025) shown in the panel header.
// These are display-only; live cost calculations live in utils/costCalculator.ts.
const PRICING_TABLE: Partial<Record<AwsServiceType, { line: string; note: string }[]>> = {
  alb:         [{ line: '$0.008 / hr', note: 'Base ALB cost' }, { line: '$0.008 / LCU·hr', note: 'Load Capacity Units' }],
  ecs:         [{ line: '$0.04048 / vCPU·hr', note: 'Fargate compute' }, { line: '$0.004445 / GB·hr', note: 'Fargate memory' }],
  rds:         [{ line: '$0.017–0.96 / hr', note: 'Depends on instance class' }, { line: '×2 if Multi-AZ', note: 'Standby replica' }],
  elasticache: [{ line: '$0.034–0.665 / hr', note: 'Per node, on-demand' }],
  nat_gateway: [{ line: '$0.045 / hr', note: 'Per NAT Gateway' }, { line: '$0.045 / GB', note: 'Data processed' }],
  cloudfront:  [{ line: '$0.0085 / GB', note: 'First 10TB out (US)' }, { line: '$0.0075 / 10k req', note: 'HTTP requests' }],
  waf:         [{ line: '$5 / mo', note: 'Per Web ACL' }, { line: '$1 / mo / rule', note: 'Per rule group rule' }],
  lambda:      [{ line: '$0.20 / 1M req', note: 'After free tier' }, { line: '$0.0000166667 / GB·s', note: 'Compute duration' }],
  api_gateway: [{ line: '$3.50 / 1M calls', note: 'REST API' }],
  s3:          [{ line: '$0.023 / GB', note: 'Standard storage' }, { line: '$0.09 / GB', note: 'Data transfer out' }],
  dynamodb:    [{ line: '$1.25 / 1M writes', note: 'On-demand mode' }, { line: '$0.25 / 1M reads', note: 'On-demand mode' }],
  sqs:         [{ line: '$0.40 / 1M msg', note: 'After first 1M (free)' }],
  route53:     [{ line: '$0.50 / zone / mo', note: 'Hosted zone' }, { line: '$0.60 / 1M queries', note: 'Standard queries' }],
  shield:      [{ line: 'Included', note: 'Shield Standard (free)' }, { line: '$3,000 / mo', note: 'Shield Advanced' }],
}

export default function InfraConfigPanel() {
  const { selectedComponentId, components, selectComponent, removeComponent, updateComponentLabel } = useInfraStore()

  const component = selectedComponentId
    ? components.find((c) => c.id === selectedComponentId)
    : null

  // Local label state for the editable input
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const commitLabel = useCallback(() => {
    if (editingLabel !== null && component && editingLabel.trim()) {
      updateComponentLabel(component.id, editingLabel.trim())
    }
    setEditingLabel(null)
  }, [editingLabel, component, updateComponentLabel])

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.currentTarget.blur() }
    if (e.key === 'Escape') { setEditingLabel(null) }
  }, [])

  const handleDelete = useCallback(() => {
    if (component) {
      selectComponent(null)
      removeComponent(component.id)
    }
  }, [component, selectComponent, removeComponent])

  if (!component) return null

  const cfg = AWS_NODE_CONFIG[component.type as AwsServiceType]
  if (!cfg) return null

  const pricing = PRICING_TABLE[component.type as AwsServiceType] ?? []
  const displayLabel = editingLabel !== null ? editingLabel : component.label

  return (
    <div
      style={{
        width: 300,
        height: '100%',
        background: '#FFFFFF',
        borderLeft: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 56,
          borderBottom: '1px solid #E5E7EB',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#F8FAFC',
            border: `1.5px solid ${cfg.color}33`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <img
            src={cfg.icon}
            alt={cfg.serviceLabel}
            width={26}
            height={26}
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Editable label — click to edit, blur/Enter to commit */}
          <input
            ref={labelInputRef}
            value={displayLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            onFocus={() => setEditingLabel(component.label)}
            onBlur={commitLabel}
            onKeyDown={handleLabelKeyDown}
            style={{
              fontSize:     13,
              fontWeight:   600,
              color:        '#111827',
              fontFamily:   '"DM Sans", sans-serif',
              background:   editingLabel !== null ? '#F0F9FF' : 'transparent',
              border:       editingLabel !== null ? '1px solid #BAE6FD' : '1px solid transparent',
              borderRadius: 4,
              padding:      editingLabel !== null ? '1px 5px' : '1px 0',
              outline:      'none',
              width:        '100%',
              cursor:       editingLabel !== null ? 'text' : 'pointer',
              transition:   'background 0.1s, border-color 0.1s',
            }}
            title="Click to rename"
          />
          <div
            style={{
              fontSize: 10,
              color: '#9CA3AF',
              fontWeight: 500,
              fontFamily: '"DM Sans", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginTop: 1,
            }}
          >
            {cfg.serviceLabel}
          </div>
        </div>

        <button
          onClick={() => selectComponent(null)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'none',
            border: '1px solid #E5E7EB',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
        >
          <X size={13} color="#6B7280" />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Description */}
        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: '#4B5563',
              lineHeight: 1.6,
              margin: 0,
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {cfg.description}
          </p>
        </div>

        {/* Pricing */}
        {pricing.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: '"DM Sans", sans-serif',
                marginBottom: 8,
              }}
            >
              Pricing (us-east-1, on-demand)
            </div>
            <div
              style={{
                background: '#0D0D0D',
                borderRadius: 6,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {pricing.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#F59E0B',
                      fontWeight: 600,
                    }}
                  >
                    {p.line}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: '#6B7280',
                      fontFamily: '"DM Sans", sans-serif',
                    }}
                  >
                    {p.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Live config form (Phase 5) ──────────────────────────────────── */}
        {/* InfraComponentForm routes to the right sub-form based on component.type.
            Every field change immediately calls updateComponentConfig → liveStats  */}
        <InfraComponentForm component={component} />

        {/* AWS docs link */}
        <a
          href={`https://aws.amazon.com/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 12,
            fontSize: 11,
            color: '#6B7280',
            fontFamily: '"DM Sans", sans-serif',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#3B82F6')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#6B7280')}
        >
          <ExternalLink size={11} strokeWidth={2} />
          View AWS documentation
        </a>

        {/* Delete component */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid #F3F4F6',
          }}
        >
          <button
            onClick={handleDelete}
            style={{
              width:        '100%',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          6,
              padding:      '8px 12px',
              background:   'transparent',
              border:       '1px solid #FCA5A5',
              borderRadius: 7,
              color:        '#EF4444',
              fontSize:     12,
              fontWeight:   600,
              fontFamily:   '"DM Sans", sans-serif',
              cursor:       'pointer',
              transition:   'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background    = '#FFF5F5'
              e.currentTarget.style.borderColor   = '#EF4444'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background    = 'transparent'
              e.currentTarget.style.borderColor   = '#FCA5A5'
            }}
          >
            <Trash2 size={12} strokeWidth={2} />
            Remove from canvas
          </button>
        </div>
      </div>
    </div>
  )
}

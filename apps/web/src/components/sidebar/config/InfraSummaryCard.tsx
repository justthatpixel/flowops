/**
 * InfraSummaryCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Summary card shown in the Deploy node config panel (DeployConfigForm) when
 * infrastructure has previously been designed for this pipeline node.
 *
 * Reads the InfraSnapshot saved by infraStore.closeDesigner() and displays:
 *   • Template name + scale tier label
 *   • Estimated monthly cost + capacity
 *   • Headroom status dot (green / amber / red)
 *   • "HCL ready" badge if Terraform was generated
 *   • "View / Edit" button — reopens InfraDesigner for this node
 *   • "Generate HCL" button — appears only when terraform hasn't been generated
 *
 * USED BY
 *   DeployConfigForm.tsx — renders this above the provider fields when a
 *   snapshot exists for the current pipeline node.
 */

import { Layers, ExternalLink, FileCode, Check } from 'lucide-react'
import { useInfraStore, SCALE_TIERS } from '@/store/infraStore'
import type { InfraSnapshot } from '@/types/infra'

// Human-friendly template labels
const TEMPLATE_LABELS: Record<string, string> = {
  'web-app':       'Web App',
  'serverless':    'Serverless',
  'microservices': 'Microservices',
  'api-workers':   'API + Workers',
  'ml-inference':  'ML Inference',
  'static-api':    'Static + API',
}

// Headroom dot colors
const HEADROOM_COLOR = { green: '#22C55E', amber: '#F59E0B', red: '#EF4444' }

interface Props {
  nodeId:   string
  snapshot: InfraSnapshot
}

export default function InfraSummaryCard({ nodeId, snapshot }: Props) {
  const { openDesigner } = useInfraStore()
  const tierDef  = SCALE_TIERS[snapshot.scaleTier]
  const template = TEMPLATE_LABELS[snapshot.templateId] ?? snapshot.templateId

  return (
    <div
      style={{
        border: '1px solid #E0E7FF',
        borderRadius: 8,
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        overflow: 'hidden',
        marginBottom: 2,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 12px 7px',
          borderBottom: '1px solid #E0E7FF',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Layers size={12} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#3730A3',
              fontFamily: '"DM Sans", sans-serif',
              lineHeight: 1.2,
            }}
          >
            {template}
          </div>
          <div
            style={{
              fontSize: 9,
              color: '#6366F1',
              fontFamily: '"DM Sans", sans-serif',
              marginTop: 1,
            }}
          >
            {tierDef.label} · {snapshot.componentCount} services
          </div>
        </div>

        {/* HCL ready badge */}
        {snapshot.hasTerraform && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            <Check size={8} color="#16A34A" strokeWidth={3} />
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#16A34A',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              HCL Ready
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '7px 12px',
        }}
      >
        {/* Cost */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#818CF8', fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Est. Cost
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3730A3', fontFamily: '"DM Sans", sans-serif', marginTop: 1 }}>
            {snapshot.costLabel}<span style={{ fontSize: 9, fontWeight: 400, color: '#818CF8' }}>/mo</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#C7D2FE', margin: '2px 10px' }} />

        {/* Capacity */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#818CF8', fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Capacity
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3730A3', fontFamily: '"DM Sans", sans-serif', marginTop: 1 }}>
            {snapshot.reqLabel}<span style={{ fontSize: 9, fontWeight: 400, color: '#818CF8' }}> req/min</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#C7D2FE', margin: '2px 10px' }} />

        {/* Headroom */}
        <div style={{ flex: 0.8 }}>
          <div style={{ fontSize: 9, color: '#818CF8', fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Health
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: HEADROOM_COLOR[snapshot.headroomStatus],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 600, color: HEADROOM_COLOR[snapshot.headroomStatus], fontFamily: '"DM Sans", sans-serif' }}>
              {snapshot.headroomStatus === 'green' ? 'Good' : snapshot.headroomStatus === 'amber' ? 'Watch' : 'Risk'}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px' }}>
        <button
          onClick={() => openDesigner(nodeId)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '6px 0',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border: 'none',
            borderRadius: 6,
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <ExternalLink size={11} strokeWidth={2.5} />
          View / Edit
        </button>

        {!snapshot.hasTerraform && (
          <button
            onClick={() => openDesigner(nodeId)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '6px 0',
              background: 'none',
              border: '1px solid #A5B4FC',
              borderRadius: 6,
              color: '#6366F1',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366F1' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#A5B4FC' }}
          >
            <FileCode size={11} strokeWidth={2} />
            Generate HCL
          </button>
        )}
      </div>
    </div>
  )
}

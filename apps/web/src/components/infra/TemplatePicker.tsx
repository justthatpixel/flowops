/**
 * TemplatePicker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Horizontal chip bar below the TopBar that lets users switch architecture
 * templates.  One chip per template defined in TEMPLATE_REGISTRY.
 *
 * Current templates (6):
 *   🌐 Web App          — ECS + ALB + RDS + ElastiCache (classic 3-tier)
 *   ⚡ Serverless        — API Gateway + Lambda + DynamoDB
 *   🔧 Microservices     — Multiple ECS services + SQS event bus + per-service DBs
 *   🔄 API + Workers     — API Server → SQS → worker fleet + Dead Letter Queue
 *   🤖 ML Inference      — Lambda sync + ECS GPU batch + S3 model registry
 *   📦 Static + API      — CloudFront → S3 static + API GW → Lambda + DynamoDB
 *
 * Active chip: blue border + light blue background.
 * Hover (inactive): slate border + off-white background.
 *
 * Clicking calls `setTemplate(id)` in infraStore which:
 *   1. Looks up the layout for (id, currentScaleTier) via getTierLayout()
 *   2. Replaces all components, edges, containers in the store
 *   3. Recomputes liveStats
 *
 * TEMPLATE_REGISTRY is the single source of truth — both this picker and the
 * store's getTierLayout() function consume it, so adding a new template here
 * automatically makes it selectable everywhere.
 */

import { useInfraStore } from '@/store/infraStore'
import { TEMPLATE_REGISTRY } from '@/data/infra-templates'
import type { ArchTemplateId } from '@/types/infra'

export default function TemplatePicker() {
  const { templateId, setTemplate } = useInfraStore()

  return (
    <div
      style={{
        height: 44,
        background: '#FAFAFA',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 6,
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: '"DM Sans", sans-serif',
          flexShrink: 0,
          marginRight: 4,
        }}
      >
        Template
      </span>

      {TEMPLATE_REGISTRY.map((tpl) => {
        const active = tpl.id === templateId
        return (
          <button
            key={tpl.id}
            onClick={() => setTemplate(tpl.id as ArchTemplateId)}
            title={tpl.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              height: 28,
              padding: '0 10px',
              border: active ? '1.5px solid #3B82F6' : '1px solid #E5E7EB',
              borderRadius: 6,
              background: active ? '#EFF6FF' : '#FFFFFF',
              color: active ? '#1D4ED8' : '#374151',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              fontFamily: '"DM Sans", sans-serif',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'border-color 0.12s, background 0.12s, color 0.12s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = '#94A3B8'
                e.currentTarget.style.background  = '#F8FAFC'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = '#E5E7EB'
                e.currentTarget.style.background  = '#FFFFFF'
              }
            }}
          >
            <span style={{ fontSize: 13 }}>{tpl.icon}</span>
            {tpl.label}
          </button>
        )
      })}
    </div>
  )
}

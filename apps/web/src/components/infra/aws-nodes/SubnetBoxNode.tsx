/**
 * SubnetBoxNode.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Background overlay node that draws a colored subnet box inside a VPC boundary.
 * Like VpcBoundaryNode it is non-interactive (pointerEvents: none).
 *
 * VISUAL VARIANTS (driven by `data.subnetType`):
 *   public  — light blue tint  (rgba 219,234,254 / 0.25)
 *   private — light green tint (rgba 220,252,231 / 0.20)
 *
 * Label color matches the tint:
 *   public  → #3B82F6 (blue)
 *   private → #22C55E (green)
 *
 * Used by: microservices template (public ALB subnet, private ECS/DB subnets).
 */

import type { NodeProps, Node } from '@xyflow/react'

interface SubnetData extends Record<string, unknown> {
  label: string
  subnetType?: 'public' | 'private'
}

type SubnetNode = Node<SubnetData>

export default function SubnetBoxNode({ data: rawData }: NodeProps<SubnetNode>) {
  const data = rawData as unknown as SubnetData
  const isPublic = data.subnetType === 'public'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        background: isPublic ? 'rgba(219,234,254,0.25)' : 'rgba(220,252,231,0.2)',
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -9,
          left: 10,
          background: '#F7F7F5',
          padding: '1px 6px',
          fontSize: 9,
          color: isPublic ? '#3B82F6' : '#22C55E',
          fontWeight: 700,
          fontFamily: '"DM Sans", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderRadius: 3,
        }}
      >
        {data.label}
      </div>
    </div>
  )
}

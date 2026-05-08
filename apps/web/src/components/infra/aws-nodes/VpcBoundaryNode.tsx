/**
 * VpcBoundaryNode.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Background overlay node that draws the dashed VPC boundary rectangle on the
 * InfraCanvas.  It is non-interactive (pointerEvents: none, selectable: false,
 * draggable: false) and always rendered below service nodes (zIndex: -1).
 *
 * Dimensions come from the `style.width / style.height` passed by InfraCanvas
 * (sourced from InfraContainer.width / .height in the store).
 *
 * The floating label chip sits above the top-left corner of the border using a
 * negative `top` offset so it straddles the boundary line.
 *
 * Used by: microservices template (VPC wraps ECS + RDS clusters).
 */

import type { NodeProps, Node } from '@xyflow/react'

interface VpcData extends Record<string, unknown> {
  label: string
}

type VpcNode = Node<VpcData>

export default function VpcBoundaryNode({ data: rawData }: NodeProps<VpcNode>) {
  const data = rawData as unknown as VpcData

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1.5px dashed #94a3b8',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.25)',
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -11,
          left: 14,
          background: '#F7F7F5',
          padding: '1px 8px',
          fontSize: 10,
          color: '#64748b',
          fontWeight: 700,
          fontFamily: '"DM Sans", sans-serif',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          borderRadius: 4,
          border: '1px solid #cbd5e1',
        }}
      >
        {data.label}
      </div>
    </div>
  )
}

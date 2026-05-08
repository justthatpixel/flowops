/**
 * NamespaceBox.tsx — ReactFlow container node for Kubernetes namespaces
 */

import type { NodeProps, Node } from '@xyflow/react'

interface NamespaceBoxData extends Record<string, unknown> {
  name: string
}

type NamespaceBoxNode = Node<NamespaceBoxData>

export default function NamespaceBox({ data: rawData }: NodeProps<NamespaceBoxNode>) {
  const data = rawData as NamespaceBoxData

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '1.5px dashed #94A3B8',
        borderRadius: 12,
        background: 'rgba(241, 245, 249, 0.5)',
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {/* Label top-left */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 14,
          fontSize: 10,
          fontWeight: 700,
          color: '#94A3B8',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: '"DM Sans", sans-serif',
          pointerEvents: 'none',
        }}
      >
        NAMESPACE: {data.name}
      </div>
    </div>
  )
}

/**
 * ServiceNode.tsx — ReactFlow custom node for Docker Compose services
 */

import { useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useContainerStore } from '@/store/containerStore'

export interface ServiceNodeData extends Record<string, unknown> {
  label: string
  config: Record<string, unknown>
}

type ServiceNode = Node<ServiceNodeData>

const COLOR = '#3B82F6'

export default function ServiceNode({ id, data: rawData }: NodeProps<ServiceNode>) {
  const data = rawData as ServiceNodeData
  const { selectNode, selectedNodeId } = useContainerStore()
  const selected = selectedNodeId === (id as string)
  const [hovered, setHovered] = useState(false)

  const config = data.config ?? {}
  const image = (config.image as string) || 'your-app:latest'
  const ports = (config.ports as string) || ''
  const replicas = (config.replicas as number) || 1
  const isConfigured = image !== 'your-app:latest' || ports !== ''

  const HANDLE_STYLE = {
    background: '#fff',
    border: '2px solid #d1d5db',
    width: 8,
    height: 8,
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectNode(id as string)}
      style={{
        width: 185,
        background: '#FFFFFF',
        border: selected ? `1.5px solid ${COLOR}` : hovered ? '1px solid #94A3B8' : '1px solid #E5E5E5',
        borderRadius: 8,
        borderLeft: `3px solid ${COLOR}`,
        boxShadow: selected
          ? `0 0 0 3px ${COLOR}22, 0 2px 6px rgba(0,0,0,0.08)`
          : hovered ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        fontFamily: '"DM Sans", sans-serif',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 10px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Icon chip */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `${COLOR}18`,
            border: `1px solid ${COLOR}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>

        {/* Label + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.label}
          </div>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: isConfigured ? COLOR : '#9CA3AF',
              background: isConfigured ? `${COLOR}14` : '#F3F4F6',
              borderRadius: 3,
              padding: '1px 5px',
              display: 'inline-block',
              marginTop: 2,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {isConfigured ? 'configured' : 'needs config'}
          </div>
        </div>
      </div>

      {/* Badges row */}
      <div style={{ padding: '0 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={{ fontSize: 9, color: '#6B7280', background: '#F3F4F6', borderRadius: 3, padding: '2px 5px', fontFamily: '"JetBrains Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
          {image}
        </span>
        {ports && (
          <span style={{ fontSize: 9, color: COLOR, background: `${COLOR}12`, borderRadius: 3, padding: '2px 5px', fontFamily: '"JetBrains Mono", monospace' }}>
            :{ports.split(':')[1] || ports}
          </span>
        )}
        {replicas > 1 && (
          <span style={{ fontSize: 9, color: '#8B5CF6', background: '#F3F0FF', borderRadius: 3, padding: '2px 5px' }}>
            ×{replicas}
          </span>
        )}
      </div>

      {/* ReactFlow handles */}
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
    </div>
  )
}

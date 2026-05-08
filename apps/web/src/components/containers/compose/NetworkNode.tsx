/**
 * NetworkNode.tsx — ReactFlow custom node for Docker Compose networks
 */

import { useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useContainerStore } from '@/store/containerStore'

export interface NetworkNodeData extends Record<string, unknown> {
  label: string
  config: Record<string, unknown>
}

type NetworkNode = Node<NetworkNodeData>

const COLOR = '#EC4899'

export default function NetworkNode({ id, data: rawData }: NodeProps<NetworkNode>) {
  const data = rawData as NetworkNodeData
  const { selectNode, selectedNodeId } = useContainerStore()
  const selected = selectedNodeId === (id as string)
  const [hovered, setHovered] = useState(false)

  const config = data.config ?? {}
  const driver = (config.driver as string) || 'bridge'
  const subnet = (config.subnet as string) || ''

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
      <div style={{ padding: '8px 10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.label}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: COLOR, background: `${COLOR}12`, borderRadius: 3, padding: '2px 5px' }}>
              {driver}
            </span>
            {subnet && (
              <span style={{ fontSize: 9, color: '#6B7280', background: '#F3F4F6', borderRadius: 3, padding: '2px 5px', fontFamily: '"JetBrains Mono", monospace' }}>
                {subnet}
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
    </div>
  )
}

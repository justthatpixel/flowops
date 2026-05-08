/**
 * K8sBaseNode.tsx — Shared base for all Kubernetes canvas nodes
 */

import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useContainerStore } from '@/store/containerStore'

export interface K8sBaseNodeProps {
  id: string
  label: string
  config: Record<string, unknown>
  color: string
  icon: React.ReactNode
  badge?: string
}

const HANDLE_STYLE = {
  background: '#fff',
  border: '2px solid #d1d5db',
  width: 8,
  height: 8,
}

export function K8sBaseNode({ id, label, config, color, icon, badge }: K8sBaseNodeProps) {
  const { selectNode, selectedNodeId } = useContainerStore()
  const selected = selectedNodeId === id
  const [hovered, setHovered] = useState(false)

  const namespace = (config.namespace as string) || 'default'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectNode(id)}
      style={{
        width: 185,
        background: selected ? `${color}08` : '#FFFFFF',
        border: selected ? `1.5px solid ${color}` : hovered ? '1px solid #94A3B8' : '1px solid #E5E5E5',
        borderRadius: 8,
        borderLeft: `3px solid ${color}`,
        boxShadow: selected
          ? `0 0 0 3px ${color}22, 0 2px 6px rgba(0,0,0,0.08)`
          : hovered ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        fontFamily: '"DM Sans", sans-serif',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}
    >
      {/* Content */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Icon chip */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Namespace badge */}
            <span
              style={{
                fontSize: 8,
                color: '#9CA3AF',
                background: '#F3F4F6',
                borderRadius: 3,
                padding: '1px 4px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {namespace}
            </span>
            {/* Config badge */}
            {badge && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color,
                  background: `${color}14`,
                  borderRadius: 3,
                  padding: '1px 4px',
                }}
              >
                {badge}
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

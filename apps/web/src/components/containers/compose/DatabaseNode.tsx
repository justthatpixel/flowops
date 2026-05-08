/**
 * DatabaseNode.tsx — ReactFlow custom node for Docker Compose databases
 */

import { useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useContainerStore } from '@/store/containerStore'

export interface DatabaseNodeData extends Record<string, unknown> {
  label: string
  config: Record<string, unknown>
}

type DatabaseNode = Node<DatabaseNodeData>

const DB_COLORS: Record<string, string> = {
  postgres: '#22C55E',
  mysql: '#3B82F6',
  redis: '#8B5CF6',
  mongo: '#F59E0B',
  mariadb: '#EC4899',
}

const DB_VERSIONS: Record<string, string> = {
  postgres: '15-alpine',
  mysql: '8',
  redis: '7-alpine',
  mongo: '7',
  mariadb: '11',
}

// Simple cylinder SVG for database icon
function CylinderIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke={color} strokeWidth="2" fill={`${color}22`} />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke={color} strokeWidth="2" fill="none" />
      <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  )
}

export default function DatabaseNode({ id, data: rawData }: NodeProps<DatabaseNode>) {
  const data = rawData as unknown as DatabaseNodeData
  const { selectNode, selectedNodeId } = useContainerStore()
  const selected = selectedNodeId === (id as string)
  const [hovered, setHovered] = useState(false)

  const config = data.config ?? {}
  const dbType = (config.dbType as string) || 'postgres'
  const version = (config.version as string) || DB_VERSIONS[dbType] || 'latest'
  const port = (config.port as number) || 5432
  const volumeMountPath = config.volumeMountPath as string

  const color = DB_COLORS[dbType] || '#6B7280'

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
        border: selected ? `1.5px solid ${color}` : hovered ? '1px solid #94A3B8' : '1px solid #E5E5E5',
        borderRadius: 8,
        borderLeft: `3px solid ${color}`,
        boxShadow: selected
          ? `0 0 0 3px ${color}22, 0 2px 6px rgba(0,0,0,0.08)`
          : hovered ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        fontFamily: '"DM Sans", sans-serif',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 10px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <CylinderIcon color={color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.label}
          </div>
          <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
            {dbType}
          </div>
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding: '0 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <span style={{ fontSize: 9, color: '#6B7280', background: '#F3F4F6', borderRadius: 3, padding: '2px 5px', fontFamily: '"JetBrains Mono", monospace' }}>
          v{version}
        </span>
        <span style={{ fontSize: 9, color: color, background: `${color}12`, borderRadius: 3, padding: '2px 5px', fontFamily: '"JetBrains Mono", monospace' }}>
          :{port}
        </span>
        {volumeMountPath && (
          <span style={{ fontSize: 9, color: '#6B7280', background: '#F3F4F6', borderRadius: 3, padding: '2px 5px', fontFamily: '"JetBrains Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
            vol
          </span>
        )}
      </div>

      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
    </div>
  )
}

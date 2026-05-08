import { Layers2 } from 'lucide-react'
import { NODE_CONFIG } from '@/lib/nodeConfig'
import type { NodeType } from '@/types/pipeline'

const CORE_NODES: NodeType[] = [
  'trigger',
  'build',
  'test',
  'docker',
  'deploy',
  'claude_task',
  'notify',
]

const OBS_NODES: NodeType[] = [
  'grafana',
  'prometheus',
  'trivy',
  'security_audit',
  'playwright',
  'seo_audit',
]

function PaletteTile({
  nodeType,
  onDragStart,
}: {
  nodeType: NodeType
  onDragStart: (e: React.DragEvent, nodeType: NodeType) => void
}) {
  const config = NODE_CONFIG[nodeType]
  const Icon = config.icon
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nodeType)}
      title={config.label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        background: config.color + '18',
        border: `1px solid ${config.color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        transition: 'transform 0.1s, box-shadow 0.1s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'scale(1.08)'
        el.style.boxShadow = `0 2px 8px ${config.color}40`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'scale(1)'
        el.style.boxShadow = 'none'
      }}
    >
      <Icon size={20} color={config.color} strokeWidth={1.8} />
    </div>
  )
}

export default function NodePalette() {
  const onNodeDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    const config = NODE_CONFIG[nodeType]
    e.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ nodeType, label: config.label })
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  const onGroupDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow-group', JSON.stringify({ label: 'Group' }))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      style={{
        width: 64,
        height: '100%',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 16,
        gap: 8,
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* ── Core pipeline node tiles ──────────────────────────────────── */}
      {CORE_NODES.map((nodeType) => (
        <PaletteTile
          key={nodeType}
          nodeType={nodeType}
          onDragStart={onNodeDragStart}
        />
      ))}

      {/* ── Observability separator ───────────────────────────────────── */}
      <div style={{ width: 32, height: 1, background: '#E5E5E5', marginTop: 4, marginBottom: 2 }} />
      <span
        style={{
          fontSize: 8,
          color: '#9CA3AF',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontFamily: '"DM Sans", sans-serif',
          userSelect: 'none',
        }}
      >
        OBS
      </span>

      {/* ── Observability node tiles ──────────────────────────────────── */}
      {OBS_NODES.map((nodeType) => (
        <PaletteTile
          key={nodeType}
          nodeType={nodeType}
          onDragStart={onNodeDragStart}
        />
      ))}

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div style={{ width: 32, height: 1, background: '#E5E5E5', marginTop: 4, marginBottom: 2 }} />

      {/* ── Group tile ──────────────────────────────────��─────────────── */}
      <div
        draggable
        onDragStart={onGroupDragStart}
        title="Group — drag onto canvas, then rename in config"
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: 'rgba(241,245,249,0.7)',
          border: '1.5px dashed #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          gap: 3,
          transition: 'transform 0.1s, box-shadow 0.1s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'scale(1.08)'
          el.style.boxShadow = '0 2px 8px #CBD5E180'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'scale(1)'
          el.style.boxShadow = 'none'
        }}
      >
        <Layers2 size={15} color="#94A3B8" strokeWidth={2} />
        <span
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: '#94A3B8',
            fontFamily: '"DM Sans", sans-serif',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          GROUP
        </span>
      </div>

      {/* ── Bottom label ──────────────────────────────────────────────── */}
      <div style={{ width: 32, height: 1, background: '#E5E5E5', marginTop: 2, marginBottom: 4 }} />
      <span
        style={{
          fontSize: 9,
          color: '#9CA3AF',
          fontWeight: 500,
          letterSpacing: '0.5px',
          writingMode: 'vertical-lr',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontFamily: '"DM Sans", sans-serif',
          userSelect: 'none',
        }}
      >
        DRAG TO ADD
      </span>
    </div>
  )
}

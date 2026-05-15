import { useState } from 'react'
import { NodeResizer } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { usePipelineStore } from '@/store/pipelineStore'
import type { GroupColor } from '@/types/pipeline'

export const GROUP_COLORS: Record<GroupColor, { border: string; bg: string; label: string; ring: string }> = {
  slate:  { border: '#CBD5E1', bg: 'rgba(241,245,249,0.50)', label: '#94A3B8',  ring: '#94A3B8' },
  orange: { border: '#FDBA74', bg: 'rgba(255,237,213,0.45)', label: '#F97316',  ring: '#F97316' },
  green:  { border: '#86EFAC', bg: 'rgba(220,252,231,0.45)', label: '#22C55E',  ring: '#22C55E' },
  purple: { border: '#C4B5FD', bg: 'rgba(237,233,254,0.45)', label: '#8B5CF6',  ring: '#8B5CF6' },
  blue:   { border: '#93C5FD', bg: 'rgba(219,234,254,0.45)', label: '#3B82F6',  ring: '#3B82F6' },
  pink:   { border: '#F9A8D4', bg: 'rgba(252,231,243,0.45)', label: '#EC4899',  ring: '#EC4899' },
}

interface GroupBoxData extends Record<string, unknown> {
  label: string
  color: GroupColor
}

type GroupBoxNode = Node<GroupBoxData>

export default function GroupBoxNode({ id: rawId, data: rawData }: NodeProps<GroupBoxNode>) {
  const id      = rawId  as unknown as string
  const data    = rawData as unknown as GroupBoxData
  const color   = data.color ?? 'slate'
  const palette = GROUP_COLORS[color]

  const [hovered, setHovered] = useState(false)
  const selectedGroupId   = usePipelineStore((s) => s.selectedGroupId)
  const updateGroupSize   = usePipelineStore((s) => s.updateGroupSize)
  const updateGroupPosition = usePipelineStore((s) => s.updateGroupPosition)
  const isSelected = selectedGroupId === id

  return (
    <>
      <NodeResizer
        isVisible={isSelected}
        minWidth={120}
        minHeight={60}
        lineStyle={{ borderColor: palette.ring, borderWidth: 1 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: palette.ring, border: 'none' }}
        onResizeEnd={(_, params) => {
          updateGroupSize(id, params.width, params.height)
          updateGroupPosition(id, params.x, params.y)
        }}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          border: isSelected
            ? `2px solid ${palette.ring}`
            : `1.5px dashed ${palette.border}`,
          borderRadius: 10,
          background: palette.bg,
          position: 'relative',
          boxSizing: 'border-box',
          cursor: 'grab',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: isSelected
            ? `0 0 0 3px ${palette.ring}22`
            : hovered
              ? `0 0 0 2px ${palette.border}55`
              : 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: palette.label,
            fontFamily: '"DM Sans", sans-serif',
            textTransform: 'uppercase',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {data.label}
        </span>
      </div>
    </>
  )
}

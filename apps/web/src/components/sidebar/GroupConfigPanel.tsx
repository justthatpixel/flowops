/**
 * GroupConfigPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Right-side config panel that slides in when a group box is clicked.
 *
 * Sections:
 *   1. Header — editable group label + × close button
 *   2. Color picker — 6 preset swatches
 *   3. Members list — node icon + label + × remove per node
 *   4. Delete Group — destructive button at bottom
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Layers2, Trash2 } from 'lucide-react'
import { usePipelineStore } from '@/store/pipelineStore'
import { GROUP_COLORS } from '@/components/canvas/nodes/GroupBoxNode'
import { NODE_CONFIG } from '@/lib/nodeConfig'
import type { GroupColor } from '@/types/pipeline'

// ─── Color swatch labels ──────────────────────────────────────────────────────

const COLOR_LABELS: Record<GroupColor, string> = {
  slate:  'Slate',
  orange: 'Orange',
  green:  'Green',
  purple: 'Purple',
  blue:   'Blue',
  pink:   'Pink',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroupConfigPanel() {
  const selectedGroupId  = usePipelineStore((s) => s.selectedGroupId)
  const groupConfigs     = usePipelineStore((s) => s.groupConfigs)
  const nodes            = usePipelineStore((s) => s.nodes)
  const selectGroup      = usePipelineStore((s) => s.selectGroup)
  const updateGroupLabel = usePipelineStore((s) => s.updateGroupLabel)
  const setGroupColor    = usePipelineStore((s) => s.setGroupColor)
  const setGroupMember   = usePipelineStore((s) => s.setGroupMember)
  const removeGroup      = usePipelineStore((s) => s.removeGroup)

  const groupId = selectedGroupId!
  const config  = groupConfigs[groupId]

  // ── Local label state for inline editing ─────────────────────────────────
  const [labelDraft, setLabelDraft] = useState(config?.label ?? '')
  const labelRef = useRef<HTMLInputElement>(null)

  // Sync if config label changes externally (e.g. different group selected)
  useEffect(() => {
    setLabelDraft(config?.label ?? '')
  }, [groupId, config?.label])

  const commitLabel = useCallback(() => {
    const trimmed = labelDraft.trim()
    if (trimmed && trimmed !== config?.label) {
      updateGroupLabel(groupId, trimmed)
    } else if (!trimmed) {
      // Revert to previous label if blank
      setLabelDraft(config?.label ?? '')
    }
  }, [labelDraft, config?.label, groupId, updateGroupLabel])

  const onLabelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        labelRef.current?.blur()
      } else if (e.key === 'Escape') {
        setLabelDraft(config?.label ?? '')
        labelRef.current?.blur()
      }
    },
    [config?.label],
  )

  if (!config) return null

  // ── Member nodes ──────────────────────────────────────────────────────────
  const memberNodes = nodes.filter((n) => config.memberIds.includes(n.id))

  // ── Helpers ───────────────────────────────────────────────────────────────
  const palette = GROUP_COLORS[config.color]

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 280,
        background: '#FFFFFF',
        borderLeft: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          borderBottom: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          flexShrink: 0,
        }}
      >
        {/* Icon chip */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: palette.bg,
            border: `1.5px dashed ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Layers2 size={13} color={palette.label} strokeWidth={2} />
        </div>

        {/* Editable label */}
        <input
          ref={labelRef}
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={onLabelKeyDown}
          maxLength={32}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
            fontFamily: '"DM Sans", sans-serif',
            padding: 0,
            minWidth: 0,
          }}
        />

        {/* Close button */}
        <button
          onClick={() => selectGroup(null)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 5,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
            flexShrink: 0,
            padding: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = '#F3F4F6'
            el.style.color = '#374151'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'transparent'
            el.style.color = '#9CA3AF'
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>

        {/* ── Color picker ────────────────────────────────────────────────── */}
        <SectionLabel>Color</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(Object.keys(GROUP_COLORS) as GroupColor[]).map((c) => {
            const p = GROUP_COLORS[c]
            const isActive = config.color === c
            return (
              <button
                key={c}
                title={COLOR_LABELS[c]}
                onClick={() => setGroupColor(groupId, c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: isActive ? `2.5px solid ${p.ring}` : `2px solid ${p.border}`,
                  background: p.bg,
                  cursor: 'pointer',
                  outline: isActive ? `2px solid ${p.ring}44` : 'none',
                  outlineOffset: 1,
                  transition: 'transform 0.1s, outline 0.1s',
                  flexShrink: 0,
                  padding: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
              />
            )
          })}
        </div>

        {/* ── Members ─────────────────────────────────────────────────────── */}
        <SectionLabel>
          Members
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontWeight: 500,
              color: '#9CA3AF',
              background: '#F3F4F6',
              borderRadius: 10,
              padding: '1px 6px',
            }}
          >
            {memberNodes.length}
          </span>
        </SectionLabel>

        {memberNodes.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: '#9CA3AF',
              fontStyle: 'italic',
              marginBottom: 8,
              lineHeight: 1.5,
            }}
          >
            Drag pipeline nodes onto this group box to add members.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {memberNodes.map((node) => {
              const nc = NODE_CONFIG[node.data.nodeType]
              const Icon = nc.icon
              return (
                <div
                  key={node.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: '#F9FAFB',
                    border: '1px solid #F0F0F0',
                  }}
                >
                  {/* Node icon chip */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: nc.color + '18',
                      border: `1px solid ${nc.color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={12} color={nc.color} strokeWidth={2} />
                  </div>

                  {/* Node label */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#374151',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}
                  >
                    {node.data.label}
                  </span>

                  {/* Remove button */}
                  <button
                    onClick={() => setGroupMember(groupId, node.id, false)}
                    title="Remove from group"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D1D5DB',
                      flexShrink: 0,
                      padding: 0,
                      transition: 'color 0.1s, background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.color = '#EF4444'
                      el.style.background = '#FEF2F2'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.color = '#D1D5DB'
                      el.style.background = 'transparent'
                    }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Footer — delete group ───────────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #F0F0F0',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => removeGroup(groupId)}
          style={{
            width: '100%',
            height: 34,
            borderRadius: 6,
            border: '1px solid #FECACA',
            background: '#FFF5F5',
            color: '#EF4444',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: '"DM Sans", sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = '#FEE2E2'
            el.style.borderColor = '#FCA5A5'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = '#FFF5F5'
            el.style.borderColor = '#FECACA'
          }}
        >
          <Trash2 size={13} strokeWidth={2} />
          Delete Group
        </button>
      </div>
    </motion.div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#6B7280',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  )
}

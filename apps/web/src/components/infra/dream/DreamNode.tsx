/**
 * DreamNode.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Glowing dark-theme ReactFlow node for Dream Mode canvas (Phase 6).
 *
 * Visual design:
 *   • Dark card (#141420) with a neon accent border matching the service type
 *   • Animated pulse-glow box-shadow on the card
 *   • AWS service icon + label
 *   • Source (bottom) and Target (top) handles
 *
 * CSS keyframes are injected once via a hidden <style> tag so we can use
 * inline styles for everything else (no CSS file dependency).
 */

import { useEffect, memo }          from 'react'
import { Handle, Position }         from '@xyflow/react'
import { AWS_NODE_CONFIG }          from '@/lib/awsNodeConfig'
import type { AwsServiceType }      from '@/types/infra'

// ─── Inject keyframes once ────────────────────────────────────────────────────

const STYLE_ID = 'flowops-dream-keyframes'

function injectKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id    = STYLE_ID
  style.textContent = `
    @keyframes dreamPulse {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50%       { opacity: 1.0; transform: scale(1.015); }
    }
    @keyframes dreamGlow {
      0%, 100% { box-shadow: 0 0 8px 1px var(--dream-color, #8B5CF6),
                              0 0 0 1px rgba(255,255,255,0.06) inset; }
      50%       { box-shadow: 0 0 18px 4px var(--dream-color, #8B5CF6),
                              0 0 0 1px rgba(255,255,255,0.10) inset; }
    }
    @keyframes dreamSelected {
      0%, 100% { box-shadow: 0 0 24px 6px var(--dream-color, #8B5CF6),
                              0 0 0 2px var(--dream-color, #8B5CF6) inset; }
      50%       { box-shadow: 0 0 38px 10px var(--dream-color, #8B5CF6),
                              0 0 0 2px var(--dream-color, #8B5CF6) inset; }
    }
    .dream-handle {
      width: 8px !important;
      height: 8px !important;
      background: rgba(255,255,255,0.15) !important;
      border: 1px solid rgba(255,255,255,0.25) !important;
      border-radius: 50% !important;
      transition: background 0.2s !important;
    }
    .dream-handle:hover {
      background: rgba(139,92,246,0.6) !important;
      border-color: #A78BFA !important;
    }
  `
  document.head.appendChild(style)
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DreamNodeData extends Record<string, unknown> {
  serviceType: AwsServiceType
  label:       string
  selected?:   boolean
  /** Optional override: mark this node as "constrained" (Reality Bridge). */
  constrained?: boolean
  /** Optional override: mark as newly added in constrained view. */
  added?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

function DreamNode({ data }: { data: DreamNodeData }) {
  useEffect(injectKeyframes, [])

  const cfg       = AWS_NODE_CONFIG[data.serviceType] ?? AWS_NODE_CONFIG.ecs
  const color     = cfg.color
  const isSelected   = data.selected   ?? false
  const isConstrained = data.constrained ?? false

  // Border color: dimmed when constrained
  const borderColor = isConstrained
    ? 'rgba(255,255,255,0.12)'
    : `${color}88`

  return (
    <div
      style={{
        // CSS custom property picked up by keyframe animations
        ['--dream-color' as string]: color,

        width:        130,
        background:   isConstrained ? '#1A1A2A' : '#141420',
        border:       `1px solid ${borderColor}`,
        borderRadius: 10,
        padding:      '10px 12px 9px',
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          6,
        cursor:       'default',
        animation:    isSelected
          ? 'dreamSelected 2.4s ease-in-out infinite'
          : 'dreamGlow 3.5s ease-in-out infinite',
        transition:   'border-color 0.2s',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Subtle gradient sheen */}
      <div
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '40%',
          background: `linear-gradient(180deg, ${color}0A 0%, transparent 100%)`,
          pointerEvents: 'none',
          borderRadius: '10px 10px 0 0',
        }}
      />

      {/* Constrained badge */}
      {isConstrained && (
        <span
          style={{
            position:     'absolute',
            top:          4,
            right:        5,
            fontSize:     8,
            fontWeight:   800,
            color:        '#F59E0B',
            background:   'rgba(251,191,36,0.15)',
            borderRadius: 3,
            padding:      '1px 4px',
            letterSpacing:'0.06em',
            textTransform:'uppercase',
            fontFamily:   '"DM Sans", sans-serif',
          }}
        >
          ✦ budget
        </span>
      )}

      {/* Added badge (Reality Bridge) */}
      {data.added && (
        <span
          style={{
            position:     'absolute',
            top:          4,
            right:        5,
            fontSize:     8,
            fontWeight:   800,
            color:        '#22C55E',
            background:   'rgba(34,197,94,0.15)',
            borderRadius: 3,
            padding:      '1px 4px',
            letterSpacing:'0.06em',
            textTransform:'uppercase',
            fontFamily:   '"DM Sans", sans-serif',
          }}
        >
          + new
        </span>
      )}

      {/* Icon */}
      <div
        style={{
          width:        36,
          height:       36,
          borderRadius: 8,
          background:   `${color}18`,
          border:       `1px solid ${color}33`,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          flexShrink:   0,
          animation:    'dreamPulse 4s ease-in-out infinite',
        }}
      >
        <img
          src={cfg.icon}
          alt={cfg.serviceLabel}
          style={{ width: 22, height: 22, objectFit: 'contain' }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize:   10,
          fontWeight: 600,
          color:      isConstrained ? '#6B7280' : '#E5E7EB',
          fontFamily: '"DM Sans", sans-serif',
          textAlign:  'center',
          lineHeight: 1.3,
          maxWidth:   106,
          overflow:   'hidden',
          textOverflow:'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.label}
      </span>

      {/* Service type chip */}
      <span
        style={{
          fontSize:     9,
          fontWeight:   600,
          color:        isConstrained ? '#4B5563' : color,
          background:   isConstrained ? 'rgba(255,255,255,0.04)' : `${color}18`,
          borderRadius: 4,
          padding:      '1px 6px',
          letterSpacing:'0.03em',
          fontFamily:   '"DM Sans", sans-serif',
        }}
      >
        {cfg.serviceLabel}
      </span>

      {/* Handles */}
      <Handle type="target" position={Position.Top}    className="dream-handle" />
      <Handle type="source" position={Position.Bottom} className="dream-handle" />
    </div>
  )
}

export default memo(DreamNode)

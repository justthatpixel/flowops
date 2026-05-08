/**
 * DreamCanvas.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dark-theme ReactFlow canvas for Dream Mode (Phase 6).
 *
 * Features:
 *   • Black (#0F0F13) background with dot-grid pattern
 *   • Glowing DreamNode components for each AWS service
 *   • Animated "flowing" edges: dashed SVG path with CSS offset animation
 *   • Smooth fit-view on first mount / when components change
 *   • Animated entrance sweep (nodes fade-slide in staggered)
 *   • Read-only (no drag/drop) — canvas is for viewing, not editing
 *
 * Props:
 *   components  InfraComponent[]   — AWS services to render
 *   edges       InfraEdge[]        — directed connections
 *   isLoading   boolean            — shows a shimmer skeleton while generating
 */

import { useCallback, useMemo, useEffect, useRef, memo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  getBezierPath,
  type Node,
  type Edge,
  type EdgeProps,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import DreamNode, { type DreamNodeData } from './DreamNode'
import type { InfraComponent, InfraEdge } from '@/types/infra'

// ─── Inject animated-edge keyframe once ──────────────────────────────────────

const EDGE_STYLE_ID = 'flowops-dream-edge-keyframes'

function injectEdgeStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(EDGE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id    = EDGE_STYLE_ID
  style.textContent = `
    @keyframes dashFlow {
      to { stroke-dashoffset: -24; }
    }
    .dream-edge-path {
      animation: dashFlow 0.9s linear infinite;
      stroke-dasharray: 6 6;
    }
    .react-flow__controls {
      background: rgba(20,20,32,0.85) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 8px !important;
      box-shadow: none !important;
    }
    .react-flow__controls-button {
      background: transparent !important;
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      color: #9CA3AF !important;
      fill: #9CA3AF !important;
    }
    .react-flow__controls-button:hover {
      background: rgba(139,92,246,0.15) !important;
      fill: #A78BFA !important;
    }
    .react-flow__controls-button:last-child {
      border-bottom: none !important;
    }
  `
  document.head.appendChild(style)
}

// ─── Custom animated edge ─────────────────────────────────────────────────────

function DreamEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })

  return (
    <g>
      {/* Glowing base stroke */}
      <path
        id={`${id}-base`}
        d={edgePath}
        fill="none"
        stroke="rgba(139,92,246,0.20)"
        strokeWidth={2}
      />
      {/* Animated flowing stroke */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="rgba(167,139,250,0.75)"
        strokeWidth={1.5}
        className="dream-edge-path"
      />
    </g>
  )
}

const EDGE_TYPES  = { dreamEdge: DreamEdge }
const NODE_TYPES  = { dreamNode: DreamNode }

// ─── Data transforms ─────────────────────────────────────────────────────────

function toRFNodes(components: InfraComponent[]): Node<DreamNodeData>[] {
  return components.map((c) => ({
    id:       c.id,
    type:     'dreamNode',
    position: c.position,
    data: {
      serviceType: c.type,
      label:       c.label,
    },
    draggable:   false,
    selectable:  false,
    connectable: false,
  }))
}

function toRFEdges(edges: InfraEdge[]): Edge[] {
  return edges.map((e) => ({
    id:        e.id,
    source:    e.source,
    target:    e.target,
    type:      'dreamEdge',
    animated:  false,   // we handle animation ourselves
    label:     e.label,
    labelStyle:{
      fill:       '#6B7280',
      fontSize:   9,
      fontFamily: '"DM Sans", sans-serif',
    },
    labelBgStyle: {
      fill: 'rgba(15,15,19,0.85)',
    },
  }))
}

// ─── Loading shimmer ─────────────────────────────────────────────────────────

function DreamShimmer() {
  return (
    <div
      style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            20,
      }}
    >
      {/* Pulsing orb */}
      <div
        style={{
          width:        64,
          height:       64,
          borderRadius: '50%',
          background:   'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(96,165,250,0.3))',
          boxShadow:    '0 0 40px rgba(139,92,246,0.4)',
          animation:    'dreamPulse 1.5s ease-in-out infinite',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize:   14,
            fontWeight: 600,
            color:      '#A78BFA',
            fontFamily: '"DM Sans", sans-serif',
            marginBottom: 4,
          }}
        >
          Architecting your dream…
        </div>
        <div
          style={{
            fontSize:   11,
            color:      '#4B5563',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          No constraints. No compromises.
        </div>
      </div>
      {/* Shimmer bars */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {[100, 140, 80, 120].map((w, i) => (
          <div
            key={i}
            style={{
              width:        w,
              height:       60,
              borderRadius: 10,
              background:   'rgba(139,92,246,0.10)',
              border:       '1px solid rgba(139,92,246,0.15)',
              animation:    `dreamPulse ${1.2 + i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Inner canvas (needs ReactFlow context) ───────────────────────────────────

interface DreamCanvasInnerProps {
  components: InfraComponent[]
  edges:      InfraEdge[]
}

function DreamCanvasInner({ components, edges }: DreamCanvasInnerProps) {
  const { fitView } = useReactFlow()
  const prevLen     = useRef(0)

  useEffect(injectEdgeStyles, [])

  const rfNodes = useMemo(() => toRFNodes(components), [components])
  const rfEdges = useMemo(() => toRFEdges(edges),      [edges])

  // Fit view whenever the component list changes
  useEffect(() => {
    if (rfNodes.length > 0 && rfNodes.length !== prevLen.current) {
      prevLen.current = rfNodes.length
      setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 50)
    }
  }, [rfNodes.length, fitView])

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50)
  }, [fitView])

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onInit={onInit}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      minZoom={0.2}
      maxZoom={2}
      style={{ background: 'transparent' }}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="#222235"
      />
      <Controls
        showInteractive={false}
        position="bottom-right"
      />
    </ReactFlow>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface DreamCanvasProps {
  components: InfraComponent[]
  edges:      InfraEdge[]
  isLoading?: boolean
}

function DreamCanvas({ components, edges, isLoading }: DreamCanvasProps) {
  return (
    <div
      style={{
        flex:       1,
        position:   'relative',
        background: '#0F0F13',
        overflow:   'hidden',
      }}
    >
      {isLoading ? (
        <DreamShimmer />
      ) : (
        <ReactFlowProvider>
          <DreamCanvasInner components={components} edges={edges} />
        </ReactFlowProvider>
      )}
    </div>
  )
}

export default memo(DreamCanvas)

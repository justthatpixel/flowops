import { useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Layers } from 'lucide-react'
import { NODE_CONFIG, STATUS_COLORS } from '@/lib/nodeConfig'
import { useInfraStore } from '@/store/infraStore'
import type { PipelineNodeData } from '@/types/pipeline'

type PipelineNode = Node<PipelineNodeData>

const STATUS_LABELS: Record<string, string> = {
  idle:    'Idle',
  pending: 'Pending',
  running: 'Running...',
  success: 'Success',
  failed:  'Failed',
  skipped: 'Skipped',
}

export default function BaseNode({ id, data: rawData, selected }: NodeProps<PipelineNode>) {
  const data = rawData as unknown as PipelineNodeData
  const { label, nodeType, status, aiSummary, suggestedFix } = data
  const config = NODE_CONFIG[nodeType]
  const Icon = config.icon
  const statusColor = STATUS_COLORS[status] ?? '#E5E5E5'
  const isRunning = status === 'running'
  const isFailed = status === 'failed'
  const [showTooltip, setShowTooltip] = useState(false)

  // Phase 7: read infra snapshot for this node (deploy nodes only)
  const infraSnapshot = useInfraStore((s) => s.infraSnapshots[id as string])
  const hasInfra = nodeType === 'deploy' && !!infraSnapshot

  return (
    <div
      style={{
        width: 185,
        background: '#FFFFFF',
        border: selected ? '1px solid #3B82F6' : '1px solid #E5E5E5',
        borderRadius: 8,
        boxShadow: selected
          ? '0 0 0 2px rgba(59,130,246,0.15), 0 1px 4px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: statusColor,
          transition: 'background 0.3s ease',
          borderRadius: '8px 0 0 8px',
        }}
      />

      <div style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }}>
        {/* Icon + label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: config.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={15} color="#ffffff" strokeWidth={2} />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.3,
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {label}
          </span>
        </div>

        {/* Status row */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
          onMouseEnter={() => isFailed && aiSummary && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Pulse ring for running */}
          {isRunning && (
            <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: '#3B82F6',
                  opacity: 0.6,
                }}
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: '#3B82F6',
                }}
              />
            </div>
          )}
          {!isRunning && (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColor,
                flexShrink: 0,
                transition: 'background 0.3s ease',
              }}
            />
          )}
          <span
            style={{
              fontSize: 11,
              color: statusColor,
              fontWeight: 500,
              fontFamily: '"DM Sans", sans-serif',
              transition: 'color 0.3s ease',
            }}
          >
            {STATUS_LABELS[status] ?? status}
          </span>

          {isFailed && aiSummary && (
            <AlertCircle size={11} color="#EF4444" strokeWidth={2} style={{ marginLeft: 'auto', flexShrink: 0 }} />
          )}

          <AnimatePresence>
            {showTooltip && aiSummary && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  width: 220,
                  background: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: 6,
                  padding: '8px 10px',
                  zIndex: 9999,
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#FCA5A5', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>
                  AI Diagnosis
                </div>
                <div style={{ fontSize: 10, color: '#D1D5DB', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>
                  {aiSummary}
                </div>
                {suggestedFix && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #374151' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#86EFAC', marginBottom: 2, fontFamily: '"DM Sans", sans-serif' }}>
                      Fix
                    </div>
                    <div style={{ fontSize: 10, color: '#D1D5DB', lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' }}>
                      {suggestedFix}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Phase 7: infra badge — shown on deploy nodes that have a snapshot */}
      {hasInfra && infraSnapshot && (
        <div
          style={{
            borderTop: '1px solid #F3F4F6',
            padding: '5px 12px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#F9FAFB',
          }}
        >
          <Layers size={9} color="#6366F1" strokeWidth={2.5} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#6366F1',
              fontFamily: '"DM Sans", sans-serif',
              letterSpacing: '0.02em',
              flex: 1,
            }}
          >
            {infraSnapshot.templateId.replace(/-/g, ' ')} · {infraSnapshot.costLabel}/mo
          </span>
          {infraSnapshot.hasTerraform && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#16A34A',
                background: '#DCFCE7',
                borderRadius: 3,
                padding: '1px 4px',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              HCL
            </span>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#fff', border: '2px solid #d1d5db' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#fff', border: '2px solid #d1d5db' }}
      />
    </div>
  )
}

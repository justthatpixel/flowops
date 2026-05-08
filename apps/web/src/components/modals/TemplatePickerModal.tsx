import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, Server, Globe, Brain, ArrowRight, Zap, type LucideIcon } from 'lucide-react'
import { usePipelineStore } from '@/store/pipelineStore'
import { WEB_APP_NODES, WEB_APP_EDGES } from '@/templates/webApp'
import { API_SERVICE_NODES, API_SERVICE_EDGES } from '@/templates/apiService'
import { STATIC_SITE_NODES, STATIC_SITE_EDGES } from '@/templates/staticSite'
import { ML_PIPELINE_NODES, ML_PIPELINE_EDGES } from '@/templates/mlPipeline'
import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

interface TemplateOption {
  id: string
  name: string
  pipelineName: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  stages: string[]
  nodes: Node<PipelineNodeData>[]
  edges: Edge[]
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'web-app',
    name: 'Web App',
    pipelineName: 'Web App Pipeline',
    description: 'Full-stack web application with Docker build and cloud deployment.',
    icon: Globe,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    stages: ['Trigger', 'Build', 'Test', 'Docker', 'Registry', 'Deploy'],
    nodes: WEB_APP_NODES,
    edges: WEB_APP_EDGES,
  },
  {
    id: 'api-service',
    name: 'API Service',
    pipelineName: 'API Service Pipeline',
    description: 'Backend API with unit and integration tests, containerised deployment.',
    icon: Server,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    stages: ['Trigger', 'Build', 'Unit Tests', 'Integration', 'Docker', 'Deploy'],
    nodes: API_SERVICE_NODES,
    edges: API_SERVICE_EDGES,
  },
  {
    id: 'static-site',
    name: 'Static Site',
    pipelineName: 'Static Site Pipeline',
    description: 'Lightweight static site pipeline — install, build, deploy to Vercel or S3.',
    icon: GitBranch,
    color: '#22C55E',
    bgColor: '#F0FDF4',
    stages: ['Trigger', 'Install', 'Build', 'Deploy'],
    nodes: STATIC_SITE_NODES,
    edges: STATIC_SITE_EDGES,
  },
  {
    id: 'ml-pipeline',
    name: 'ML Pipeline',
    pipelineName: 'ML Pipeline',
    description: 'Machine learning workflow with data validation, training, and Claude evaluation.',
    icon: Brain,
    color: '#EC4899',
    bgColor: '#FDF2F8',
    stages: ['Trigger', 'Validate', 'Train', 'Evaluate', 'Claude Review', 'Deploy'],
    nodes: ML_PIPELINE_NODES,
    edges: ML_PIPELINE_EDGES,
  },
]

export default function TemplatePickerModal() {
  const { showTemplatePicker, loadTemplate, setShowTemplatePicker } = usePipelineStore()

  const handleSelect = (t: TemplateOption) => {
    loadTemplate(t.nodes, t.edges, t.pipelineName)
  }

  return (
    <AnimatePresence>
      {showTemplatePicker && (
        <>
          {/* Backdrop — click outside to dismiss (only when a template is already loaded) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowTemplatePicker(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(3px)',
              zIndex: 40,
              cursor: 'pointer',
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                width: '100%',
                maxWidth: 720,
                overflow: 'hidden',
                pointerEvents: 'auto',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '28px 32px 20px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={16} color="#fff" strokeWidth={2.5} />
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#111827',
                      fontFamily: '"DM Sans", sans-serif',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Choose a pipeline template
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: '#6B7280',
                    margin: 0,
                    fontFamily: '"DM Sans", sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  Select a pre-built template to get started instantly. You can customise every node after loading.
                </p>
              </div>

              {/* Template grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  padding: 24,
                }}
              >
                {TEMPLATES.map((t, i) => (
                  <TemplateCard key={t.id} template={t} index={i} onSelect={handleSelect} />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function TemplateCard({
  template: t,
  index,
  onSelect,
}: {
  template: TemplateOption
  index: number
  onSelect: (t: TemplateOption) => void
}) {
  const Icon = t.icon

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
      onClick={() => onSelect(t)}
      style={{
        background: '#FAFAFA',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '18px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{
        scale: 1.015,
        boxShadow: `0 4px 20px ${t.color}22`,
        borderColor: t.color,
        backgroundColor: t.bgColor,
      }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Icon + name row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: t.bgColor,
              border: `1px solid ${t.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={t.color} strokeWidth={1.8} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {t.name}
          </span>
        </div>
        <ArrowRight size={15} color={t.color} strokeWidth={2} />
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: '#6B7280',
          margin: 0,
          lineHeight: 1.55,
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        {t.description}
      </p>

      {/* Stage pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {t.stages.map((stage, si) => (
          <span
            key={si}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: t.color,
              background: t.bgColor,
              border: `1px solid ${t.color}30`,
              borderRadius: 4,
              padding: '2px 7px',
              fontFamily: '"DM Sans", sans-serif',
              letterSpacing: '0.02em',
            }}
          >
            {stage}
          </span>
        ))}
      </div>

      {/* Node count badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 40,
          fontSize: 10,
          color: '#9CA3AF',
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 500,
        }}
      >
        {t.nodes.length} nodes
      </div>
    </motion.button>
  )
}

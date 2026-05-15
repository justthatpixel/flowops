import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Server, Globe, Brain, ArrowRight, Zap,
  ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { usePipelineStore } from '@/store/pipelineStore'
import { WEB_APP_NODES, WEB_APP_EDGES }             from '@/templates/webApp'
import { API_SERVICE_NODES, API_SERVICE_EDGES }     from '@/templates/apiService'
import { STATIC_SITE_NODES, STATIC_SITE_EDGES }     from '@/templates/staticSite'
import { ML_PIPELINE_NODES, ML_PIPELINE_EDGES }     from '@/templates/mlPipeline'
import { PROD_GRADE_NODES, PROD_GRADE_EDGES }       from '@/templates/productionGrade'
import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

interface TemplateOption {
  id:           string
  name:         string
  pipelineName: string
  description:  string
  icon:         LucideIcon
  color:        string
  bgColor:      string
  stages:       string[]
  nodes:        Node<PipelineNodeData>[]
  edges:        Edge[]
  badge?:       string   // e.g. "NEW" or "ENTERPRISE"
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'production-grade',
    name: 'Production Grade',
    pipelineName: 'Production Grade Pipeline',
    description: 'Enterprise CI/CD with SonarQube, Trivy scanning, E2E tests, Prometheus health checks, and Grafana monitoring — GitLab-triggered, full observability stack.',
    icon: ShieldCheck,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    badge: 'ENTERPRISE',
    stages: ['GitLab', 'Build', 'SonarQube', 'Tests', 'Docker', 'Trivy', 'ECR', 'Staging', 'E2E', 'Prometheus', 'Prod', 'Grafana', 'Notify'],
    nodes: PROD_GRADE_NODES,
    edges: PROD_GRADE_EDGES,
  },
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
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowTemplatePicker(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.40)',
              backdropFilter: 'blur(4px)',
              zIndex: 40, cursor: 'pointer',
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50, padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: '0 24px 64px rgba(0,0,0,0.20)',
                width: '100%',
                maxWidth: 820,
                overflow: 'hidden',
                pointerEvents: 'auto',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '24px 28px 18px',
                borderBottom: '1px solid #F3F4F6',
                background: 'linear-gradient(135deg, #FAFBFF 0%, #F5F3FF 100%)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Zap size={17} color="#fff" strokeWidth={2.5} />
                  </div>
                  <span style={{
                    fontSize: 18, fontWeight: 700, color: '#111827',
                    fontFamily: '"DM Sans", sans-serif', letterSpacing: '-0.3px',
                  }}>
                    Choose a pipeline template
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5 }}>
                  Select a pre-built template to get started instantly. Every node is fully customisable after loading.
                </p>
              </div>

              {/* Template grid — featured card full-width, rest 2-col */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Featured: Production Grade */}
                <TemplateCard
                  template={TEMPLATES[0]}
                  index={0}
                  onSelect={handleSelect}
                  featured
                />
                {/* Regular 2-col grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {TEMPLATES.slice(1).map((t, i) => (
                    <TemplateCard key={t.id} template={t} index={i + 1} onSelect={handleSelect} />
                  ))}
                </div>
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
  featured = false,
}: {
  template: TemplateOption
  index: number
  onSelect: (t: TemplateOption) => void
  featured?: boolean
}) {
  const Icon = t.icon

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
      onClick={() => onSelect(t)}
      style={{
        background: featured ? `linear-gradient(135deg, ${t.bgColor}, #FFFFFF)` : '#FAFAFA',
        border: featured ? `1.5px solid ${t.color}40` : '1px solid #E5E7EB',
        borderRadius: featured ? 10 : 9,
        padding: featured ? '18px 22px' : '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: featured ? 'row' : 'column',
        alignItems: featured ? 'flex-start' : undefined,
        gap: featured ? 18 : 10,
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}
      whileHover={{
        scale: 1.008,
        boxShadow: `0 4px 20px ${t.color}28`,
        borderColor: t.color,
      }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Badge */}
      {t.badge && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.07em',
          color: t.color, background: t.bgColor,
          border: `1px solid ${t.color}35`,
          borderRadius: 4, padding: '2px 7px',
          fontFamily: '"DM Sans", sans-serif',
        }}>
          {t.badge}
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: featured ? 44 : 36,
        height: featured ? 44 : 36,
        borderRadius: featured ? 10 : 8,
        background: t.bgColor,
        border: `1px solid ${t.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={featured ? 22 : 18} color={t.color} strokeWidth={1.8} />
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: featured ? 5 : 4 }}>
          <span style={{
            fontSize: featured ? 15 : 13,
            fontWeight: 700, color: '#111827',
            fontFamily: '"DM Sans", sans-serif',
          }}>
            {t.name}
          </span>
          {!featured && <ArrowRight size={13} color={t.color} strokeWidth={2} style={{ marginLeft: 'auto' }} />}
        </div>

        <p style={{
          fontSize: featured ? 12 : 11,
          color: '#6B7280', margin: '0 0 10px',
          lineHeight: 1.55,
          fontFamily: '"DM Sans", sans-serif',
        }}>
          {t.description}
        </p>

        {/* Stage pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {t.stages.map((stage, si) => (
            <span
              key={si}
              style={{
                fontSize: 9, fontWeight: 600,
                color: t.color, background: t.bgColor,
                border: `1px solid ${t.color}30`,
                borderRadius: 4, padding: '2px 6px',
                fontFamily: '"DM Sans", sans-serif',
                letterSpacing: '0.02em',
              }}
            >
              {stage}
            </span>
          ))}
        </div>
      </div>

      {/* Node count */}
      <div style={{
        position: 'absolute',
        bottom: featured ? 14 : 12,
        right: featured ? 16 : 14,
        fontSize: 9, color: '#D1D5DB',
        fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
      }}>
        {t.nodes.length} nodes
      </div>
    </motion.button>
  )
}

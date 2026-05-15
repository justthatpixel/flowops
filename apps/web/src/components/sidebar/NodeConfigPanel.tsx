import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, FileCode, Sparkles, Download, RefreshCw, Loader2, BarChart2, Layers, GitBranch, Copy, Check, Globe } from 'lucide-react'
import { usePipelineStore } from '@/store/pipelineStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useContainerStore } from '@/store/containerStore'
import { useInfraStore } from '@/store/infraStore'
import { NODE_CONFIG } from '@/lib/nodeConfig'
import { useAI } from '@/hooks/useAI'
import { getPlaceholderFiles } from '@/lib/placeholderFiles'
import { generateFullPipeline } from '@/lib/generators/githubActionsGenerator'
import type {
  NodeConfig,
  TriggerConfig,
  BuildConfig,
  DeployConfig,
  DockerConfig,
  TestConfig,
  GeneratedFile,
} from '@/types/pipeline'

function getNodeBrowserUrl(nodeType: string, config: NodeConfig): string {
  if (nodeType === 'trigger') {
    const tc = config as TriggerConfig
    if (tc.provider === 'github') return tc.repo ? `https://github.com/${tc.repo}` : 'https://github.com'
    if (tc.provider === 'gitlab') return tc.repo ? `https://gitlab.com/${tc.repo}` : 'https://gitlab.com'
  }
  if (nodeType === 'docker') return 'https://hub.docker.com'
  if (nodeType === 'deploy') return 'https://console.aws.amazon.com'
  if (nodeType === 'security_audit') return 'https://www.sonarqube.org'
  if (nodeType === 'trivy') return 'https://trivy.dev'
  if (nodeType === 'prometheus') return 'https://prometheus.io'
  if (nodeType === 'grafana') return 'https://grafana.com'
  return 'https://github.com'
}
import TriggerConfigForm from './config/TriggerConfigForm'
import BuildConfigForm from './config/BuildConfigForm'
import DeployConfigForm from './config/DeployConfigForm'
import DockerConfigForm from './config/DockerConfigForm'
import GenericConfigForm from './config/GenericConfigForm'

type Tab = 'config' | 'files' | 'export'

export default function NodeConfigPanel() {
  const { nodes, edges, selectedNodeId, selectNode, updateNodeConfig, updateNodeLabel } = usePipelineStore()
  const { openNodeDashboard } = useDashboardStore()
  const openContainerDesigner = useContainerStore((s) => s.openDesigner)
  const { openBrowser } = useInfraStore()
  const { generateFiles } = useAI()
  const [tab, setTab] = useState<Tab>('config')
  const [editingLabel, setEditingLabel] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const { label, nodeType, config, generatedFiles } = node.data
  const nodeConfig = NODE_CONFIG[nodeType]
  const Icon = nodeConfig.icon

  // Files: use stored generated files, or fall back to placeholder files from config
  const storedFiles = generatedFiles ?? []
  const placeholderFiles = getPlaceholderFiles(node.data)
  const files = storedFiles.length > 0 ? storedFiles : placeholderFiles

  const handleGenerate = async () => {
    if (!selectedNodeId) return
    setGenerating(true)
    setGenerateError(null)
    try {
      await generateFiles(selectedNodeId)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleLabelClick = () => {
    setDraftLabel(label)
    setEditingLabel(true)
  }

  const commitLabel = () => {
    const trimmed = draftLabel.trim()
    if (trimmed) updateNodeLabel(node.id, trimmed)
    setEditingLabel(false)
  }

  const handleConfigChange = (newConfig: NodeConfig) => {
    updateNodeConfig(node.id, newConfig)
  }

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    flex: 1,
    height: '100%',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    color: active ? '#3B82F6' : '#6B7280',
    fontFamily: '"DM Sans", sans-serif',
    transition: 'color 0.15s, border-color 0.15s',
  })

  // Show export tab only for pipeline-relevant nodes
  const canExport = ['trigger', 'build', 'test', 'docker', 'deploy'].includes(nodeType)

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        background: '#FFFFFF',
        borderLeft: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 64,
          borderBottom: '1px solid #E5E7EB',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            background: nodeConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} color="#fff" strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editingLabel ? (
            <input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') setEditingLabel(false)
              }}
              style={{
                width: '100%',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderBottom: '2px solid #3B82F6',
                outline: 'none',
                background: 'transparent',
                fontFamily: '"DM Sans", sans-serif',
                color: '#111827',
                padding: '2px 0',
              }}
            />
          ) : (
            <button
              onClick={handleLabelClick}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'text',
                padding: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111827',
                  fontFamily: '"DM Sans", sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#9CA3AF',
                  fontWeight: 500,
                  fontFamily: '"DM Sans", sans-serif',
                  marginTop: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {nodeConfig.label}
              </div>
            </button>
          )}
        </div>

        <button
          onClick={() => openBrowser(getNodeBrowserUrl(nodeType, config))}
          title="Open in Source Browser"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'none',
            border: '1px solid #C7D2FE',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#6366F1',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          <Globe size={13} strokeWidth={2} />
        </button>

        <button
          onClick={() => selectNode(null)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'none',
            border: '1px solid #E5E7EB',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
        >
          <X size={13} color="#6B7280" />
        </button>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 38,
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <button style={TAB_STYLE(tab === 'config')} onClick={() => setTab('config')}>
          Config
        </button>
        <button style={TAB_STYLE(tab === 'files')} onClick={() => setTab('files')}>
          Files {files.length > 0 ? `(${files.length})` : ''}
        </button>
        {canExport && (
          <button style={TAB_STYLE(tab === 'export')} onClick={() => setTab('export')}>
            Export
          </button>
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 14px 0', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => {
            if (selectedNodeId) openNodeDashboard(selectedNodeId)
          }}
          style={quickBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#E5E7EB' }}
        >
          <BarChart2 size={13} strokeWidth={2} color="#6B7280" />
          View Dashboard
        </button>

        {nodeType === 'docker' && (
          <button
            onClick={() => openContainerDesigner()}
            style={{
              ...quickBtnStyle,
              border: 'none',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              color: '#FFFFFF',
              fontWeight: 700,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Layers size={13} strokeWidth={2} />
            Design Container Stack
          </button>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'config' ? (
          <ConfigContent
            nodeType={nodeType}
            config={config}
            onChange={handleConfigChange}
          />
        ) : tab === 'files' ? (
          <FilesContent
            files={files}
            generating={generating}
            error={generateError}
            onGenerate={handleGenerate}
            isAiGenerated={storedFiles.length > 0}
          />
        ) : (
          <ExportContent nodes={nodes} edges={edges} currentNodeId={node.id} />
        )}
      </div>
    </motion.div>
  )
}

const quickBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '7px 0',
  borderRadius: 7,
  border: '1px solid #E5E7EB',
  background: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  fontFamily: '"DM Sans", sans-serif',
  transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
  width: '100%',
}

// ─── Config content ───────────────────────────────────────────────────────────

function ConfigContent({
  nodeType,
  config,
  onChange,
}: {
  nodeType: string
  config: NodeConfig | undefined
  onChange: (c: NodeConfig) => void
}) {
  if (nodeType === 'trigger') {
    return (
      <TriggerConfigForm
        config={(config ?? { provider: 'github', event: 'push' }) as TriggerConfig}
        onChange={onChange}
      />
    )
  }
  if (nodeType === 'build') {
    return (
      <BuildConfigForm
        config={(config ?? { ciProvider: 'github_actions', runtime: 'node' }) as BuildConfig}
        onChange={onChange}
      />
    )
  }
  if (nodeType === 'deploy') {
    return (
      <DeployConfigForm
        config={(config ?? { provider: 'aws' }) as DeployConfig}
        onChange={onChange}
      />
    )
  }
  if (nodeType === 'docker') {
    return (
      <DockerConfigForm
        config={(config ?? {}) as DockerConfig}
        onChange={onChange}
      />
    )
  }
  return (
    <GenericConfigForm
      nodeType={nodeType as import('@/types/pipeline').NodeType}
      config={config as import('@/types/pipeline').TestConfig | import('@/types/pipeline').ClaudeTaskConfig | import('@/types/pipeline').NotifyConfig | undefined}
      onChange={onChange}
    />
  )
}

// ─── Export content ───────────────────────────────────────────────────────────

function ExportContent({
  nodes,
  edges,
  currentNodeId,
}: {
  nodes: import('@xyflow/react').Node<import('@/types/pipeline').PipelineNodeData>[]
  edges: import('@xyflow/react').Edge[]
  currentNodeId: string
}) {
  const [copied, setCopied] = useState(false)

  // Walk the pipeline graph to find all connected nodes
  const pipelineNodes = collectPipelineNodes(nodes, edges)

  // Extract configs by node type
  const triggerNode  = pipelineNodes.find((n) => n.data.nodeType === 'trigger')
  const buildNode    = pipelineNodes.find((n) => n.data.nodeType === 'build')
  const testNode     = pipelineNodes.find((n) => n.data.nodeType === 'test')
  const dockerNode   = pipelineNodes.find((n) => n.data.nodeType === 'docker')
  const deployNode   = pipelineNodes.find((n) => n.data.nodeType === 'deploy')

  const trigger = (triggerNode?.data.config as TriggerConfig | undefined)
    ?? { provider: 'github' as const, branch: 'main', event: 'push' as const }
  const build  = buildNode?.data.config as BuildConfig | undefined
  const test   = testNode?.data.config as TestConfig | undefined
  const docker = dockerNode?.data.config as DockerConfig | undefined
  const deploy = deployNode?.data.config as DeployConfig | undefined

  // Determine pipeline name
  const pipelineName = triggerNode?.data.config
    ? (triggerNode.data.config as TriggerConfig).workflowName
    : undefined

  const yaml = generateFullPipeline({
    pipelineName: pipelineName ?? 'CI/CD Pipeline',
    trigger,
    build,
    test,
    docker,
    deploy,
  })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(yaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ci-cd.yml'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Pipeline map */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: 8,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Detected pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {pipelineNodes.map((n, i) => {
            const nc = NODE_CONFIG[n.data.nodeType]
            const NIcon = nc.icon
            const isCurrent = n.id === currentNodeId
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 7px',
                    borderRadius: 4,
                    background: isCurrent ? nc.color + '18' : '#F9FAFB',
                    border: `1px solid ${isCurrent ? nc.color + '40' : '#F0F0F0'}`,
                    fontSize: 10,
                    fontWeight: 600,
                    color: isCurrent ? nc.color : '#6B7280',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  <NIcon size={10} strokeWidth={2} />
                  {n.data.label}
                </div>
                {i < pipelineNodes.length - 1 && (
                  <span style={{ color: '#D1D5DB', fontSize: 10 }}>→</span>
                )}
              </div>
            )
          })}
          {pipelineNodes.length === 0 && (
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
              No connected pipeline nodes found
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 0',
            borderRadius: 6,
            border: '1px solid #E5E7EB',
            background: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            color: copied ? '#22C55E' : '#374151',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'color 0.15s',
          }}
        >
          {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
          {copied ? 'Copied!' : 'Copy YAML'}
        </button>
        <button
          onClick={handleDownload}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 0',
            borderRadius: 6,
            border: '1px solid #DDD6FE',
            background: '#F5F3FF',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            color: '#7C3AED',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          <Download size={12} strokeWidth={2} />
          Download
        </button>
      </div>

      {/* File path hint */}
      <div
        style={{
          fontSize: 10,
          color: '#6B7280',
          background: '#F9FAFB',
          border: '1px solid #F0F0F0',
          borderRadius: 5,
          padding: '5px 8px',
          fontFamily: '"JetBrains Mono", monospace',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <GitBranch size={10} strokeWidth={2} />
        .github/workflows/ci-cd.yml
      </div>

      {/* YAML preview */}
      <pre
        style={{
          margin: 0,
          background: '#111827',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 10,
          lineHeight: 1.6,
          color: '#E5E7EB',
          fontFamily: '"JetBrains Mono", monospace',
          overflowX: 'auto',
          whiteSpace: 'pre',
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        <YamlHighlight code={yaml} />
      </pre>
    </div>
  )
}

// ─── YAML syntax highlighter (minimal, no deps) ───────────────────────────────

function YamlHighlight({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        // Comment
        if (/^\s*#/.test(line)) {
          return <span key={i} style={{ color: '#6B7280' }}>{line}{'\n'}</span>
        }
        // Key: value
        const keyMatch = line.match(/^(\s*)([^:]+)(:)(.*)$/)
        if (keyMatch) {
          const [, ws, key, colon, rest] = keyMatch
          const isTopLevel = ws === ''
          return (
            <span key={i}>
              {ws}
              <span style={{ color: isTopLevel ? '#93C5FD' : '#6EE7B7' }}>{key}</span>
              <span style={{ color: '#9CA3AF' }}>{colon}</span>
              <span style={{ color: rest.trim().startsWith("'") || rest.trim().startsWith('"') ? '#FDE68A' : '#F9FAFB' }}>{rest}</span>
              {'\n'}
            </span>
          )
        }
        // List item
        if (/^\s*-/.test(line)) {
          return (
            <span key={i} style={{ color: '#C4B5FD' }}>
              {line}{'\n'}
            </span>
          )
        }
        return <span key={i}>{line}{'\n'}</span>
      })}
    </>
  )
}

// ─── Graph traversal ──────────────────────────────────────────────────────────

function collectPipelineNodes(
  nodes: import('@xyflow/react').Node<import('@/types/pipeline').PipelineNodeData>[],
  edges: import('@xyflow/react').Edge[],
): import('@xyflow/react').Node<import('@/types/pipeline').PipelineNodeData>[] {
  const PIPELINE_TYPES = new Set(['trigger', 'build', 'test', 'docker', 'deploy', 'notify'])

  // Find the trigger node as starting point; fall back to all pipeline nodes
  const triggerNode = nodes.find((n) => n.data.nodeType === 'trigger')
  if (!triggerNode) {
    return nodes.filter((n) => PIPELINE_TYPES.has(n.data.nodeType))
  }

  // BFS from trigger
  const visited = new Set<string>()
  const result: typeof nodes = []
  const queue = [triggerNode.id]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const node = nodes.find((n) => n.id === id)
    if (node && PIPELINE_TYPES.has(node.data.nodeType)) {
      result.push(node)
    }

    // Follow outgoing edges
    edges
      .filter((e) => e.source === id)
      .forEach((e) => { if (!visited.has(e.target)) queue.push(e.target) })
  }

  return result
}

// ─── Files content ────────────────────────────────────────────────────────────

function downloadAllFiles(files: GeneratedFile[]) {
  const parts = files.map(
    (f) => `${'='.repeat(60)}\n# ${f.path}\n${'='.repeat(60)}\n${f.content}\n`,
  )
  const blob = new Blob([parts.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'flowops-files.txt'
  a.click()
  URL.revokeObjectURL(url)
}

function FilesContent({
  files,
  generating,
  error,
  onGenerate,
  isAiGenerated,
}: {
  files: GeneratedFile[]
  generating: boolean
  error: string | null
  onGenerate: () => void
  isAiGenerated: boolean
}) {
  if (generating) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 180,
          gap: 10,
          color: '#6B7280',
        }}
      >
        <Loader2
          size={24}
          strokeWidth={1.5}
          style={{ animation: 'spin 1s linear infinite', color: '#7C3AED' }}
        />
        <p style={{ fontSize: 12, margin: 0, fontFamily: '"DM Sans", sans-serif' }}>
          Claude is writing your files…
        </p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#F5F3FF',
            border: '1px solid #DDD6FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileCode size={20} color="#7C3AED" strokeWidth={1.5} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 4px', fontFamily: '"DM Sans", sans-serif' }}>
            No files yet
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5 }}>
            Generate Dockerfile, YAML, and IaC<br />files tailored to this node's config.
          </p>
        </div>
        {error && (
          <p style={{ fontSize: 11, color: '#EF4444', margin: 0, fontFamily: '"DM Sans", sans-serif', textAlign: 'center' }}>
            {error}
          </p>
        )}
        <button
          onClick={onGenerate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          <Sparkles size={13} strokeWidth={2} />
          Enhance with Claude
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
          {files.length} file{files.length !== 1 ? 's' : ''}
          {isAiGenerated ? ' · AI-enhanced' : ' · from config'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onGenerate}
            title="Enhance with Claude"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: '1px solid #E5E7EB',
              borderRadius: 5,
              padding: '4px 8px',
              fontSize: 11,
              color: '#6B7280',
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <RefreshCw size={11} strokeWidth={2} />
            Claude
          </button>
          <button
            onClick={() => downloadAllFiles(files)}
            title="Download all files"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#F5F3FF',
              border: '1px solid #DDD6FE',
              borderRadius: 5,
              padding: '4px 8px',
              fontSize: 11,
              color: '#7C3AED',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <Download size={11} strokeWidth={2} />
            Download
          </button>
        </div>
      </div>

      {/* File blocks */}
      {files.map((file) => (
        <FileBlock key={file.path} file={file} />
      ))}
    </div>
  )
}

// ─── Single file block with copy button ──────────────────────────────────────

function FileBlock({ file }: { file: GeneratedFile }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280',
          fontFamily: '"JetBrains Mono", monospace',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <FileCode size={11} />
          {file.path}
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: 3,
            padding: '2px 6px',
            fontSize: 9,
            color: copied ? '#22C55E' : '#9CA3AF',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {copied ? <Check size={9} /> : <Copy size={9} />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          background: '#111827',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 10,
          lineHeight: 1.6,
          color: '#E5E7EB',
          fontFamily: '"JetBrains Mono", monospace',
          overflowX: 'auto',
          whiteSpace: 'pre',
          maxHeight: 300,
          overflowY: 'auto',
        }}
      >
        {file.content}
      </pre>
    </div>
  )
}

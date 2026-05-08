/**
 * ContainerDesigner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen overlay for the Container & Cluster Designer.
 * Triggered from the Docker node config panel.
 *
 * Layout:
 *   [TopBar]
 *   [Palette | Canvas (+ abs panels) | ConfigPanel]
 *   [YamlPanel / HelmPanel overlays]
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ReactFlowProvider } from '@xyflow/react'
import { ArrowLeft, FileCode, Star, Download, ChevronRight } from 'lucide-react'
import { useContainerStore } from '@/store/containerStore'

import ModePicker from './ModePicker'
import ContainerPalette from './ContainerPalette'
import ContainerConfigPanel from './ContainerConfigPanel'
import ComposeCanvas from './compose/ComposeCanvas'
import KubernetesCanvas from './kubernetes/KubernetesCanvas'
import ManagedCanvas from './managed/ManagedCanvas'
import CloudSelector from './managed/CloudSelector'
import ReplicaSlider from './panels/ReplicaSlider'
import ResourceCalculator from './panels/ResourceCalculator'
import YamlPanel from './panels/YamlPanel'
import HelmPanel from './panels/HelmPanel'
import ComposeToK8s from './upgrade/ComposeToK8s'

// ─── Mode badge ───────────────────────────────────────────────────────────────

const MODE_META = {
  compose:    { label: 'Docker Compose', color: '#2496ED', bg: '#EFF8FF' },
  kubernetes: { label: 'Kubernetes',     color: '#326CE5', bg: '#EEF2FF' },
  managed:    { label: 'Managed K8s',    color: '#7C3AED', bg: '#F5F3FF' },
} as const

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ onShowYaml, onShowHelm }: { onShowYaml: () => void; onShowHelm: () => void }) {
  const { mode, closeDesigner, generatedFiles } = useContainerStore()
  const meta = mode ? MODE_META[mode] : null

  const handleExport = () => {
    if (Object.keys(generatedFiles).length === 0) return
    const parts = Object.entries(generatedFiles).map(
      ([name, content]) => `${'='.repeat(60)}\n# ${name}\n${'='.repeat(60)}\n${content}\n`
    )
    const blob = new Blob([parts.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'container-stack.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      style={{
        height: 52,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E5E5',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 10,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Back */}
      <button
        onClick={closeDesigner}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: '1px solid #E5E7EB',
          borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
          fontSize: 12, fontWeight: 500, color: '#374151',
          fontFamily: '"DM Sans", sans-serif', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <ArrowLeft size={13} strokeWidth={2} />
        Back
      </button>

      {/* Icon */}
      <div
        style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>

      {/* Title */}
      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: '"DM Sans", sans-serif' }}>
        Container Designer
      </span>

      {/* Mode badge */}
      {meta && (
        <span
          style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30`,
            fontFamily: '"DM Sans", sans-serif', letterSpacing: '0.04em',
          }}
        >
          {meta.label}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Action buttons — only show when a mode is selected */}
      {mode && (
        <>
          <button
            onClick={onShowYaml}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#F8FAFC', border: '1px solid #E5E7EB',
              borderRadius: 6, padding: '5px 11px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#374151',
              fontFamily: '"DM Sans", sans-serif', transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
          >
            <FileCode size={13} strokeWidth={2} color="#6B7280" />
            YAML
            <ChevronRight size={11} color="#9CA3AF" />
          </button>

          {(mode === 'kubernetes' || mode === 'managed') && (
            <button
              onClick={onShowHelm}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#F5F3FF', border: '1px solid #7C3AED30',
                borderRadius: 6, padding: '5px 11px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#7C3AED',
                fontFamily: '"DM Sans", sans-serif', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#EDE9FE')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F5F3FF')}
            >
              <Star size={12} strokeWidth={2} />
              Helm
              <ChevronRight size={11} color="#A78BFA" />
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={Object.keys(generatedFiles).length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: Object.keys(generatedFiles).length === 0 ? '#F9FAFB' : '#111827',
              border: 'none', borderRadius: 6, padding: '5px 11px', cursor: Object.keys(generatedFiles).length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              color: Object.keys(generatedFiles).length === 0 ? '#9CA3AF' : '#FFFFFF',
              fontFamily: '"DM Sans", sans-serif', transition: 'opacity 0.15s',
              opacity: Object.keys(generatedFiles).length === 0 ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (Object.keys(generatedFiles).length > 0) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <Download size={12} strokeWidth={2} />
            Export
          </button>
        </>
      )}
    </div>
  )
}

// ─── Managed canvas wrapper (needs cloudProvider from store) ──────────────────

function ManagedCanvasWithProvider() {
  const { cloudProvider, setCloudProvider } = useContainerStore()
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <CloudSelector active={cloudProvider} onChange={setCloudProvider} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ReactFlowProvider>
          <ManagedCanvas />
        </ReactFlowProvider>
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
          <ReplicaSlider />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 }}>
          <ResourceCalculator />
        </div>
      </div>
    </div>
  )
}

// ─── Canvas area ──────────────────────────────────────────────────────────────

function CanvasArea({ onShowUpgrade }: { onShowUpgrade: () => void }) {
  const { mode } = useContainerStore()

  if (mode === 'compose') {
    return (
      <ReactFlowProvider>
        <ComposeCanvas onUpgrade={onShowUpgrade} />
      </ReactFlowProvider>
    )
  }

  if (mode === 'kubernetes') {
    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ReactFlowProvider>
          <KubernetesCanvas />
        </ReactFlowProvider>
        {/* Abs overlays */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
          <ReplicaSlider />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 }}>
          <ResourceCalculator />
        </div>
      </div>
    )
  }

  if (mode === 'managed') {
    return (
      <ManagedCanvasWithProvider />
    )
  }

  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContainerDesigner() {
  const { mode, setMode, showYamlPanel, showHelmPanel, toggleYamlPanel, toggleHelmPanel, selectedNodeId } = useContainerStore()
  const [showUpgrade, setShowUpgrade] = useState(false)

  return (
    <motion.div
      key="container-designer"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#F7F7F5',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <TopBar onShowYaml={toggleYamlPanel} onShowHelm={toggleHelmPanel} />

      {/* Body */}
      {!mode ? (
        /* Mode picker — choose Compose / K8s / Managed */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
              Choose your stack type
            </div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              Select a mode to start designing your container infrastructure
            </div>
          </div>
          <ModePicker onSelect={(m) => setMode(m)} />
        </div>
      ) : (
        /* Designer layout */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Left palette rail */}
          <ContainerPalette />

          {/* Center canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <CanvasArea onShowUpgrade={() => setShowUpgrade(true)} />
          </div>

          {/* Right config panel — absolutely positioned, overlays canvas */}
          <AnimatePresence>
            {selectedNodeId && <ContainerConfigPanel key={selectedNodeId} />}
          </AnimatePresence>
        </div>
      )}

      {/* YAML Panel — full-screen overlay z-200 */}
      <AnimatePresence>
        {showYamlPanel && <YamlPanel onClose={toggleYamlPanel} />}
      </AnimatePresence>

      {/* Helm Panel — full-screen overlay z-200 */}
      <AnimatePresence>
        {showHelmPanel && <HelmPanel />}
      </AnimatePresence>

      {/* Compose → K8s upgrade modal */}
      <AnimatePresence>
        {showUpgrade && (
          <ComposeToK8s onClose={() => setShowUpgrade(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

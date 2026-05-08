/**
 * HelmPanel.tsx — Full-screen overlay for Helm chart generation/viewing
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Download, RefreshCw, ChevronRight } from 'lucide-react'
import { useContainerStore } from '@/store/containerStore'
import { generateHelm } from '@/lib/generators/helmGenerator'
import { generateManifests } from '@/lib/generators/manifestGenerator'

// ─── Syntax highlighting (same as YamlPanel) ─────────────────────────────────

function highlightYaml(content: string): React.ReactNode {
  const lines = content.split('\n')
  return lines.map((line, i) => {
    let node: React.ReactNode

    if (line.trim().startsWith('#')) {
      node = <span style={{ color: '#6B7280' }}>{line}</span>
    } else if (line.includes(':')) {
      const colonIdx = line.indexOf(':')
      const key = line.substring(0, colonIdx)
      const rest = line.substring(colonIdx + 1)
      const indent = key.match(/^(\s*)/)?.[1] ?? ''
      const keyName = key.trim()

      let valueNode: React.ReactNode
      if (/^\s*-?\s*\d+(\.\d+)?\s*$/.test(rest) || rest.trim() === 'true' || rest.trim() === 'false') {
        valueNode = <><span style={{ color: '#e2e8f0' }}>:</span><span style={{ color: '#F59E0B' }}>{rest}</span></>
      } else if (rest.trim() === '' || rest.trim() === '|' || rest.trim() === '>') {
        valueNode = <span style={{ color: '#e2e8f0' }}>:{rest}</span>
      } else {
        valueNode = <><span style={{ color: '#e2e8f0' }}>:</span><span style={{ color: '#22C55E' }}>{rest}</span></>
      }

      node = (
        <>
          <span style={{ color: '#e2e8f0' }}>{indent}</span>
          <span style={{ color: '#7C3AED' }}>{keyName}</span>
          {valueNode}
        </>
      )
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('{{')) {
      node = <span style={{ color: '#e2e8f0' }}>{line}</span>
    } else {
      node = <span style={{ color: '#94A3B8' }}>{line}</span>
    }

    return (
      <div key={i} style={{ minHeight: '1.5em' }}>
        {node}
      </div>
    )
  })
}

function downloadBundle(files: Record<string, string>) {
  const parts = Object.entries(files).map(
    ([path, content]) => `${'='.repeat(60)}\n# ${path}\n${'='.repeat(60)}\n${content}\n`
  )
  const blob = new Blob([parts.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'helm-chart.txt'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── File tree ────────────────────────────────────────────────────────────────

function FileTree({
  files,
  activeFile,
  onSelect,
}: {
  files: Record<string, string>
  activeFile: string | null
  onSelect: (f: string) => void
}) {
  const paths = Object.keys(files)

  // Group by directory
  const grouped: Record<string, string[]> = {}
  paths.forEach((p) => {
    const parts = p.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
    if (!grouped[dir]) grouped[dir] = []
    grouped[dir].push(p)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Object.entries(grouped).map(([dir, files]) => (
        <div key={dir}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#6B7280',
              fontFamily: '"JetBrains Mono", monospace',
              padding: '8px 12px 4px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {dir === '.' ? 'root' : dir}
          </div>
          {files.map((f) => {
            const filename = f.split('/').pop()
            const isActive = f === activeFile
            return (
              <button
                key={f}
                onClick={() => onSelect(f)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  width: '100%',
                  padding: '5px 12px 5px 20px',
                  background: isActive ? '#F5F3FF' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                  borderLeft: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {isActive && <ChevronRight size={10} color="#7C3AED" />}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: isActive ? '#7C3AED' : '#374151',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {filename}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HelmPanel() {
  const { nodes, edges, namespaces, generatedFiles, setGeneratedFiles, toggleHelmPanel } = useContainerStore()
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const helmFiles = Object.fromEntries(
    Object.entries(generatedFiles).filter(([k]) => k.startsWith('helm/'))
  )

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 400)) // slight delay for UX
    const manifests = generateManifests(nodes, edges, namespaces)
    const helm = generateHelm(manifests, 'my-app')
    setGeneratedFiles({ ...generatedFiles, ...manifests, ...helm })
    const firstHelmFile = Object.keys(helm)[0]
    setActiveFile(firstHelmFile ?? null)
    setGenerating(false)
  }

  const activeContent = activeFile ? (helmFiles[activeFile] ?? '') : ''

  return (
    <motion.div
      key="helm-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#111111',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          background: '#1A1A1A',
          borderBottom: '1px solid #2D2D2D',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: '#7C3AED20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', flex: 1 }}>
          Helm Chart
        </span>

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#7C3AED', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 14px', fontSize: 12,
            fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: '"DM Sans", sans-serif', opacity: generating ? 0.7 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = '#6D28D9' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#7C3AED' }}
        >
          <RefreshCw size={12} strokeWidth={2} style={generating ? { animation: 'spin 1s linear infinite' } : {}} />
          {generating ? 'Generating…' : 'Generate Chart'}
        </button>

        {Object.keys(helmFiles).length > 0 && (
          <button
            onClick={() => downloadBundle(helmFiles)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#1E293B', color: '#7C3AED', border: '1px solid #7C3AED40',
              borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <Download size={12} strokeWidth={2} />
            Export
          </button>
        )}

        <button
          onClick={toggleHelmPanel}
          style={{ width: 32, height: 32, borderRadius: 6, background: '#2D2D2D', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#374151')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2D2D2D')}
        >
          <X size={14} color="#94A3B8" />
        </button>
      </div>

      {/* Content */}
      {Object.keys(helmFiles).length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#64748B' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#E2E8F0', marginBottom: 6 }}>No Helm chart yet</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Click "Generate Chart" to create a production-ready Helm chart</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>
          {/* File tree */}
          <div style={{ background: '#1A1A1A', borderRight: '1px solid #2D2D2D', overflowY: 'auto', paddingTop: 8 }}>
            <FileTree files={helmFiles} activeFile={activeFile} onSelect={(f) => { setActiveFile(f) }} />
          </div>

          {/* Content viewer */}
          <div style={{ overflowY: 'auto', padding: '16px 20px' }}>
            {activeFile ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: '"JetBrains Mono", monospace', marginBottom: 12 }}>
                  {activeFile}
                </div>
                <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.7, fontFamily: '"JetBrains Mono", monospace' }}>
                  {highlightYaml(activeContent)}
                </pre>
              </>
            ) : (
              <div style={{ color: '#4B5563', fontSize: 12, marginTop: 40, textAlign: 'center' }}>
                Select a file from the tree
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

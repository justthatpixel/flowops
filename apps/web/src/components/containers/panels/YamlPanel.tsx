/**
 * YamlPanel.tsx — Full-screen overlay for viewing/generating/exporting YAML manifests
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Download, RefreshCw } from 'lucide-react'
import { useContainerStore } from '@/store/containerStore'
import { generateCompose } from '@/lib/generators/composeGenerator'
import { generateManifests } from '@/lib/generators/manifestGenerator'

// ─── Syntax highlighting ──────────────────────────────────────────────────────

function highlightYaml(content: string): React.ReactNode {
  const lines = content.split('\n')
  return lines.map((line, i) => {
    let coloredLine: React.ReactNode

    if (line.trim().startsWith('#')) {
      // Comment line
      coloredLine = <span style={{ color: '#6B7280' }}>{line}</span>
    } else if (line.includes(':')) {
      const colonIdx = line.indexOf(':')
      const key = line.substring(0, colonIdx)
      const rest = line.substring(colonIdx + 1)
      const indentMatch = key.match(/^(\s*)(.*)/)
      const indent = indentMatch?.[1] ?? ''
      const keyName = indentMatch?.[2] ?? key

      let valueNode: React.ReactNode
      if (rest.trim().startsWith('#')) {
        valueNode = <span style={{ color: '#6B7280' }}>:{rest}</span>
      } else if (/^\s*-?\s*\d+(\.\d+)?\s*$/.test(rest)) {
        valueNode = <><span style={{ color: '#e2e8f0' }}>:</span><span style={{ color: '#F59E0B' }}>{rest}</span></>
      } else if (rest.trim() === '' || rest.trim() === '|' || rest.trim() === '>') {
        valueNode = <span style={{ color: '#e2e8f0' }}>:{rest}</span>
      } else {
        valueNode = <><span style={{ color: '#e2e8f0' }}>:</span><span style={{ color: '#22C55E' }}>{rest}</span></>
      }

      coloredLine = (
        <>
          <span style={{ color: '#e2e8f0' }}>{indent}</span>
          <span style={{ color: '#7C3AED' }}>{keyName}</span>
          {valueNode}
        </>
      )
    } else if (line.trim().startsWith('- ')) {
      const indent = line.match(/^(\s*)/)?.[1] ?? ''
      const content2 = line.trim().substring(2)
      coloredLine = (
        <>
          <span style={{ color: '#e2e8f0' }}>{indent}</span>
          <span style={{ color: '#e2e8f0' }}>- </span>
          <span style={{ color: '#22C55E' }}>{content2}</span>
        </>
      )
    } else {
      coloredLine = <span style={{ color: '#e2e8f0' }}>{line}</span>
    }

    return (
      <div key={i} style={{ display: 'flex', gap: 0, minHeight: '1.5em' }}>
        <span
          style={{
            minWidth: 36,
            paddingRight: 12,
            textAlign: 'right',
            color: '#374151',
            userSelect: 'none',
            flexShrink: 0,
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {i + 1}
        </span>
        <span style={{ flex: 1, whiteSpace: 'pre' }}>{coloredLine}</span>
      </div>
    )
  })
}

interface YamlPanelProps {
  onClose: () => void
}

export default function YamlPanel({ onClose }: YamlPanelProps) {
  const { nodes, edges, namespaces, generatedFiles, setGeneratedFiles, activeFileTab, setActiveFileTab, mode } = useContainerStore()
  const [generating, setGenerating] = useState(false)

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      let files = {}
      if (mode === 'compose') {
        files = generateCompose(nodes, edges)
      } else {
        files = generateManifests(nodes, edges, namespaces)
      }
      setGeneratedFiles(files)
      const firstKey = Object.keys(files)[0] ?? null
      setActiveFileTab(firstKey)
      setGenerating(false)
    }, 200)
  }

  const handleExport = () => {
    const parts = Object.entries(generatedFiles).map(
      ([name, content]) => `${'='.repeat(60)}\n# ${name}\n${'='.repeat(60)}\n${content}\n`
    )
    const blob = new Blob([parts.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${mode}-config.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fileKeys = Object.keys(generatedFiles)
  const activeContent = activeFileTab ? generatedFiles[activeFileTab] : null

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
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
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📄</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>
            {mode === 'compose' ? 'Docker Compose Files' : 'YAML Manifests'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            border: 'none', borderRadius: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            color: '#FFFFFF', cursor: 'pointer',
            opacity: generating ? 0.7 : 1,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          <RefreshCw size={12} strokeWidth={2.5} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
          {generating ? 'Generating…' : 'Generate'}
        </button>

        {fileKeys.length > 0 && (
          <button
            onClick={handleExport}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#2D2D2D', border: '1px solid #404040', borderRadius: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              color: '#D1D5DB', cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <Download size={12} strokeWidth={2} />
            Export .zip
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 6, background: '#2D2D2D',
            border: '1px solid #404040', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF',
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* File tree */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            background: '#1A1A1A',
            borderRight: '1px solid #2D2D2D',
            overflowY: 'auto',
          }}
        >
          {fileKeys.length === 0 ? (
            <div style={{ padding: 16, fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
              Click Generate to create files
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {fileKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveFileTab(key)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    padding: '7px 14px', fontSize: 11, fontFamily: '"JetBrains Mono", monospace',
                    background: activeFileTab === key ? '#2D2D2D' : 'transparent',
                    color: activeFileTab === key ? '#F9FAFB' : '#9CA3AF',
                    borderLeft: activeFileTab === key ? '2px solid #7C3AED' : '2px solid transparent',
                    transition: 'background 0.1s, color 0.1s',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { if (activeFileTab !== key) e.currentTarget.style.background = '#252525' }}
                  onMouseLeave={(e) => { if (activeFileTab !== key) e.currentTarget.style.background = 'transparent' }}
                >
                  {key}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Code viewer */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {!activeContent ? (
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '60%', gap: 12, color: '#6B7280',
              }}
            >
              <div style={{ fontSize: 36 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: '"DM Sans", sans-serif' }}>
                No files generated yet
              </div>
              <div style={{ fontSize: 12, fontFamily: '"DM Sans", sans-serif' }}>
                Click Generate to create YAML from your canvas
              </div>
            </div>
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 0,
                fontSize: 12,
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 1.6,
              }}
            >
              {highlightYaml(activeContent)}
            </pre>
          )}
        </div>
      </div>
    </motion.div>
  )
}

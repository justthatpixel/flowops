/**
 * TerraformPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen overlay that displays the Terraform HCL files generated from the
 * current Infrastructure Designer canvas state.
 *
 * LAYOUT
 *   ┌────────────────────────────────────────────────────────────────────────┐
 *   │  🏗 Terraform HCL  ·  <template> / <tier>        [↓ All]  [✕ Close]  │  52px
 *   ├─────────────────────┬──────────────────────────────────────────────────┤
 *   │  versions.tf    ←   │  # versions.tf                    [Copy] [↓]   │
 *   │  variables.tf       │  ──────────────────────────────────────────────  │
 *   │  main.tf        ←   │                                                  │
 *   │  ecs.tf (if any)    │   terraform {                                    │
 *   │  …                  │     required_version = ">= 1.7"                 │
 *   │  outputs.tf         │     …                                            │
 *   └─────────────────────┴──────────────────────────────────────────────────┘
 *
 * FEATURES
 *   • File list sidebar — only shows files that were generated (service-specific
 *     files are omitted when the service isn't on the canvas)
 *   • Syntax-highlighted HCL viewer — keyword / string / comment coloring
 *   • Copy to clipboard per file
 *   • Download individual .tf file
 *   • "Download All" — triggers sequential downloads of every file
 *
 * ENTRY POINT
 *   Mounted by InfraDesigner when `showTerraform === true`.
 *   Reads `infraStore.terraform` (set by `generateTerraform` call).
 *   Closed by `onClose()` prop — keeps the terraform in store so re-opening
 *   the panel shows the same result without re-generating.
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, Download, Check, Terminal } from 'lucide-react'
import type { TerraformFiles } from '@/types/infra'
import { useInfraStore, SCALE_TIERS } from '@/store/infraStore'

// ─── File display order ───────────────────────────────────────────────────────
// Files are shown in this sequence; files not present are skipped.
const FILE_ORDER: (keyof TerraformFiles)[] = [
  'versions.tf',
  'variables.tf',
  'main.tf',
  'ecs.tf',
  'rds.tf',
  'lambda.tf',
  'api_gateway.tf',
  'dynamodb.tf',
  'sqs.tf',
  'cache.tf',
  'cdn.tf',
  'waf.tf',
  's3.tf',
  'outputs.tf',
]

// ─── HCL syntax highlighter ───────────────────────────────────────────────────
// Simple multi-pass tokenizer that produces colored HTML for display inside a
// dangerouslySetInnerHTML block.  Processes tokens in priority order to avoid
// double-coloring (strings first, then comments, then keywords, then numbers).

const HCL_COLORS = {
  comment:  '#6A9955',  // green — # line comments
  string:   '#CE9178',  // orange — "quoted strings"
  keyword:  '#569CD6',  // blue   — resource, variable, provider, etc.
  type:     '#4EC9B0',  // teal   — aws_*, true, false, null
  number:   '#B5CEA8',  // light green — 1024, 0.5, etc.
  attr:     '#9CDCFE',  // light blue — attribute names (before =)
  plain:    '#D4D4D4',  // light grey — everything else
}

const HCL_KEYWORDS = [
  'terraform', 'required_providers', 'backend',
  'provider', 'resource', 'data', 'module',
  'variable', 'output', 'locals',
  'lifecycle', 'dynamic', 'for_each', 'count',
  'depends_on', 'provisioner', 'connection',
]

/**
 * Converts raw HCL text into syntax-highlighted HTML.
 * Uses a placeholder-swap technique so that earlier passes don't re-color
 * tokens already handled.
 */
function highlightHcl(code: string): string {
  // 1. Escape HTML special characters first
  let s = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. Strings — capture before keyword pass to avoid coloring keywords inside strings
  const strings: string[] = []
  s = s.replace(/"([^"\\]|\\.)*"/g, (match) => {
    const idx = strings.length
    strings.push(match)
    return `\x00STR${idx}\x00`
  })

  // 3. Line comments (# ...) — capture to avoid coloring keywords inside comments
  const comments: string[] = []
  s = s.replace(/(#[^\n]*)/g, (match) => {
    const idx = comments.length
    comments.push(match)
    return `\x00CMT${idx}\x00`
  })

  // 4. Block-level keywords at start of line or after newline
  const kwPattern = new RegExp(`\\b(${HCL_KEYWORDS.join('|')})\\b`, 'g')
  s = s.replace(kwPattern, (m) => `<span style="color:${HCL_COLORS.keyword}">${m}</span>`)

  // 5. Booleans + null
  s = s.replace(/\b(true|false|null)\b/g, (m) => `<span style="color:${HCL_COLORS.type}">${m}</span>`)

  // 6. AWS resource types (snake_case identifiers starting with aws_)
  s = s.replace(/\b(aws_[a-z_]+)\b/g, (m) => `<span style="color:${HCL_COLORS.type}">${m}</span>`)

  // 7. Numbers (integers and floats, not inside words)
  s = s.replace(/(?<![a-zA-Z_])\b(\d+(?:\.\d+)?)\b/g, (m) => `<span style="color:${HCL_COLORS.number}">${m}</span>`)

  // 8. Attribute names — word before `=` (but not `==`)
  s = s.replace(/\b([a-z_][a-z0-9_]*)(\s*=(?!=))/g, (_, name, eq) =>
    `<span style="color:${HCL_COLORS.attr}">${name}</span>${eq}`
  )

  // 9. Restore strings (with color)
  s = s.replace(/\x00STR(\d+)\x00/g, (_, idx) =>
    `<span style="color:${HCL_COLORS.string}">${strings[Number(idx)]}</span>`
  )

  // 10. Restore comments (with color)
  s = s.replace(/\x00CMT(\d+)\x00/g, (_, idx) =>
    `<span style="color:${HCL_COLORS.comment}">${comments[Number(idx)]}</span>`
  )

  return s
}

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── File tab item ────────────────────────────────────────────────────────────

function FileTab({
  name,
  active,
  onClick,
}: {
  name: string
  active: boolean
  onClick: () => void
}) {
  // Color-code file tabs by type
  const fileColor =
    name === 'main.tf'      ? '#3B82F6' :
    name === 'versions.tf'  ? '#8B5CF6' :
    name === 'variables.tf' ? '#6366F1' :
    name === 'outputs.tf'   ? '#22C55E' :
    name.startsWith('ecs')  ? '#FF9900' :
    name.startsWith('rds')  ? '#22C55E' :
    name.startsWith('lambda') ? '#F97316' :
    name.startsWith('api')  ? '#EC4899' :
    name.startsWith('dynamo') ? '#3B82F6' :
    name.startsWith('sqs')  ? '#F59E0B' :
    name.startsWith('cache') ? '#8B5CF6' :
    name.startsWith('cdn')  ? '#E11D48' :
    name.startsWith('waf')  ? '#EF4444' :
    name.startsWith('s3')   ? '#16A34A' :
    '#9CA3AF'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        background: active ? '#1E293B' : 'none',
        border: 'none',
        borderLeft: active ? `2px solid ${fileColor}` : '2px solid transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#1A2535' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'none' }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: fileColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontFamily: '"JetBrains Mono", monospace',
          color: active ? '#F1F5F9' : '#94A3B8',
          fontWeight: active ? 600 : 400,
        }}
      >
        {name}
      </span>
    </button>
  )
}

// ─── Copy button with feedback ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        background: copied ? '#166534' : '#1E293B',
        border: `1px solid ${copied ? '#15803D' : '#334155'}`,
        borderRadius: 6,
        cursor: 'pointer',
        color: copied ? '#86EFAC' : '#94A3B8',
        fontSize: 11,
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 500,
        transition: 'all 0.15s',
      }}
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TerraformPanelProps {
  onClose: () => void
}

export default function TerraformPanel({ onClose }: TerraformPanelProps) {
  const { terraform, templateId, scaleTier } = useInfraStore()
  const tier = SCALE_TIERS[scaleTier]

  // Build ordered list of files that were actually generated
  const files = terraform
    ? (FILE_ORDER.filter((k) => terraform[k] !== undefined) as (keyof TerraformFiles)[])
    : []

  const [activeFile, setActiveFile] = useState<keyof TerraformFiles>(files[0] ?? 'main.tf')

  if (!terraform) return null

  const activeContent = terraform[activeFile] ?? ''

  // ── Download all files one by one with a tiny delay ──────────────────────
  const handleDownloadAll = useCallback(() => {
    files.forEach((name, i) => {
      setTimeout(() => {
        downloadFile(name, terraform[name] ?? '')
      }, i * 120)
    })
  }, [files, terraform])

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,          // above InfraDesigner (z-index 100)
        display: 'flex',
        flexDirection: 'column',
        background: '#0F172A', // slate-900
      }}
    >
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Terminal size={14} color="#fff" strokeWidth={2} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#F1F5F9',
              fontFamily: '"DM Sans", sans-serif',
              letterSpacing: '-0.2px',
            }}
          >
            Terraform HCL
          </span>
        </div>

        {/* Breadcrumb */}
        <div style={{ width: 1, height: 16, background: '#334155' }} />
        <span
          style={{
            fontSize: 12,
            color: '#64748B',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {templateId} · {tier.label}
        </span>

        {/* File count badge */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#6366F1',
            background: '#1E1B4B',
            border: '1px solid #312E81',
            borderRadius: 4,
            padding: '2px 7px',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {files.length} files
        </div>

        <div style={{ flex: 1 }} />

        {/* Download All button */}
        <button
          onClick={handleDownloadAll}
          title="Download all .tf files"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: '#1E293B',
            border: '1px solid #334155',
            borderRadius: 6,
            cursor: 'pointer',
            color: '#94A3B8',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: '"DM Sans", sans-serif',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366F1'
            e.currentTarget.style.color = '#818CF8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#334155'
            e.currentTarget.style.color = '#94A3B8'
          }}
        >
          <Download size={13} strokeWidth={2} />
          Download All
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          title="Close"
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: 'none',
            border: '1px solid #334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF4444' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155' }}
        >
          <X size={14} color="#94A3B8" />
        </button>
      </div>

      {/* ── Body: file sidebar + code viewer ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── File list sidebar ─────────────────────────────────────────── */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid #1E293B',
            overflowY: 'auto',
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          {/* Section: config files */}
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: '"DM Sans", sans-serif',
              padding: '4px 12px 6px',
            }}
          >
            Config
          </div>
          {(['versions.tf', 'variables.tf'] as const).filter((f) => terraform[f]).map((name) => (
            <FileTab
              key={name}
              name={name}
              active={activeFile === name}
              onClick={() => setActiveFile(name)}
            />
          ))}

          {/* Section: resources */}
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: '"DM Sans", sans-serif',
              padding: '12px 12px 6px',
            }}
          >
            Resources
          </div>
          {FILE_ORDER
            .filter((f) =>
              f !== 'versions.tf' &&
              f !== 'variables.tf' &&
              f !== 'outputs.tf' &&
              terraform[f] !== undefined
            )
            .map((name) => (
              <FileTab
                key={name}
                name={name}
                active={activeFile === name}
                onClick={() => setActiveFile(name as keyof TerraformFiles)}
              />
            ))}

          {/* Section: outputs */}
          {terraform['outputs.tf'] && (
            <>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: '"DM Sans", sans-serif',
                  padding: '12px 12px 6px',
                }}
              >
                Outputs
              </div>
              <FileTab
                name="outputs.tf"
                active={activeFile === 'outputs.tf'}
                onClick={() => setActiveFile('outputs.tf')}
              />
            </>
          )}
        </div>

        {/* ── Code viewer ───────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Code toolbar */}
          <div
            style={{
              height: 44,
              borderBottom: '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 20,
              paddingRight: 16,
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontFamily: '"JetBrains Mono", monospace',
                color: '#64748B',
                flex: 1,
              }}
            >
              {activeFile}
            </span>

            {/* Line count */}
            <span
              style={{
                fontSize: 10,
                color: '#475569',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {activeContent.split('\n').length} lines
            </span>

            {/* Copy button */}
            <CopyButton text={activeContent} />

            {/* Download single file */}
            <button
              onClick={() => downloadFile(activeFile, activeContent)}
              title={`Download ${activeFile}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#94A3B8',
                fontSize: 11,
                fontFamily: '"DM Sans", sans-serif',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366F1'
                e.currentTarget.style.color = '#818CF8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155'
                e.currentTarget.style.color = '#94A3B8'
              }}
            >
              <Download size={12} strokeWidth={2} />
              .tf
            </button>
          </div>

          {/* Code area with syntax highlighting */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              background: '#0F172A',
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12.5,
                lineHeight: 1.7,
                color: HCL_COLORS.plain,
                tabSize: 2,
              }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: highlightHcl(activeContent) }}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom status bar ─────────────────────────────────────────────── */}
      <div
        style={{
          height: 28,
          borderTop: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: '#475569',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          HashiCorp Terraform · AWS Provider ~5.50
        </span>
        <span style={{ color: '#1E293B' }}>·</span>
        <span
          style={{
            fontSize: 10,
            color: '#475569',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Run <code style={{ color: '#818CF8', fontFamily: '"JetBrains Mono", monospace' }}>terraform init && terraform plan</code> to get started
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 10,
            color: '#22C55E',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 600,
          }}
        >
          ● Generated
        </span>
      </div>
    </motion.div>
  )
}

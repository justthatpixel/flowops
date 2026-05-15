/**
 * SourceBrowserPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen overlay browser — same slide-up animation as TerraformPanel.
 * Opens when a node has a sourceUrl set (GitHub repo, Prometheus, Grafana, etc.)
 * or when the sidebar "Browser" button is clicked.
 *
 * LAYOUT
 *   ┌────────────────────────────────────────────────────────────────────────┐
 *   │ 🌐 Source Browser · github.com/myorg/api   [Open in tab ↗]  [✕ Close] │
 *   ├────────────────────────────────────────────────────────────────────────┤
 *   │ [GitHub] [GitLab] [Prometheus] [Grafana] [Datadog] [ArgoCD] [Jenkins] │
 *   ├────────────────────────────────────────────────────────────────────────┤
 *   │ [←] [→] [⟳]  │  https://github.com/…                      [Go ↵]     │
 *   ├──────────────────────────────────────────────────────────────────────  │
 *   │  Saved Sources  │                                                       │
 *   │  ─ github.com   │                 <iframe>                             │
 *   │  ─ prometheus   │                                                       │
 *   │  + Add current  │                                                       │
 *   └─────────────────┴──────────────────────────────────────────────────────┘
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Globe, X, ExternalLink, ArrowLeft, ArrowRight, RotateCw, Plus, Trash2, Loader } from 'lucide-react'
import { useInfraStore } from '@/store/infraStore'

// ─── Default bookmarks ───────────────────────────────────────────────────────

interface Bookmark {
  id:    string
  label: string
  url:   string
  color: string
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'github',      label: 'GitHub',      url: 'https://github.com',                color: '#24292F' },
  { id: 'gitlab',      label: 'GitLab',      url: 'https://gitlab.com',                color: '#FC6D26' },
  { id: 'prometheus',  label: 'Prometheus',  url: 'https://prometheus.io',             color: '#E6522C' },
  { id: 'grafana',     label: 'Grafana',     url: 'https://grafana.com',               color: '#F46800' },
  { id: 'datadog',     label: 'Datadog',     url: 'https://app.datadoghq.com',         color: '#632CA6' },
  { id: 'argocd',      label: 'ArgoCD',      url: 'https://argo-cd.readthedocs.io',    color: '#EF7B4D' },
  { id: 'jenkins',     label: 'Jenkins',     url: 'https://www.jenkins.io',            color: '#D33833' },
  { id: 'pagerduty',   label: 'PagerDuty',   url: 'https://www.pagerduty.com',         color: '#06AC38' },
]

// ─── Saved source entry ───────────────────────────────────────────────────────

interface SavedSource {
  id:    string
  label: string
  url:   string
}

function urlLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname.replace(/\/$/, '').split('/').slice(1, 3).join('/')
    return path ? `${hostname}/${path}` : hostname
  } catch {
    return url.slice(0, 40)
  }
}

function urlHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function SourceBrowserPanel({ onClose }: { onClose: () => void }) {
  const { browserUrl, setBrowserUrl } = useInfraStore()

  // URL bar input (can differ from live iframe src while typing)
  const [inputUrl, setInputUrl]     = useState(browserUrl)
  const [iframeSrc, setIframeSrc]   = useState(browserUrl)
  const [loading, setLoading]       = useState(true)

  // Saved sources (persisted only for this session)
  const [saved, setSaved] = useState<SavedSource[]>([])

  // Browser history for back/forward
  const historyRef  = useRef<string[]>([browserUrl])
  const historyIdx  = useRef(0)

  // iframe ref (for reload)
  const iframeRef   = useRef<HTMLIFrameElement>(null)

  // Sync input when store URL changes (e.g. opened from a node)
  useEffect(() => {
    setInputUrl(browserUrl)
    navigate(browserUrl, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserUrl])

  const navigate = useCallback((url: string, pushHistory = true) => {
    let href = url.trim()
    if (href && !href.match(/^https?:\/\//)) href = 'https://' + href
    if (!href) return
    setLoading(true)
    setIframeSrc(href)
    setInputUrl(href)
    setBrowserUrl(href)
    if (pushHistory) {
      // Truncate forward history
      const h = historyRef.current.slice(0, historyIdx.current + 1)
      h.push(href)
      historyRef.current = h
      historyIdx.current = h.length - 1
    }
  }, [setBrowserUrl])

  const goBack = useCallback(() => {
    if (historyIdx.current > 0) {
      historyIdx.current -= 1
      const url = historyRef.current[historyIdx.current]
      setLoading(true)
      setIframeSrc(url)
      setInputUrl(url)
      setBrowserUrl(url)
    }
  }, [setBrowserUrl])

  const goForward = useCallback(() => {
    if (historyIdx.current < historyRef.current.length - 1) {
      historyIdx.current += 1
      const url = historyRef.current[historyIdx.current]
      setLoading(true)
      setIframeSrc(url)
      setInputUrl(url)
      setBrowserUrl(url)
    }
  }, [setBrowserUrl])

  const reload = useCallback(() => {
    setLoading(true)
    // Temporarily clear + re-set to force iframe reload
    setIframeSrc('')
    setTimeout(() => setIframeSrc(iframeSrc), 50)
  }, [iframeSrc])

  const onInputKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigate(inputUrl)
  }, [inputUrl, navigate])

  const addToSaved = useCallback(() => {
    const url = iframeSrc
    if (!url || saved.find((s) => s.url === url)) return
    setSaved((prev) => [
      ...prev,
      { id: Date.now().toString(), label: urlLabel(url), url },
    ])
  }, [iframeSrc, saved])

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const canBack    = historyIdx.current > 0
  const canForward = historyIdx.current < historyRef.current.length - 1

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0,       opacity: 1 }}
      exit={{   y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        200,
        display:       'flex',
        flexDirection: 'column',
        background:    '#0F172A',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height:        52,
        borderBottom:  '1px solid #1E293B',
        display:       'flex',
        alignItems:    'center',
        paddingLeft:   16,
        paddingRight:  16,
        gap:           12,
        flexShrink:    0,
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={14} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: '"DM Sans", sans-serif', letterSpacing: '-0.2px' }}>
            Source Browser
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: '#334155' }} />

        {/* Current host breadcrumb */}
        <span style={{ fontSize: 12, color: '#64748B', fontFamily: '"DM Sans", sans-serif' }}>
          {urlHostname(iframeSrc)}
        </span>

        {/* Loading indicator */}
        {loading && (
          <Loader size={12} color="#6366F1" strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} />
        )}

        <div style={{ flex: 1 }} />

        {/* Open in tab */}
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: '#1E293B', border: '1px solid #334155',
            borderRadius: 6, cursor: 'pointer', color: '#94A3B8',
            fontSize: 12, fontWeight: 500, fontFamily: '"DM Sans", sans-serif',
            textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0EA5E9'; e.currentTarget.style.color = '#38BDF8' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94A3B8' }}
        >
          <ExternalLink size={12} strokeWidth={2} />
          Open in tab
        </a>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'none', border: '1px solid #334155',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF4444' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155' }}
        >
          <X size={14} color="#94A3B8" />
        </button>
      </div>

      {/* ── Bookmarks bar ───────────────────────────────────────────────────── */}
      <div style={{
        height: 40, borderBottom: '1px solid #1E293B',
        display: 'flex', alignItems: 'center',
        paddingLeft: 16, paddingRight: 16, gap: 6,
        flexShrink: 0, overflowX: 'auto',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: '"DM Sans", sans-serif', flexShrink: 0, marginRight: 4 }}>
          Quick links
        </span>
        {DEFAULT_BOOKMARKS.map((bm) => (
          <button
            key={bm.id}
            onClick={() => navigate(bm.url)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 5, flexShrink: 0,
              background: iframeSrc.includes(urlHostname(bm.url)) ? `${bm.color}22` : '#1E293B',
              border: `1px solid ${iframeSrc.includes(urlHostname(bm.url)) ? bm.color + '66' : '#334155'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = bm.color; e.currentTarget.style.background = `${bm.color}22` }}
            onMouseLeave={(e) => {
              const active = iframeSrc.includes(urlHostname(bm.url))
              e.currentTarget.style.borderColor = active ? bm.color + '66' : '#334155'
              e.currentTarget.style.background  = active ? `${bm.color}22` : '#1E293B'
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: bm.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: '"DM Sans", sans-serif' }}>{bm.label}</span>
          </button>
        ))}
      </div>

      {/* ── URL bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 44, borderBottom: '1px solid #1E293B',
        display: 'flex', alignItems: 'center',
        paddingLeft: 12, paddingRight: 12, gap: 8, flexShrink: 0,
      }}>
        {/* Back */}
        <button
          onClick={goBack} disabled={!canBack}
          style={{
            width: 28, height: 28, borderRadius: 5,
            background: 'none', border: '1px solid #1E293B',
            cursor: canBack ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: canBack ? 1 : 0.3, transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { if (canBack) e.currentTarget.style.borderColor = '#334155' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E293B' }}
        >
          <ArrowLeft size={13} color="#64748B" strokeWidth={2} />
        </button>

        {/* Forward */}
        <button
          onClick={goForward} disabled={!canForward}
          style={{
            width: 28, height: 28, borderRadius: 5,
            background: 'none', border: '1px solid #1E293B',
            cursor: canForward ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: canForward ? 1 : 0.3, transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { if (canForward) e.currentTarget.style.borderColor = '#334155' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E293B' }}
        >
          <ArrowRight size={13} color="#64748B" strokeWidth={2} />
        </button>

        {/* Reload */}
        <button
          onClick={reload}
          style={{
            width: 28, height: 28, borderRadius: 5,
            background: 'none', border: '1px solid #1E293B',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#334155' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E293B' }}
        >
          <RotateCw size={12} color="#64748B" strokeWidth={2} />
        </button>

        {/* URL input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: '#1E293B', border: '1px solid #334155', borderRadius: 7,
          padding: '0 12px', height: 32, gap: 8,
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1' }}
          onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#334155' }}
        >
          <Globe size={11} color="#475569" strokeWidth={2} style={{ flexShrink: 0 }} />
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={onInputKeyDown}
            spellCheck={false}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 12, color: '#CBD5E1', fontFamily: '"JetBrains Mono", monospace',
            }}
          />
        </div>

        {/* Go button */}
        <button
          onClick={() => navigate(inputUrl)}
          style={{
            padding: '0 14px', height: 32, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#fff',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Go
        </button>
      </div>

      {/* ── Body: saved sidebar + iframe ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Saved sources sidebar ─────────────────────────────────────────── */}
        <div style={{
          width: 200, flexShrink: 0,
          borderRight: '1px solid #1E293B',
          display: 'flex', flexDirection: 'column',
          paddingTop: 8,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: '"DM Sans", sans-serif',
            padding: '4px 12px 8px',
          }}>
            Saved Sources
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {saved.length === 0 && (
              <div style={{
                fontSize: 11, color: '#334155', fontFamily: '"DM Sans", sans-serif',
                padding: '4px 12px 12px', lineHeight: 1.5,
              }}>
                No saved sources yet. Browse to a URL and click + below.
              </div>
            )}
            {saved.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: iframeSrc === s.url ? '#1E293B' : 'none',
                  borderLeft: iframeSrc === s.url ? '2px solid #6366F1' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onClick={() => navigate(s.url)}
                onMouseEnter={(e) => { if (iframeSrc !== s.url) (e.currentTarget as HTMLElement).style.background = '#1A2535' }}
                onMouseLeave={(e) => { if (iframeSrc !== s.url) (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <Globe size={10} color="#475569" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: 11, color: '#94A3B8', fontFamily: '"DM Sans", sans-serif',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSaved(s.id) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: 2,
                    opacity: 0, transition: 'opacity 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
                >
                  <Trash2 size={10} color="#EF4444" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>

          {/* Add current page */}
          <button
            onClick={addToSaved}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 12px', margin: '8px',
              background: '#1E293B', border: '1px dashed #334155',
              borderRadius: 7, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, color: '#64748B',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#818CF8' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748B' }}
          >
            <Plus size={12} strokeWidth={2} />
            Save current URL
          </button>
        </div>

        {/* ── iframe area ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', background: '#0F172A' }}>
          {/* Loading overlay */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: '#0F172A', gap: 12,
            }}>
              <Loader size={24} color="#6366F1" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#475569', fontFamily: '"DM Sans", sans-serif' }}>
                Loading {urlHostname(iframeSrc)}…
              </span>
            </div>
          )}

          {iframeSrc && (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              onLoad={() => setLoading(false)}
              style={{
                width: '100%', height: '100%',
                border: 'none',
                background: '#fff',
                display: 'block',
              }}
              title="Source Browser"
              // Allow embedding of self-hosted tools
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 28, borderTop: '1px solid #1E293B',
        display: 'flex', alignItems: 'center',
        paddingLeft: 16, paddingRight: 16, gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: '#334155', fontFamily: '"DM Sans", sans-serif' }}>
          Bookmarks point to localhost — update URLs to match your running services · External sites may require <span style={{ color: '#818CF8' }}>Open in tab</span>
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: loading ? '#F59E0B' : '#22C55E', fontFamily: '"DM Sans", sans-serif', fontWeight: 600 }}>
          {loading ? '⟳ Loading' : '● Ready'}
        </span>
      </div>
    </motion.div>
  )
}

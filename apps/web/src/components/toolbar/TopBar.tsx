import { useState, useRef, useEffect } from 'react'
import { Play, Loader2, RotateCcw, Zap, LayoutTemplate, AlertTriangle, TerminalSquare } from 'lucide-react'
import { usePipelineStore } from '@/store/pipelineStore'
import { useDashboardStore, type AppView } from '@/store/dashboardStore'
import { useTerminalStore } from '@/store/terminalStore'

const VIEW_TABS: { id: AppView; label: string }[] = [
  { id: 'pipeline',  label: 'Pipeline'  },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'logs',      label: 'Logs'      },
]

export default function TopBar() {
  const { pipelineName, setPipelineName, runState, startRun, setShowTemplatePicker } = usePipelineStore()
  const { activeView, setView } = useDashboardStore()
  const { toggleOpen: toggleTerminal } = useTerminalStore()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(pipelineName)
  const inputRef = useRef<HTMLInputElement>(null)

  const commitName = () => {
    const trimmed = draftName.trim()
    if (trimmed) setPipelineName(trimmed)
    else setDraftName(pipelineName)
    setEditing(false)
  }

  // Backtick shortcut for terminal
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        toggleTerminal()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleTerminal])

  return (
    <div
      style={{
        height: 52,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E5E5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 16,
        paddingRight: 16,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Logo + pipeline name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 220 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={15} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
          FlowOps
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#8B5CF6',
            background: '#F3F0FF',
            padding: '1px 6px',
            borderRadius: 4,
            letterSpacing: '0.5px',
          }}
        >
          AI
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: '#E5E7EB', marginLeft: 4 }} />

        {/* Templates button */}
        <button
          onClick={() => setShowTemplatePicker(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 500,
            color: '#6B7280',
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.borderColor = '#3B82F6'
            el.style.color = '#3B82F6'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.borderColor = '#E5E7EB'
            el.style.color = '#6B7280'
          }}
        >
          <LayoutTemplate size={12} strokeWidth={2} />
          Templates
        </button>
      </div>

      {/* ── View tabs (Pipeline | Dashboard | Logs) ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#F3F4F6',
          borderRadius: 8,
          padding: '3px',
          flex: 1,
          maxWidth: 300,
          margin: '0 auto',
        }}
      >
        {VIEW_TABS.map((tab) => {
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                fontFamily: '"DM Sans", sans-serif',
                color: isActive ? '#111827' : '#6B7280',
                background: isActive ? '#FFFFFF' : 'none',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Run button + terminal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 220, justifyContent: 'flex-end' }}>
        {/* Terminal button */}
        <button
          onClick={toggleTerminal}
          title="Toggle terminal (` key)"
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'none',
            border: '1px solid #E5E7EB',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, border-color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F3F4F6'
            e.currentTarget.style.borderColor = '#9CA3AF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.borderColor = '#E5E7EB'
          }}
        >
          <TerminalSquare size={15} color="#6B7280" strokeWidth={1.8} />
        </button>
        {runState === 'idle' && (
          <button
            onClick={startRun}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#22C55E',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#16A34A')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#22C55E')}
          >
            <Play size={13} strokeWidth={2.5} />
            Run Pipeline
          </button>
        )}

        {runState === 'running' && (
          <button
            disabled
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#F3F4F6',
              color: '#6B7280',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'not-allowed',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            Running...
          </button>
        )}

        {runState === 'complete' && (
          <button
            onClick={startRun}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#2563EB')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#3B82F6')}
          >
            <RotateCcw size={13} strokeWidth={2.5} />
            Run Again
          </button>
        )}

        {runState === 'failed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#EF4444', fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
              <AlertTriangle size={13} strokeWidth={2} />
              Pipeline failed
            </div>
            <button
              onClick={startRun}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"DM Sans", sans-serif',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#DC2626')}
              onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#EF4444')}
            >
              <RotateCcw size={13} strokeWidth={2.5} />
              Re-run
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

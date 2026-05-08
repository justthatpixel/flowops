/**
 * TerminalDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slides up from the bottom of the screen (320px height).
 * Keyboard shortcut: backtick (`).
 *
 * Features:
 *   - Multi-tab support (add / close tabs)
 *   - Simulated command execution (see terminalStore.ts)
 *   - Confirmation modal for destructive commands
 *   - Auto-scroll to bottom on new output
 */

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, TerminalSquare, ChevronDown, AlertTriangle } from 'lucide-react'
import { useTerminalStore, type TerminalLine } from '@/store/terminalStore'

// ─── Line colours ─────────────────────────────────────────────────────────────

const LINE_COLORS: Record<TerminalLine['kind'], string> = {
  prompt: '#60A5FA',
  output: '#E2E8F0',
  error:  '#FCA5A5',
  system: '#6B7280',
}

// ─── Destructive confirm modal ────────────────────────────────────────────────

function DestructiveModal({
  cmd,
  onConfirm,
  onCancel,
}: {
  cmd: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: '10px 10px 0 0',
      }}
    >
      <div
        style={{
          background: '#1E293B',
          border: '1px solid #374151',
          borderRadius: 10,
          padding: '20px 24px',
          maxWidth: 380,
          width: '90%',
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AlertTriangle size={18} color="#EF4444" strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>
            Destructive command
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, lineHeight: 1.5 }}>
          Are you sure you want to run:
        </div>
        <pre
          style={{
            background: '#0F172A',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 11,
            color: '#FCA5A5',
            fontFamily: '"JetBrains Mono", monospace',
            marginBottom: 16,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {cmd}
        </pre>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #374151',
              background: 'none',
              color: '#94A3B8',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1E293B')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#EF4444',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#DC2626')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#EF4444')}
          >
            Run anyway
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Terminal session ─────────────────────────────────────────────────────────

function TerminalSession({ tabId }: { tabId: string }) {
  const { tabs, submitCommand } = useTerminalStore()
  const tab = tabs.find((t) => t.id === tabId)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tab?.lines.length])

  const submit = () => {
    const cmd = input.trim()
    if (!cmd) return
    setHistory((h) => [cmd, ...h].slice(0, 100))
    setHistIdx(-1)
    submitCommand(tabId, cmd)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIdx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(newIdx)
      setInput(history[newIdx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIdx = Math.max(histIdx - 1, -1)
      setHistIdx(newIdx)
      setInput(newIdx === -1 ? '' : history[newIdx] ?? '')
    }
  }

  if (!tab) return null

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'text',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 14px 4px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          lineHeight: 1.65,
        }}
      >
        {tab.lines.map((line) => (
          <div key={line.id} style={{ color: LINE_COLORS[line.kind] }}>
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 14px 8px',
          gap: 6,
          borderTop: '1px solid #1E293B',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#60A5FA', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, flexShrink: 0 }}>
          {tab.cwd} $
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#E2E8F0',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            caretColor: '#60A5FA',
          }}
        />
      </div>
    </div>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export default function TerminalDrawer() {
  const {
    open, setOpen,
    tabs, activeTabId,
    addTab, closeTab, setActiveTab,
    pendingDestructiveCmd, confirmDestructive, cancelDestructive,
  } = useTerminalStore()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="terminal-drawer"
          initial={{ y: 320 }}
          animate={{ y: 0 }}
          exit={{ y: 320 }}
          transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 320,
            background: '#0F172A',
            borderTop: '1px solid #1E293B',
            borderRadius: '10px 10px 0 0',
            zIndex: 400,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: 36,
              display: 'flex',
              alignItems: 'center',
              background: '#1E293B',
              borderBottom: '1px solid #334155',
              paddingLeft: 10,
              paddingRight: 6,
              gap: 0,
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            {/* Icon */}
            <TerminalSquare size={13} color="#60A5FA" strokeWidth={2} style={{ marginRight: 8, flexShrink: 0 }} />

            {/* Tabs */}
            <div style={{ display: 'flex', flex: 1, gap: 1, overflow: 'hidden' }}>
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0 10px',
                      height: 36,
                      cursor: 'pointer',
                      background: isActive ? '#0F172A' : 'transparent',
                      borderBottom: isActive ? '2px solid #60A5FA' : '2px solid transparent',
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#E2E8F0' : '#64748B',
                      fontFamily: '"DM Sans", sans-serif',
                      transition: 'background 0.1s, color 0.1s',
                      flexShrink: 0,
                    }}
                  >
                    {tab.name}
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 2,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748B',
                          padding: 0,
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#F1F5F9' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add tab */}
            <button
              onClick={addTab}
              title="New tab"
              style={{
                width: 28,
                height: 28,
                borderRadius: 5,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                transition: 'background 0.1s, color 0.1s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#E2E8F0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748B' }}
            >
              <Plus size={13} />
            </button>

            {/* Minimize */}
            <button
              onClick={() => setOpen(false)}
              title="Minimize terminal"
              style={{
                width: 28,
                height: 28,
                borderRadius: 5,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                transition: 'background 0.1s, color 0.1s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#E2E8F0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748B' }}
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {/* Active session */}
          <TerminalSession tabId={activeTabId} />

          {/* Destructive confirm overlay */}
          {pendingDestructiveCmd && (
            <DestructiveModal
              cmd={pendingDestructiveCmd.cmd}
              onConfirm={confirmDestructive}
              onCancel={cancelDestructive}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

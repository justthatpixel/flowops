/**
 * InfraAIPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AI chat panel inside the Infrastructure Designer (Phase 8).
 * Slides in from the left when the "Ask AI" button is clicked in the top bar.
 *
 * LAYOUT (320px wide, full canvas height, absolute overlay on the LEFT)
 *   ┌──────────────────────────────────────┐
 *   │  ✦ Infra AI                    [✕]  │  ← header
 *   ├──────────────────────────────────────┤
 *   │  [Suggestion chip] [Suggestion chip] │  ← quick prompts (when empty)
 *   │                                      │
 *   │  Chat messages                       │  ← scrollable
 *   │                                      │
 *   ├──────────────────────────────────────┤
 *   │  [Type a message…]           [Send]  │  ← input
 *   └──────────────────────────────────────┘
 *
 * CAPABILITIES (via useInfraAI + local simulation fallback)
 *   • Switch architecture template  — "use serverless"
 *   • Change scale tier             — "scale to enterprise"
 *   • Explain architecture          — "describe this setup"
 *   • Cost / capacity queries       — "how much does this cost?"
 *   • Bottleneck diagnosis          — "what's the bottleneck?"
 *
 * SHARED STATE
 *   Uses aiStore (messages, isStreaming) — the same store as the pipeline
 *   AISidebar so chat history is preserved when switching between views.
 *   A `context` prefix on messages identifies them as infra-mode messages.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { X, Sparkles, Send, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIStore } from '@/store/aiStore'
import { useInfraAI } from '@/hooks/useInfraAI'

// ─── Quick-prompt suggestion chips ───────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Switch to Serverless',    prompt: 'Switch to the serverless template' },
  { label: 'Scale to Enterprise',     prompt: 'Scale to enterprise tier' },
  { label: 'What\'s the bottleneck?', prompt: 'What is the current bottleneck?' },
  { label: 'Explain this design',     prompt: 'Describe the current architecture' },
  { label: 'Cheapest option',         prompt: 'How can I reduce the cost?' },
  { label: 'Scale to Startup',        prompt: 'Set to early startup tier' },
]

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #4F46E522, #7C3AED22)',
            border: '1px solid #6366F144',
            borderRadius: '10px 10px 2px 10px',
            padding: '8px 11px',
            maxWidth: '85%',
            fontSize: 12,
            color: '#C7D2FE',
            fontFamily: '"DM Sans", sans-serif',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  // Render assistant messages with simple bold / code support
  const parts = content.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g)
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Sparkles size={10} color="#fff" strokeWidth={2} />
      </div>
      <div
        style={{
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '2px 10px 10px 10px',
          padding: '8px 11px',
          maxWidth: 'calc(100% - 27px)',
          fontSize: 12,
          color: '#CBD5E1',
          fontFamily: '"DM Sans", sans-serif',
          lineHeight: 1.6,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {parts.map((part, i) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const inner = part.slice(3, -3).replace(/^[a-z]+\n/, '')
            return (
              <pre
                key={i}
                style={{
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '6px 8px',
                  fontSize: 10,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#86EFAC',
                  overflowX: 'auto',
                  margin: '4px 0',
                  whiteSpace: 'pre',
                }}
              >
                {inner}
              </pre>
            )
          }
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} style={{ color: '#F1F5F9', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function InfraAIPanel({ onClose }: Props) {
  const { messages, isStreaming, clearMessages } = useAIStore()
  const { sendInfraMessage } = useInfraAI()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || isStreaming) return
    setDraft('')
    await sendInfraMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = async (prompt: string) => {
    setDraft('')
    await sendInfraMessage(prompt)
  }

  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 320,
        zIndex: 25,
        background: '#0F172A',
        borderRight: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 48,
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: 10,
          gap: 9,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={13} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', fontFamily: '"DM Sans", sans-serif', lineHeight: 1.2 }}>
            Infra AI
          </div>
          <div style={{ fontSize: 9, color: '#64748B', fontFamily: '"DM Sans", sans-serif' }}>
            Natural language canvas control
          </div>
        </div>

        {/* Clear chat */}
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            title="Clear conversation"
            style={{
              fontSize: 9,
              color: '#475569',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
              padding: '3px 6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#94A3B8' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#475569' }}
          >
            Clear
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            background: 'none',
            border: '1px solid #334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'border-color 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF4444' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155' }}
        >
          <X size={12} color="#94A3B8" />
        </button>
      </div>

      {/* ── Messages / suggestions ──────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          /* Welcome state with suggestion chips */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={12} color="#6366F1" strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', fontFamily: '"DM Sans", sans-serif' }}>
                  Infrastructure AI
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6, margin: 0, fontFamily: '"DM Sans", sans-serif' }}>
                Control your AWS architecture with natural language. Switch templates, scale up or down, and get explanations — all in plain English.
              </p>
            </div>

            {/* Suggestion chips */}
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, fontFamily: '"DM Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Try asking
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.prompt)}
                  disabled={isStreaming}
                  style={{
                    padding: '5px 10px',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 20,
                    color: '#94A3B8',
                    fontSize: 11,
                    fontFamily: '"DM Sans", sans-serif',
                    cursor: isStreaming ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.12s, color 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isStreaming) {
                      e.currentTarget.style.borderColor = '#6366F1'
                      e.currentTarget.style.color = '#818CF8'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#334155'
                    e.currentTarget.style.color = '#94A3B8'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.id} role={msg.role} content={msg.content} />
          ))
        )}

        {/* Typing indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingLeft: 27 }}>
            <Loader2 size={11} color="#6366F1" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 10, color: '#475569', fontFamily: '"DM Sans", sans-serif' }}>Thinking…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: 10, borderTop: '1px solid #1E293B', flexShrink: 0 }}>
        <div
          style={{
            background: '#1E293B',
            border: '1px solid #334155',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            padding: '7px 10px',
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your infrastructure…"
            rows={2}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#F1F5F9',
              fontSize: 12,
              fontFamily: '"DM Sans", sans-serif',
              lineHeight: 1.5,
              resize: 'none',
              caretColor: '#6366F1',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || isStreaming}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: draft.trim() && !isStreaming
                ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                : '#334155',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: draft.trim() && !isStreaming ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {isStreaming
              ? <Loader2 size={12} color="#64748B" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={12} color={draft.trim() ? '#fff' : '#64748B'} strokeWidth={2} />
            }
          </button>
        </div>
        <p style={{ fontSize: 9, color: '#334155', margin: '5px 2px 0', fontFamily: '"DM Sans", sans-serif' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </motion.div>
  )
}

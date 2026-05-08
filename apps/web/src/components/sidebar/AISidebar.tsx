import { useRef, useEffect, useState, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Wrench } from 'lucide-react'
import { useAIStore, type AIMessage } from '@/store/aiStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { useAI } from '@/hooks/useAI'

const WELCOME = `Describe your app and stack — I'll configure the whole pipeline.

**Example:** "Next.js 14 TypeScript app, GitHub repo, deploys to AWS ECS Fargate, uses pnpm, Postgres on RDS"`

export default function AISidebar() {
  const { messages, isStreaming, sidebarOpen, setSidebarOpen, addMessage } = useAIStore()
  const { selectedNodeId, nodes } = usePipelineStore()
  const { sendConfigureAll, sendConfigureNode } = useAI()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
  const isNodeMode = !!selectedNode
  const isFailed = selectedNode?.data.status === 'failed'
  const aiSummary = selectedNode?.data.aiSummary
  const suggestedFix = selectedNode?.data.suggestedFix

  // Track which node IDs we've already injected a failure card for
  const injectedRef = useRef(new Set<string>())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-inject failure analysis card when a failed+diagnosed node is selected
  useEffect(() => {
    if (!selectedNodeId || !isFailed || !aiSummary) return
    if (injectedRef.current.has(selectedNodeId)) return
    injectedRef.current.add(selectedNodeId)
    addMessage('assistant', `__failure__:${selectedNodeId}`)
  }, [selectedNodeId, isFailed, aiSummary, addMessage])

  const handleApplyFix = useCallback(async () => {
    if (!selectedNodeId || !suggestedFix) return
    await sendConfigureNode(selectedNodeId, `Apply this fix: ${suggestedFix}`)
  }, [selectedNodeId, suggestedFix, sendConfigureNode])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || isStreaming) return
    setDraft('')
    if (isNodeMode && selectedNodeId) {
      await sendConfigureNode(selectedNodeId, text)
    } else {
      await sendConfigureAll(text)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, position: 'relative', zIndex: 20 }}>
      {/* Collapse toggle tab */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute',
          right: -12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 20,
          height: 48,
          background: '#1F1F1F',
          border: '1px solid #2D2D2D',
          borderRadius: '0 6px 6px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          color: '#6B7280',
        }}
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="ai-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              background: '#111111',
              borderRight: '1px solid #1F1F1F',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                height: 52,
                borderBottom: '1px solid #1F1F1F',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={14} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#F9FAFB',
                    fontFamily: '"DM Sans", sans-serif',
                    letterSpacing: '-0.2px',
                    lineHeight: 1.2,
                  }}
                >
                  Claude AI
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#6B7280',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  Pipeline configurator
                </div>
              </div>

              {/* Node context badge */}
              <AnimatePresence>
                {isNodeMode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#A78BFA',
                      background: '#1E1B4B',
                      border: '1px solid #312E81',
                      borderRadius: 4,
                      padding: '2px 7px',
                      fontFamily: '"DM Sans", sans-serif',
                      maxWidth: 110,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedNode?.data.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.length === 0 ? (
                <WelcomeCard />
              ) : (
                messages.map((msg) => {
                  if (msg.content.startsWith('__failure__:')) {
                    const nodeId = msg.content.slice('__failure__:'.length)
                    const node = nodes.find((n) => n.id === nodeId)
                    if (node?.data.aiSummary) {
                      return (
                        <FailureCard
                          key={msg.id}
                          summary={node.data.aiSummary}
                          suggestedFix={node.data.suggestedFix ?? ''}
                          onApply={handleApplyFix}
                          canApply={!!node.data.suggestedFix && !isStreaming}
                        />
                      )
                    }
                  }
                  return <MessageBubble key={msg.id} msg={msg} />
                })
              )}
              {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === '' && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0' }}>
                  <Loader2 size={12} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
                    Thinking…
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: 12,
                borderTop: '1px solid #1F1F1F',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  background: '#1A1A1A',
                  border: '1px solid #2D2D2D',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                  padding: '8px 10px',
                  transition: 'border-color 0.15s',
                }}
                onFocus={() => {}}
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isNodeMode
                      ? `Ask about "${selectedNode?.data.label}"…`
                      : 'Describe your app and stack…'
                  }
                  rows={2}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#F9FAFB',
                    fontSize: 12,
                    fontFamily: '"DM Sans", sans-serif',
                    lineHeight: 1.5,
                    resize: 'none',
                    caretColor: '#7C3AED',
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
                      ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
                      : '#2D2D2D',
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
                    ? <Loader2 size={12} color="#6B7280" style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={12} color={draft.trim() ? '#fff' : '#4B5563'} strokeWidth={2} />
                  }
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#374151', margin: '6px 2px 0', fontFamily: '"DM Sans", sans-serif' }}>
                Enter to send · Shift+Enter for newline
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FailureCard({
  summary,
  suggestedFix,
  onApply,
  canApply,
}: {
  summary: string
  suggestedFix: string
  onApply: () => void
  canApply: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#1A0A0A',
        border: '1px solid #7F1D1D',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <AlertTriangle size={13} color="#F87171" strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#FCA5A5', fontFamily: '"DM Sans", sans-serif' }}>
          Pipeline Failure Detected
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#FCD34D', lineHeight: 1.6, margin: '0 0 8px', fontFamily: '"DM Sans", sans-serif' }}>
        {summary}
      </p>
      {suggestedFix && (
        <>
          <div
            style={{
              background: '#0D1F0D',
              border: '1px solid #14532D',
              borderRadius: 6,
              padding: '8px 10px',
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#86EFAC', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>
              Suggested Fix
            </div>
            <p style={{ fontSize: 11, color: '#D1FAE5', lineHeight: 1.5, margin: 0, fontFamily: '"DM Sans", sans-serif' }}>
              {suggestedFix}
            </p>
          </div>
          <button
            onClick={onApply}
            disabled={!canApply}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: canApply ? 'linear-gradient(135deg, #15803D, #166534)' : '#1F2937',
              color: canApply ? '#DCFCE7' : '#6B7280',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: canApply ? 'pointer' : 'not-allowed',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'background 0.15s',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Wrench size={11} strokeWidth={2} />
            Apply Fix via Claude
          </button>
        </>
      )}
    </motion.div>
  )
}

function WelcomeCard() {
  return (
    <div
      style={{
        background: '#1A1A1A',
        border: '1px solid #2D2D2D',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sparkles size={13} color="#7C3AED" strokeWidth={2} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#F9FAFB',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          AI Pipeline Configurator
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: '#9CA3AF',
          lineHeight: 1.6,
          margin: 0,
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <MarkdownText text={WELCOME} />
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: AIMessage }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #7C3AED22, #EC489922)',
            border: '1px solid #7C3AED44',
            borderRadius: '10px 10px 2px 10px',
            padding: '8px 12px',
            maxWidth: '85%',
            fontSize: 12,
            color: '#E9D5FF',
            fontFamily: '"DM Sans", sans-serif',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Sparkles size={11} color="#fff" strokeWidth={2} />
      </div>
      <div
        style={{
          background: '#1A1A1A',
          border: '1px solid #2D2D2D',
          borderRadius: '2px 10px 10px 10px',
          padding: '8px 12px',
          maxWidth: 'calc(100% - 30px)',
          fontSize: 12,
          color: '#D1D5DB',
          fontFamily: '"DM Sans", sans-serif',
          lineHeight: 1.6,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        <MarkdownText text={msg.content} />
      </div>
    </div>
  )
}

function MarkdownText({ text }: { text: string }) {
  if (!text) return null

  const parts = text.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3).replace(/^json\n?/, '')
          return (
            <pre
              key={i}
              style={{
                background: '#0D0D0D',
                border: '1px solid #2D2D2D',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
                color: '#86EFAC',
                overflowX: 'auto',
                margin: '6px 0',
                whiteSpace: 'pre',
              }}
            >
              {inner}
            </pre>
          )
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} style={{ color: '#F9FAFB', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

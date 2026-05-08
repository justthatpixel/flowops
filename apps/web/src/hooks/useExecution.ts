import { useEffect, useRef } from 'react'
import { usePipelineStore } from '@/store/pipelineStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3002'

interface WSEvent {
  type: 'run:start' | 'node:status' | 'run:complete' | 'node:ai_summary'
  runId?: string
  nodeId?: string
  status?: string
  logs?: string
  durationMs?: number
  summary?: string
  suggestedFix?: string
}

export function useExecution() {
  const { updateNodeStatus, setRunState, updateNodeSummary } = usePipelineStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let destroyed = false

    function connect() {
      if (destroyed) return
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onmessage = (e) => {
          let event: WSEvent
          try {
            event = JSON.parse(e.data as string) as WSEvent
          } catch {
            return
          }

          if (event.type === 'node:status' && event.nodeId && event.status) {
            updateNodeStatus(event.nodeId, event.status as Parameters<typeof updateNodeStatus>[1])
          }

          if (event.type === 'run:complete') {
            setRunState(event.status === 'success' ? 'complete' : 'failed')
          }

          if (event.type === 'node:ai_summary' && event.nodeId && event.summary) {
            updateNodeSummary(event.nodeId, event.summary, event.suggestedFix ?? '')
          }
        }

        ws.onerror = () => {
          // Silently ignore — backend may not be running
        }

        ws.onclose = () => {
          if (!destroyed) {
            reconnectTimer.current = setTimeout(connect, 3000)
          }
        }
      } catch {
        if (!destroyed) {
          reconnectTimer.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [updateNodeStatus, setRunState, updateNodeSummary])
}

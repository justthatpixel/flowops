import { useAIStore } from '@/store/aiStore'
import { usePipelineStore } from '@/store/pipelineStore'
import type { NodeConfig, GeneratedFile } from '@/types/pipeline'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface NodeUpdate {
  id: string
  label?: string
  config?: NodeConfig
}

function parseUpdates(text: string): NodeUpdate[] {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[1]) as { updates?: NodeUpdate[] }
    return parsed.updates ?? []
  } catch {
    return []
  }
}

async function consumeSSE(
  url: string,
  body: object,
  onChunk: (t: string) => void,
  onDone: (full: string) => void,
  onError: (msg: string) => void,
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    onError(`API error: ${res.status}`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('event: chunk')) continue
      if (line.startsWith('event: done')) {
        const dataLine = lines[lines.indexOf(line) + 1] ?? ''
        if (dataLine.startsWith('data: ')) {
          try {
            onDone(JSON.parse(dataLine.slice(6)) as string)
          } catch {
            // ignore parse error
          }
        }
        return
      }
      if (line.startsWith('event: error')) {
        const dataLine = lines[lines.indexOf(line) + 1] ?? ''
        if (dataLine.startsWith('data: ')) {
          try {
            onError(JSON.parse(dataLine.slice(6)) as string)
          } catch {
            onError('Unknown error')
          }
        }
        return
      }
      if (line.startsWith('data: ')) {
        try {
          const chunk = JSON.parse(line.slice(6)) as string
          onChunk(chunk)
        } catch {
          // ignore
        }
      }
    }
  }
}

export function useAI() {
  const { addMessage, appendToLast, setStreaming, appContext, setAppContext } =
    useAIStore()
  const { nodes, updateNodeConfig, updateNodeLabel, updateNodeFiles } = usePipelineStore()

  function applyUpdates(updates: NodeUpdate[]) {
    for (const u of updates) {
      if (u.label) updateNodeLabel(u.id, u.label)
      if (u.config) updateNodeConfig(u.id, u.config)
    }
  }

  async function sendConfigureAll(userMessage: string) {
    if (!userMessage.trim()) return
    setAppContext(userMessage)
    addMessage('user', userMessage)
    addMessage('assistant', '')
    setStreaming(true)

    const strippedNodes = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: { label: n.data.label, nodeType: n.data.nodeType, config: n.data.config },
    }))

    let fullText = ''
    await consumeSSE(
      `${API}/api/ai/configure-all`,
      { appContext: userMessage, nodes: strippedNodes },
      (chunk) => {
        appendToLast(chunk)
        fullText += chunk
      },
      (done) => {
        fullText = done
        const updates = parseUpdates(fullText)
        applyUpdates(updates)
        setStreaming(false)
      },
      (err) => {
        appendToLast(`\n\n⚠️ ${err}`)
        setStreaming(false)
      },
    )
  }

  async function sendConfigureNode(nodeId: string, userMessage: string) {
    if (!userMessage.trim()) return
    addMessage('user', userMessage)
    addMessage('assistant', '')
    setStreaming(true)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) {
      appendToLast('Node not found.')
      setStreaming(false)
      return
    }

    const nodePayload = {
      id: node.id,
      data: { label: node.data.label, nodeType: node.data.nodeType, config: node.data.config },
    }

    let fullText = ''
    await consumeSSE(
      `${API}/api/ai/configure-node`,
      { appContext, node: nodePayload, prompt: userMessage },
      (chunk) => {
        appendToLast(chunk)
        fullText += chunk
      },
      (done) => {
        fullText = done
        const updates = parseUpdates(fullText)
        applyUpdates(updates)
        setStreaming(false)
      },
      (err) => {
        appendToLast(`\n\n⚠️ ${err}`)
        setStreaming(false)
      },
    )
  }

  async function generateFiles(nodeId: string): Promise<GeneratedFile[]> {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return []

    const res = await fetch(`${API}/api/ai/generate-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: node.data.nodeType,
        label: node.data.label,
        config: node.data.config,
        appContext,
      }),
    })

    if (!res.ok) throw new Error(`API error ${res.status}`)
    const { files } = await res.json() as { files: GeneratedFile[] }
    updateNodeFiles(nodeId, files)
    return files
  }

  return { sendConfigureAll, sendConfigureNode, generateFiles }
}

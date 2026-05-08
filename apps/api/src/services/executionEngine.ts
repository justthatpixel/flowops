import { prisma } from '../db'
import { broadcast } from './websocketService'
import { mockRunNode } from './dockerRunner'
import { explainFailure } from './claudeService'

interface NodePayload {
  id: string
  data: { label: string; nodeType: string; config?: Record<string, unknown> }
}

interface EdgePayload {
  source: string
  target: string
}

function topoSort(nodes: NodePayload[], edges: EdgePayload[]): NodePayload[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0)
  const sorted: NodePayload[] = []

  while (queue.length) {
    const node = queue.shift()!
    sorted.push(node)
    for (const neighbour of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(neighbour) ?? 1) - 1
      inDegree.set(neighbour, deg)
      if (deg === 0) {
        const n = nodes.find((x) => x.id === neighbour)
        if (n) queue.push(n)
      }
    }
  }

  return sorted
}

export async function executeRun(
  runId: string,
  nodes: NodePayload[],
  edges: EdgePayload[],
  appContext = '',
) {
  const ordered = topoSort(nodes, edges)

  broadcast({ type: 'run:start', runId })

  for (const node of ordered) {
    await prisma.nodeRun.update({
      where: { runId_nodeId: { runId, nodeId: node.id } },
      data: { status: 'running', startedAt: new Date() },
    })
    broadcast({ type: 'node:status', runId, nodeId: node.id, status: 'running' })

    const result = await mockRunNode(node)
    const status = result.success ? 'success' : 'failed'

    await prisma.nodeRun.update({
      where: { runId_nodeId: { runId, nodeId: node.id } },
      data: { status, logs: result.logs, completedAt: new Date(), durationMs: result.durationMs },
    })
    broadcast({ type: 'node:status', runId, nodeId: node.id, status, logs: result.logs, durationMs: result.durationMs })

    if (!result.success) {
      // Auto-explain the failure via Claude (non-blocking — fire and push when done)
      explainFailure(node.data.nodeType, node.data.label, result.logs, appContext)
        .then((summary) => {
          broadcast({ type: 'node:ai_summary', runId, nodeId: node.id, ...summary })
        })
        .catch((err) => console.error('[explain-failure]', err))

      await prisma.pipelineRun.update({
        where: { id: runId },
        data: { status: 'failed', completedAt: new Date() },
      })
      broadcast({ type: 'run:complete', runId, status: 'failed' })
      return
    }
  }

  await prisma.pipelineRun.update({
    where: { id: runId },
    data: { status: 'success', completedAt: new Date() },
  })
  broadcast({ type: 'run:complete', runId, status: 'success' })
}

import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { executeRun } from '../services/executionEngine'

const router = Router()

interface NodePayload {
  id: string
  data: { label: string; nodeType: string; config?: Record<string, unknown> }
}
interface EdgePayload { source: string; target: string }

// POST /api/runs — start a pipeline run (inline nodes/edges)
router.post('/', async (req: Request, res: Response) => {
  const { name, nodes, edges, pipelineId } = req.body as {
    name?: string
    nodes: NodePayload[]
    edges: EdgePayload[]
    pipelineId?: string
  }

  if (!nodes?.length) {
    res.status(400).json({ error: 'nodes required' })
    return
  }

  // Create run record + pending NodeRun for each node
  const run = await prisma.pipelineRun.create({
    data: {
      name: name ?? 'Run',
      status: 'running',
      nodesSnapshot: nodes as object[],
      ...(pipelineId && { pipelineId }),
      nodeRuns: {
        create: nodes.map((n) => ({ nodeId: n.id, status: 'pending' })),
      },
    },
  })

  // Kick off async execution (don't await — WS drives the frontend)
  executeRun(run.id, nodes, edges).catch((err) =>
    console.error('[execution] error', err),
  )

  res.status(201).json({ runId: run.id })
})

// GET /api/runs/:id
router.get('/:id', async (req: Request, res: Response) => {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: req.params.id },
    include: { nodeRuns: true },
  })
  if (!run) { res.status(404).json({ error: 'Not found' }); return }
  res.json(run)
})

// GET /api/runs — recent runs (optional pipelineId filter)
router.get('/', async (req: Request, res: Response) => {
  const { pipelineId } = req.query as { pipelineId?: string }
  const runs = await prisma.pipelineRun.findMany({
    where: pipelineId ? { pipelineId } : undefined,
    orderBy: { startedAt: 'desc' },
    take: 20,
    include: { nodeRuns: { select: { nodeId: true, status: true, durationMs: true } } },
  })
  res.json(runs)
})

export default router

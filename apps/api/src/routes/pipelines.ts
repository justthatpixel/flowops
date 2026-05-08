import { Router, Request, Response } from 'express'
import { prisma } from '../db'

const router = Router()

// GET /api/pipelines
router.get('/', async (_req: Request, res: Response) => {
  const pipelines = await prisma.pipeline.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  })
  res.json(pipelines)
})

// POST /api/pipelines
router.post('/', async (req: Request, res: Response) => {
  const { name, nodes, edges } = req.body as {
    name: string
    nodes: unknown
    edges: unknown
  }
  if (!name || !nodes || !edges) {
    res.status(400).json({ error: 'name, nodes, edges required' })
    return
  }
  const pipeline = await prisma.pipeline.create({ data: { name, nodes, edges } })
  res.status(201).json(pipeline)
})

// GET /api/pipelines/:id
router.get('/:id', async (req: Request, res: Response) => {
  const pipeline = await prisma.pipeline.findUnique({ where: { id: req.params.id } })
  if (!pipeline) { res.status(404).json({ error: 'Not found' }); return }
  res.json(pipeline)
})

// PUT /api/pipelines/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { name, nodes, edges } = req.body as {
    name?: string
    nodes?: unknown
    edges?: unknown
  }
  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (nodes) data.nodes = nodes
  if (edges) data.edges = edges
  const pipeline = await prisma.pipeline.update({ where: { id: req.params.id }, data })
  res.json(pipeline)
})

// DELETE /api/pipelines/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.pipeline.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router

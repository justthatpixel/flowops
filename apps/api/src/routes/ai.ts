import { Router, Request, Response } from 'express'
import {
  streamConfigureAll,
  streamConfigureNode,
  generateFilesForNode,
  explainFailure,
} from '../services/claudeService'

const router = Router()

function sseSetup(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
}

function sseWrite(res: Response, event: string, data: string) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// POST /api/ai/configure-all
router.post('/configure-all', async (req: Request, res: Response) => {
  const { appContext, nodes } = req.body as { appContext: string; nodes: unknown[] }
  if (!appContext || !nodes) {
    res.status(400).json({ error: 'appContext and nodes required' })
    return
  }

  sseSetup(res)

  try {
    await streamConfigureAll(
      appContext,
      nodes,
      (chunk) => sseWrite(res, 'chunk', chunk),
      (fullText) => {
        sseWrite(res, 'done', fullText)
        res.end()
      },
    )
  } catch (err) {
    sseWrite(res, 'error', err instanceof Error ? err.message : 'Unknown error')
    res.end()
  }
})

// POST /api/ai/configure-node
router.post('/configure-node', async (req: Request, res: Response) => {
  const { appContext, node, prompt } = req.body as {
    appContext: string
    node: unknown
    prompt: string
  }
  if (!node || !prompt) {
    res.status(400).json({ error: 'node and prompt required' })
    return
  }

  sseSetup(res)

  try {
    await streamConfigureNode(
      appContext ?? '',
      node,
      prompt,
      (chunk) => sseWrite(res, 'chunk', chunk),
      (fullText) => {
        sseWrite(res, 'done', fullText)
        res.end()
      },
    )
  } catch (err) {
    sseWrite(res, 'error', err instanceof Error ? err.message : 'Unknown error')
    res.end()
  }
})

// POST /api/ai/generate-files
router.post('/generate-files', async (req: Request, res: Response) => {
  const { nodeType, label, config, appContext } = req.body as {
    nodeType: string
    label: string
    config: unknown
    appContext?: string
  }
  if (!nodeType || !label) {
    res.status(400).json({ error: 'nodeType and label required' })
    return
  }

  try {
    const files = await generateFilesForNode(nodeType, label, config, appContext ?? '')
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

// POST /api/ai/explain-failure
router.post('/explain-failure', async (req: Request, res: Response) => {
  const { nodeType, label, logs, appContext } = req.body as {
    nodeType: string
    label: string
    logs: string
    appContext?: string
  }
  if (!nodeType || !logs) {
    res.status(400).json({ error: 'nodeType and logs required' })
    return
  }
  try {
    const result = await explainFailure(nodeType, label ?? nodeType, logs, appContext ?? '')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

export default router

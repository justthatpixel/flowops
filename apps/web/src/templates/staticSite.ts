import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

const Y = 180
const GAP = 240

export const STATIC_SITE_NODES: Node<PipelineNodeData>[] = [
  {
    id: 's1',
    type: 'pipelineNode',
    position: { x: 100, y: Y },
    data: {
      label: 'GitHub Trigger',
      nodeType: 'trigger',
      status: 'idle',
      config: { provider: 'github', repo: '', branch: 'main', event: 'push' },
    },
  },
  {
    id: 's2',
    type: 'pipelineNode',
    position: { x: 100 + GAP, y: Y },
    data: {
      label: 'Install',
      nodeType: 'build',
      status: 'idle',
      config: { ciProvider: 'github_actions', runtime: 'node', packageManager: 'pnpm', buildCommand: 'pnpm install' },
    },
  },
  {
    id: 's3',
    type: 'pipelineNode',
    position: { x: 100 + GAP * 2, y: Y },
    data: {
      label: 'Build',
      nodeType: 'build',
      status: 'idle',
      config: { ciProvider: 'github_actions', runtime: 'node', packageManager: 'pnpm', buildCommand: 'pnpm build' },
    },
  },
  {
    id: 's4',
    type: 'pipelineNode',
    position: { x: 100 + GAP * 3, y: Y },
    data: {
      label: 'Deploy to Vercel',
      nodeType: 'deploy',
      status: 'idle',
      config: { provider: 'vercel', service: 'Serverless', region: '' },
    },
  },
]

export const STATIC_SITE_EDGES: Edge[] = [
  { id: 'se1-2', type: 'animatedEdge', source: 's1', target: 's2', data: { animated: false } },
  { id: 'se2-3', type: 'animatedEdge', source: 's2', target: 's3', data: { animated: false } },
  { id: 'se3-4', type: 'animatedEdge', source: 's3', target: 's4', data: { animated: false } },
]

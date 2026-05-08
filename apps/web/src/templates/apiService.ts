import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

const Y = 180
const GAP = 220

export const API_SERVICE_NODES: Node<PipelineNodeData>[] = [
  {
    id: 'a1',
    type: 'pipelineNode',
    position: { x: 60, y: Y },
    data: {
      label: 'GitHub Trigger',
      nodeType: 'trigger',
      status: 'idle',
      config: { provider: 'github', repo: '', branch: 'main', event: 'push' },
    },
  },
  {
    id: 'a2',
    type: 'pipelineNode',
    position: { x: 60 + GAP, y: Y },
    data: {
      label: 'Build',
      nodeType: 'build',
      status: 'idle',
      config: { ciProvider: 'github_actions', runtime: 'node', packageManager: 'npm', buildCommand: 'npm run build' },
    },
  },
  {
    id: 'a3',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 2, y: Y },
    data: {
      label: 'Unit Tests',
      nodeType: 'test',
      status: 'idle',
      config: { runner: 'jest', coverage: true },
    },
  },
  {
    id: 'a4',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 3, y: Y },
    data: {
      label: 'Integration Tests',
      nodeType: 'test',
      status: 'idle',
      config: { runner: 'jest', coverage: false },
    },
  },
  {
    id: 'a5',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 4, y: Y },
    data: {
      label: 'Docker Build',
      nodeType: 'docker',
      status: 'idle',
      config: { baseImage: 'node:20-alpine', registry: 'ecr', imageName: 'api-service', tag: 'latest' },
    },
  },
  {
    id: 'a6',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 5, y: Y },
    data: {
      label: 'Deploy to Cloud Run',
      nodeType: 'deploy',
      status: 'idle',
      config: { provider: 'gcp', service: 'Cloud Run', region: 'us-central1' },
    },
  },
]

export const API_SERVICE_EDGES: Edge[] = [
  { id: 'ae1-2', type: 'animatedEdge', source: 'a1', target: 'a2', data: { animated: false } },
  { id: 'ae2-3', type: 'animatedEdge', source: 'a2', target: 'a3', data: { animated: false } },
  { id: 'ae3-4', type: 'animatedEdge', source: 'a3', target: 'a4', data: { animated: false } },
  { id: 'ae4-5', type: 'animatedEdge', source: 'a4', target: 'a5', data: { animated: false } },
  { id: 'ae5-6', type: 'animatedEdge', source: 'a5', target: 'a6', data: { animated: false } },
]

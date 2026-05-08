import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

const Y = 180
const GAP = 230

export const WEB_APP_NODES: Node<PipelineNodeData>[] = [
  {
    id: 'n1',
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
    id: 'n2',
    type: 'pipelineNode',
    position: { x: 60 + GAP, y: Y },
    data: {
      label: 'Install & Build',
      nodeType: 'build',
      status: 'idle',
      config: {
        ciProvider: 'github_actions',
        runtime: 'node',
        packageManager: 'pnpm',
        buildCommand: 'pnpm build',
      },
    },
  },
  {
    id: 'n3',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 2, y: Y },
    data: {
      label: 'Test Suite',
      nodeType: 'test',
      status: 'idle',
      config: { runner: 'vitest', coverage: true },
    },
  },
  {
    id: 'n4',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 3, y: Y },
    data: {
      label: 'Docker Build',
      nodeType: 'docker',
      status: 'idle',
      config: {
        baseImage: 'node:20-alpine',
        registry: 'ghcr',
        imageName: 'my-app',
        tag: 'latest',
      },
    },
  },
  {
    id: 'n5',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 4, y: Y },
    data: {
      label: 'Push to Registry',
      nodeType: 'docker',
      status: 'idle',
      config: {
        baseImage: 'node:20-alpine',
        registry: 'ecr',
        imageName: 'my-app',
        tag: 'latest',
      },
    },
  },
  {
    id: 'n6',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 5, y: Y },
    data: {
      label: 'Deploy',
      nodeType: 'deploy',
      status: 'idle',
      config: { provider: 'aws', service: 'ECS Fargate', region: 'us-east-1' },
    },
  },
]

export const WEB_APP_EDGES: Edge[] = [
  { id: 'e1-2', type: 'animatedEdge', source: 'n1', target: 'n2', data: { animated: false } },
  { id: 'e2-3', type: 'animatedEdge', source: 'n2', target: 'n3', data: { animated: false } },
  { id: 'e3-4', type: 'animatedEdge', source: 'n3', target: 'n4', data: { animated: false } },
  { id: 'e4-5', type: 'animatedEdge', source: 'n4', target: 'n5', data: { animated: false } },
  { id: 'e5-6', type: 'animatedEdge', source: 'n5', target: 'n6', data: { animated: false } },
]

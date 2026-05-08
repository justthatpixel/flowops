import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

const Y = 180
const GAP = 220

export const ML_PIPELINE_NODES: Node<PipelineNodeData>[] = [
  {
    id: 'm1',
    type: 'pipelineNode',
    position: { x: 60, y: Y },
    data: {
      label: 'Manual Trigger',
      nodeType: 'trigger',
      status: 'idle',
      config: { provider: 'manual', event: 'manual' },
    },
  },
  {
    id: 'm2',
    type: 'pipelineNode',
    position: { x: 60 + GAP, y: Y },
    data: {
      label: 'Data Validation',
      nodeType: 'test',
      status: 'idle',
      config: { runner: 'pytest', coverage: false },
    },
  },
  {
    id: 'm3',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 2, y: Y },
    data: {
      label: 'Train Model',
      nodeType: 'build',
      status: 'idle',
      config: { ciProvider: 'none', runtime: 'python', packageManager: 'pip', buildCommand: 'python train.py' },
    },
  },
  {
    id: 'm4',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 3, y: Y },
    data: {
      label: 'Evaluate',
      nodeType: 'test',
      status: 'idle',
      config: { runner: 'pytest', coverage: false },
    },
  },
  {
    id: 'm5',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 4, y: Y },
    data: {
      label: 'Review Metrics',
      nodeType: 'claude_task',
      status: 'idle',
      config: { prompt: 'Review model evaluation metrics. Flag if accuracy < 0.85 or if there are signs of overfitting. Suggest next steps.' },
    },
  },
  {
    id: 'm6',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 5, y: Y },
    data: {
      label: 'Deploy Model',
      nodeType: 'deploy',
      status: 'idle',
      config: { provider: 'aws', service: 'Lambda', region: 'us-east-1' },
    },
  },
]

export const ML_PIPELINE_EDGES: Edge[] = [
  { id: 'me1-2', type: 'animatedEdge', source: 'm1', target: 'm2', data: { animated: false } },
  { id: 'me2-3', type: 'animatedEdge', source: 'm2', target: 'm3', data: { animated: false } },
  { id: 'me3-4', type: 'animatedEdge', source: 'm3', target: 'm4', data: { animated: false } },
  { id: 'me4-5', type: 'animatedEdge', source: 'm4', target: 'm5', data: { animated: false } },
  { id: 'me5-6', type: 'animatedEdge', source: 'm5', target: 'm6', data: { animated: false } },
]

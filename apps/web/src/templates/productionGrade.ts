import type { Node, Edge } from '@xyflow/react'
import type { PipelineNodeData } from '@/types/pipeline'

const ROW1_Y = 100
const ROW2_Y = 320
const GAP = 210

export const PROD_GRADE_NODES: Node<PipelineNodeData>[] = [
  // ── Row 1: left → right ──────────────────────────────────────────────────────
  {
    id: 'n1',
    type: 'pipelineNode',
    position: { x: 60, y: ROW1_Y },
    data: {
      label: 'GitLab Trigger',
      nodeType: 'trigger',
      status: 'idle',
      config: { provider: 'gitlab', branch: 'main', event: 'push' },
    },
  },
  {
    id: 'n2',
    type: 'pipelineNode',
    position: { x: 60 + GAP, y: ROW1_Y },
    data: {
      label: 'Install & Build',
      nodeType: 'build',
      status: 'idle',
      config: {
        ciProvider: 'none',
        runtime: 'node',
        packageManager: 'pnpm',
        buildCommand: 'pnpm build',
      },
    },
  },
  {
    id: 'n3',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 2, y: ROW1_Y },
    data: {
      label: 'SonarQube Analysis',
      nodeType: 'security_audit',
      status: 'idle',
      config: { tools: ['sonarqube'], failOnCritical: true },
    },
  },
  {
    id: 'n4',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 3, y: ROW1_Y },
    data: {
      label: 'Unit + Integration',
      nodeType: 'test',
      status: 'idle',
      config: { runner: 'vitest', coverage: true },
    },
  },
  {
    id: 'n5',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 4, y: ROW1_Y },
    data: {
      label: 'Docker Build',
      nodeType: 'docker',
      status: 'idle',
      config: {
        baseImage: 'node:20-alpine',
        registry: 'ecr',
        imageName: 'prod-app',
        tag: 'latest',
      },
    },
  },
  {
    id: 'n6',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 5, y: ROW1_Y },
    data: {
      label: 'Trivy Container Scan',
      nodeType: 'trivy',
      status: 'idle',
      config: {
        severity: ['CRITICAL', 'HIGH'],
        failOnSeverity: 'HIGH',
        ignoreUnfixed: false,
      },
    },
  },
  {
    id: 'n7',
    type: 'pipelineNode',
    position: { x: 60 + GAP * 6, y: ROW1_Y },
    data: {
      label: 'Push to ECR',
      nodeType: 'docker',
      status: 'idle',
      config: { registry: 'ecr', imageName: 'prod-app' },
    },
  },

  // ── Row 2: right → left ──────────────────────────────────────────────────────
  {
    id: 'n8',
    type: 'pipelineNode',
    position: { x: 1320, y: ROW2_Y },
    data: {
      label: 'Deploy Staging',
      nodeType: 'deploy',
      status: 'idle',
      config: { provider: 'aws', service: 'ECS Fargate', region: 'us-east-1' },
    },
  },
  {
    id: 'n9',
    type: 'pipelineNode',
    position: { x: 1110, y: ROW2_Y },
    data: {
      label: 'E2E Test Suite',
      nodeType: 'playwright',
      status: 'idle',
      config: {
        browsers: ['chromium', 'firefox'],
        reportType: 'html',
      },
    },
  },
  {
    id: 'n10',
    type: 'pipelineNode',
    position: { x: 900, y: ROW2_Y },
    data: {
      label: 'Prometheus Health',
      nodeType: 'prometheus',
      status: 'idle',
      config: {
        scrapeInterval: 15,
        metrics: ['http_request_duration_seconds', 'up'],
      },
    },
  },
  {
    id: 'n11',
    type: 'pipelineNode',
    position: { x: 690, y: ROW2_Y },
    data: {
      label: 'Deploy Production',
      nodeType: 'deploy',
      status: 'idle',
      config: { provider: 'aws', service: 'ECS Fargate', region: 'us-east-1' },
    },
  },
  {
    id: 'n12',
    type: 'pipelineNode',
    position: { x: 480, y: ROW2_Y },
    data: {
      label: 'Grafana Monitoring',
      nodeType: 'grafana',
      status: 'idle',
      config: {
        datasource: 'prometheus',
        alertThreshold: 95,
      },
    },
  },
  {
    id: 'n13',
    type: 'pipelineNode',
    position: { x: 270, y: ROW2_Y },
    data: {
      label: 'Notify Team',
      nodeType: 'notify',
      status: 'idle',
      config: { channel: 'slack', onSuccess: true, onFailure: true },
    },
  },
]

export const PROD_GRADE_EDGES: Edge[] = [
  { id: 'e1-2',   type: 'animatedEdge', source: 'n1',  target: 'n2',  data: { animated: false } },
  { id: 'e2-3',   type: 'animatedEdge', source: 'n2',  target: 'n3',  data: { animated: false } },
  { id: 'e3-4',   type: 'animatedEdge', source: 'n3',  target: 'n4',  data: { animated: false } },
  { id: 'e4-5',   type: 'animatedEdge', source: 'n4',  target: 'n5',  data: { animated: false } },
  { id: 'e5-6',   type: 'animatedEdge', source: 'n5',  target: 'n6',  data: { animated: false } },
  { id: 'e6-7',   type: 'animatedEdge', source: 'n6',  target: 'n7',  data: { animated: false } },
  { id: 'e7-8',   type: 'animatedEdge', source: 'n7',  target: 'n8',  data: { animated: false } },
  { id: 'e8-9',   type: 'animatedEdge', source: 'n8',  target: 'n9',  data: { animated: false } },
  { id: 'e9-10',  type: 'animatedEdge', source: 'n9',  target: 'n10', data: { animated: false } },
  { id: 'e10-11', type: 'animatedEdge', source: 'n10', target: 'n11', data: { animated: false } },
  { id: 'e11-12', type: 'animatedEdge', source: 'n11', target: 'n12', data: { animated: false } },
  { id: 'e12-13', type: 'animatedEdge', source: 'n12', target: 'n13', data: { animated: false } },
]

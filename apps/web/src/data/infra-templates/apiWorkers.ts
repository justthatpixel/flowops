import type { TierLayout, ScaleTierIndex } from '@/types/infra'

export const API_WORKERS_TIERS: Record<ScaleTierIndex, TierLayout> = {
  // ── Tier 0 — Dev / Hobby ────────────────────────────────────────────────────
  0: {
    components: [
      { id: 'alb-0',    type: 'alb',    label: 'App Load Balancer',   position: { x: 80,  y: 200 }, config: {} },
      { id: 'api-0',    type: 'ecs',    label: 'API Server',          position: { x: 360, y: 140 }, config: { vcpu: 0.25, memoryGb: 0.5, count: 1 } },
      { id: 'worker-0', type: 'ecs',    label: 'Worker',              position: { x: 360, y: 300 }, config: { vcpu: 0.25, memoryGb: 0.5, count: 1 } },
      { id: 'sqs-0',    type: 'sqs',    label: 'SQS Queue',           position: { x: 640, y: 220 }, config: {} },
      { id: 'rds-0',    type: 'rds',    label: 'RDS t3.micro',        position: { x: 880, y: 220 }, config: { instanceClass: 'db.t3.micro', multiAz: false } },
    ],
    edges: [
      { id: 'e-alb-api-0',    source: 'alb-0',    target: 'api-0' },
      { id: 'e-api-sqs-0',    source: 'api-0',    target: 'sqs-0',    label: 'enqueue' },
      { id: 'e-sqs-worker-0', source: 'sqs-0',    target: 'worker-0', label: 'consume' },
      { id: 'e-api-rds-0',    source: 'api-0',    target: 'rds-0' },
      { id: 'e-worker-rds-0', source: 'worker-0', target: 'rds-0' },
    ],
  },

  // ── Tier 1 — Early Startup ──────────────────────────────────────────────────
  1: {
    components: [
      { id: 'alb-1',    type: 'alb',         label: 'App Load Balancer',  position: { x: 60,  y: 240 }, config: {} },
      { id: 'nat-1',    type: 'nat_gateway',  label: 'NAT Gateway',        position: { x: 360, y: 60  }, config: { count: 1 } },
      { id: 'api-1',    type: 'ecs',          label: 'API Server ×1',      position: { x: 360, y: 180 }, config: { vcpu: 0.5, memoryGb: 1, count: 1 } },
      { id: 'worker-1', type: 'ecs',          label: 'Worker ×2',          position: { x: 360, y: 340 }, config: { vcpu: 0.5, memoryGb: 1, count: 2 } },
      { id: 'sqs-1',    type: 'sqs',          label: 'SQS Queue',          position: { x: 640, y: 260 }, config: {} },
      { id: 'rds-1',    type: 'rds',          label: 'RDS t3.medium',      position: { x: 880, y: 260 }, config: { instanceClass: 'db.t3.medium', multiAz: false } },
    ],
    edges: [
      { id: 'e-alb-api-1',    source: 'alb-1',    target: 'api-1' },
      { id: 'e-api-sqs-1',    source: 'api-1',    target: 'sqs-1',    label: 'enqueue' },
      { id: 'e-sqs-worker-1', source: 'sqs-1',    target: 'worker-1', label: 'consume' },
      { id: 'e-api-rds-1',    source: 'api-1',    target: 'rds-1' },
      { id: 'e-worker-rds-1', source: 'worker-1', target: 'rds-1' },
      { id: 'e-nat-1',        source: 'api-1',    target: 'nat-1',    label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-1', type: 'vpc',    position: { x: 290, y: 20  }, width: 480, height: 420, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'pub-1', type: 'subnet', position: { x: 320, y: 42  }, width: 200, height: 100, data: { label: 'Public Subnet', subnetType: 'public' } },
      { id: 'prv-1', type: 'subnet', position: { x: 320, y: 176 }, width: 430, height: 240, data: { label: 'Private Subnet', subnetType: 'private' } },
    ],
  },

  // ── Tier 2 — Growing ────────────────────────────────────────────────────────
  2: {
    components: [
      { id: 'alb-2',    type: 'alb',         label: 'App Load Balancer',  position: { x: 60,  y: 260 }, config: {} },
      { id: 'nat-2',    type: 'nat_gateway',  label: 'NAT Gateway ×2',     position: { x: 360, y: 60  }, config: { count: 2 } },
      { id: 'api-2',    type: 'ecs',          label: 'API Server ×2',      position: { x: 360, y: 180 }, config: { vcpu: 1, memoryGb: 2, count: 2 } },
      { id: 'worker-2', type: 'ecs',          label: 'Worker ×4',          position: { x: 360, y: 360 }, config: { vcpu: 1, memoryGb: 2, count: 4 } },
      { id: 'sqs-2',    type: 'sqs',          label: 'SQS Queue',          position: { x: 640, y: 180 }, config: {} },
      { id: 'dlq-2',    type: 'sqs',          label: 'Dead Letter Queue',  position: { x: 640, y: 360 }, config: {} },
      { id: 'cache-2',  type: 'elasticache',  label: 'ElastiCache Redis',  position: { x: 900, y: 180 }, config: { nodeType: 'cache.t3.small', nodes: 1 } },
      { id: 'rds-2',    type: 'rds',          label: 'RDS Multi-AZ',       position: { x: 900, y: 360 }, config: { instanceClass: 'db.t3.medium', multiAz: true } },
    ],
    edges: [
      { id: 'e-alb-api-2',    source: 'alb-2',    target: 'api-2' },
      { id: 'e-api-sqs-2',    source: 'api-2',    target: 'sqs-2',    label: 'enqueue' },
      { id: 'e-sqs-worker-2', source: 'sqs-2',    target: 'worker-2', label: 'consume' },
      { id: 'e-sqs-dlq-2',    source: 'sqs-2',    target: 'dlq-2',    label: 'failed' },
      { id: 'e-api-cache-2',  source: 'api-2',    target: 'cache-2' },
      { id: 'e-api-rds-2',    source: 'api-2',    target: 'rds-2' },
      { id: 'e-worker-rds-2', source: 'worker-2', target: 'rds-2' },
      { id: 'e-nat-2',        source: 'api-2',    target: 'nat-2',    label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-2', type: 'vpc',    position: { x: 290, y: 16  }, width: 500, height: 450, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'pub-2', type: 'subnet', position: { x: 320, y: 38  }, width: 200, height: 100, data: { label: 'Public Subnet (×2 AZ)', subnetType: 'public' } },
      { id: 'prv-2', type: 'subnet', position: { x: 320, y: 174 }, width: 450, height: 272, data: { label: 'Private Subnet (×2 AZ)', subnetType: 'private' } },
    ],
  },

  // ── Tier 3 — Scaling ────────────────────────────────────────────────────────
  3: {
    components: [
      { id: 'cf-3',     type: 'cloudfront',  label: 'CloudFront CDN',      position: { x: -200, y: 260 }, config: {} },
      { id: 'waf-3',    type: 'waf',         label: 'WAF',                  position: { x: 60,   y: 260 }, config: {} },
      { id: 'alb-3',    type: 'alb',         label: 'App Load Balancer',    position: { x: 320,  y: 260 }, config: {} },
      { id: 'nat-3',    type: 'nat_gateway', label: 'NAT ×3',               position: { x: 580,  y: 60  }, config: { count: 3 } },
      { id: 'api-3',    type: 'ecs',         label: 'API Server ×4 Auto',   position: { x: 580,  y: 180 }, config: { vcpu: 2, memoryGb: 4, count: 4, maxCount: 40 } },
      { id: 'worker-3', type: 'ecs',         label: 'Worker ×8 Auto',       position: { x: 580,  y: 360 }, config: { vcpu: 2, memoryGb: 4, count: 8, maxCount: 80 } },
      { id: 'sqs-3',    type: 'sqs',         label: 'SQS FIFO Queue',       position: { x: 860,  y: 180 }, config: {} },
      { id: 'cache-3',  type: 'elasticache', label: 'ElastiCache ×3',       position: { x: 860,  y: 320 }, config: { nodeType: 'cache.r6g.large', nodes: 3 } },
      { id: 'rds-3',    type: 'rds',         label: 'Aurora PostgreSQL',     position: { x: 1100, y: 260 }, config: { instanceClass: 'db.r6g.large', multiAz: true } },
    ],
    edges: [
      { id: 'e-cf-waf-3',     source: 'cf-3',     target: 'waf-3' },
      { id: 'e-waf-alb-3',    source: 'waf-3',    target: 'alb-3' },
      { id: 'e-alb-api-3',    source: 'alb-3',    target: 'api-3' },
      { id: 'e-api-sqs-3',    source: 'api-3',    target: 'sqs-3',    label: 'enqueue' },
      { id: 'e-sqs-worker-3', source: 'sqs-3',    target: 'worker-3', label: 'consume' },
      { id: 'e-api-cache-3',  source: 'api-3',    target: 'cache-3' },
      { id: 'e-api-rds-3',    source: 'api-3',    target: 'rds-3' },
      { id: 'e-worker-rds-3', source: 'worker-3', target: 'rds-3' },
      { id: 'e-nat-3',        source: 'api-3',    target: 'nat-3',    label: 'outbound' },
    ],
  },

  // ── Tier 4 — Enterprise ─────────────────────────────────────────────────────
  4: {
    components: [
      { id: 'r53-4',    type: 'route53',     label: 'Route 53',             position: { x: -460, y: 260 }, config: {} },
      { id: 'cf-4',     type: 'cloudfront',  label: 'CloudFront CDN',       position: { x: -220, y: 260 }, config: {} },
      { id: 'waf-4',    type: 'waf',         label: 'WAF + Shield',         position: { x: 20,   y: 260 }, config: {} },
      { id: 'alb-4',    type: 'alb',         label: 'App Load Balancer',    position: { x: 260,  y: 260 }, config: {} },
      { id: 'nat-4',    type: 'nat_gateway', label: 'NAT ×3',               position: { x: 520,  y: 60  }, config: { count: 3 } },
      { id: 'api-4',    type: 'ecs',         label: 'API Server ×10 Auto',  position: { x: 520,  y: 180 }, config: { vcpu: 4, memoryGb: 8, count: 10, maxCount: 200 } },
      { id: 'worker-4', type: 'ecs',         label: 'Worker ×20 Auto',      position: { x: 520,  y: 380 }, config: { vcpu: 4, memoryGb: 8, count: 20, maxCount: 400 } },
      { id: 'sqs-4',    type: 'sqs',         label: 'SQS FIFO Queue',       position: { x: 800,  y: 180 }, config: {} },
      { id: 'cache-4',  type: 'elasticache', label: 'ElastiCache ×6',       position: { x: 800,  y: 340 }, config: { nodeType: 'cache.r6g.2xlarge', nodes: 6 } },
      { id: 'aurora-4', type: 'rds',         label: 'Aurora Global DB',     position: { x: 1060, y: 260 }, config: { instanceClass: 'db.r6g.2xlarge', multiAz: true, global: true } },
    ],
    edges: [
      { id: 'e-r53-cf-4',     source: 'r53-4',    target: 'cf-4' },
      { id: 'e-cf-waf-4',     source: 'cf-4',     target: 'waf-4' },
      { id: 'e-waf-alb-4',    source: 'waf-4',    target: 'alb-4' },
      { id: 'e-alb-api-4',    source: 'alb-4',    target: 'api-4' },
      { id: 'e-api-sqs-4',    source: 'api-4',    target: 'sqs-4',    label: 'enqueue' },
      { id: 'e-sqs-worker-4', source: 'sqs-4',    target: 'worker-4', label: 'consume' },
      { id: 'e-api-cache-4',  source: 'api-4',    target: 'cache-4' },
      { id: 'e-api-rds-4',    source: 'api-4',    target: 'aurora-4' },
      { id: 'e-worker-rds-4', source: 'worker-4', target: 'aurora-4' },
      { id: 'e-nat-4',        source: 'api-4',    target: 'nat-4',    label: 'outbound' },
    ],
  },
}

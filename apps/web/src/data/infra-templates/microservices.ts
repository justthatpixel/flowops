import type { TierLayout, ScaleTierIndex } from '@/types/infra'

export const MICROSERVICES_TIERS: Record<ScaleTierIndex, TierLayout> = {
  // ── Tier 0 — Dev / Hobby ────────────────────────────────────────────────────
  0: {
    components: [
      { id: 'alb-0',    type: 'alb', label: 'App Load Balancer',       position: { x: 80,  y: 220 }, config: {} },
      { id: 'svc-a-0',  type: 'ecs', label: 'Service A (API)',          position: { x: 360, y: 140 }, config: { vcpu: 0.25, memoryGb: 0.5, count: 1 } },
      { id: 'svc-b-0',  type: 'ecs', label: 'Service B (Worker)',       position: { x: 360, y: 300 }, config: { vcpu: 0.25, memoryGb: 0.5, count: 1 } },
      { id: 'rds-0',    type: 'rds', label: 'Shared RDS t3.micro',      position: { x: 640, y: 220 }, config: { instanceClass: 'db.t3.micro', multiAz: false } },
    ],
    edges: [
      { id: 'e-alb-a-0',   source: 'alb-0',   target: 'svc-a-0' },
      { id: 'e-alb-b-0',   source: 'alb-0',   target: 'svc-b-0' },
      { id: 'e-a-rds-0',   source: 'svc-a-0', target: 'rds-0' },
      { id: 'e-b-rds-0',   source: 'svc-b-0', target: 'rds-0' },
    ],
  },

  // ── Tier 1 — Early Startup ──────────────────────────────────────────────────
  1: {
    components: [
      { id: 'alb-1',    type: 'alb',         label: 'App Load Balancer',  position: { x: 60,  y: 240 }, config: {} },
      { id: 'nat-1',    type: 'nat_gateway',  label: 'NAT Gateway',        position: { x: 360, y: 60  }, config: { count: 1 } },
      { id: 'svc-a-1',  type: 'ecs',          label: 'Service A (API)',    position: { x: 360, y: 160 }, config: { vcpu: 0.5, memoryGb: 1, count: 1 } },
      { id: 'svc-b-1',  type: 'ecs',          label: 'Service B (Auth)',   position: { x: 360, y: 300 }, config: { vcpu: 0.5, memoryGb: 1, count: 1 } },
      { id: 'sqs-1',    type: 'sqs',          label: 'SQS (event bus)',    position: { x: 360, y: 420 }, config: {} },
      { id: 'rds-1',    type: 'rds',          label: 'RDS t3.medium',      position: { x: 640, y: 240 }, config: { instanceClass: 'db.t3.medium', multiAz: false } },
    ],
    edges: [
      { id: 'e-alb-a-1',   source: 'alb-1',   target: 'svc-a-1' },
      { id: 'e-alb-b-1',   source: 'alb-1',   target: 'svc-b-1' },
      { id: 'e-a-rds-1',   source: 'svc-a-1', target: 'rds-1' },
      { id: 'e-b-rds-1',   source: 'svc-b-1', target: 'rds-1' },
      { id: 'e-a-sqs-1',   source: 'svc-a-1', target: 'sqs-1',  label: 'events' },
      { id: 'e-svc-nat-1', source: 'svc-a-1', target: 'nat-1',  label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-1',        type: 'vpc',    position: { x: 290, y: 20  }, width: 480, height: 480, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'pub-1',        type: 'subnet', position: { x: 320, y: 42  }, width: 200, height: 100, data: { label: 'Public Subnet', subnetType: 'public' } },
      { id: 'prv-1',        type: 'subnet', position: { x: 320, y: 176 }, width: 430, height: 290, data: { label: 'Private Subnet', subnetType: 'private' } },
    ],
  },

  // ── Tier 2 — Growing ────────────────────────────────────────────────────────
  2: {
    components: [
      { id: 'alb-2',    type: 'alb',         label: 'App Load Balancer',   position: { x: 60,  y: 280 }, config: {} },
      { id: 'nat-2',    type: 'nat_gateway',  label: 'NAT Gateway ×2',      position: { x: 360, y: 60  }, config: { count: 2 } },
      { id: 'svc-a-2',  type: 'ecs',          label: 'API Service ×2',      position: { x: 360, y: 160 }, config: { vcpu: 1, memoryGb: 2, count: 2 } },
      { id: 'svc-b-2',  type: 'ecs',          label: 'Auth Service ×2',     position: { x: 360, y: 300 }, config: { vcpu: 0.5, memoryGb: 1, count: 2 } },
      { id: 'svc-c-2',  type: 'ecs',          label: 'Worker Service ×2',   position: { x: 360, y: 420 }, config: { vcpu: 1, memoryGb: 2, count: 2 } },
      { id: 'sqs-2',    type: 'sqs',          label: 'SQS (event bus)',      position: { x: 640, y: 420 }, config: {} },
      { id: 'rds-2',    type: 'rds',          label: 'RDS Multi-AZ',         position: { x: 640, y: 160 }, config: { instanceClass: 'db.t3.medium', multiAz: true } },
      { id: 'cache-2',  type: 'elasticache',  label: 'ElastiCache Redis',    position: { x: 640, y: 300 }, config: { nodeType: 'cache.t3.small', nodes: 1 } },
    ],
    edges: [
      { id: 'e-alb-a-2',   source: 'alb-2',   target: 'svc-a-2' },
      { id: 'e-alb-b-2',   source: 'alb-2',   target: 'svc-b-2' },
      { id: 'e-a-rds-2',   source: 'svc-a-2', target: 'rds-2' },
      { id: 'e-a-cache-2', source: 'svc-a-2', target: 'cache-2' },
      { id: 'e-a-sqs-2',   source: 'svc-a-2', target: 'sqs-2',  label: 'events' },
      { id: 'e-sqs-c-2',   source: 'sqs-2',   target: 'svc-c-2',label: 'consume' },
      { id: 'e-nat-2',     source: 'svc-a-2', target: 'nat-2',  label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-2',  type: 'vpc',    position: { x: 290, y: 16  }, width: 510, height: 510, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'pub-2',  type: 'subnet', position: { x: 320, y: 38  }, width: 200, height: 100, data: { label: 'Public Subnet (×2 AZ)', subnetType: 'public' } },
      { id: 'prv-2',  type: 'subnet', position: { x: 320, y: 174 }, width: 464, height: 326, data: { label: 'Private Subnet (×2 AZ)', subnetType: 'private' } },
    ],
  },

  // ── Tier 3 — Scaling ────────────────────────────────────────────────────────
  3: {
    components: [
      { id: 'cf-3',    type: 'cloudfront',  label: 'CloudFront CDN',       position: { x: -200, y: 280 }, config: {} },
      { id: 'waf-3',   type: 'waf',         label: 'WAF',                   position: { x: 60,   y: 280 }, config: {} },
      { id: 'alb-3',   type: 'alb',         label: 'App Load Balancer',     position: { x: 320,  y: 280 }, config: {} },
      { id: 'nat-3',   type: 'nat_gateway', label: 'NAT ×3',                position: { x: 580,  y: 60  }, config: { count: 3 } },
      { id: 'api-3',   type: 'ecs',         label: 'API Service ×3',        position: { x: 580,  y: 160 }, config: { vcpu: 2, memoryGb: 4, count: 3 } },
      { id: 'auth-3',  type: 'ecs',         label: 'Auth Service ×2',       position: { x: 580,  y: 280 }, config: { vcpu: 1, memoryGb: 2, count: 2 } },
      { id: 'work-3',  type: 'ecs',         label: 'Worker Service ×4',     position: { x: 580,  y: 400 }, config: { vcpu: 2, memoryGb: 4, count: 4 } },
      { id: 'sqs-3',   type: 'sqs',         label: 'SQS FIFO Queue',        position: { x: 860,  y: 400 }, config: {} },
      { id: 'rds-3',   type: 'rds',         label: 'Aurora PostgreSQL',      position: { x: 860,  y: 160 }, config: { instanceClass: 'db.r6g.large', multiAz: true } },
      { id: 'cache-3', type: 'elasticache', label: 'ElastiCache ×3',        position: { x: 860,  y: 290 }, config: { nodeType: 'cache.r6g.large', nodes: 3 } },
    ],
    edges: [
      { id: 'e-cf-waf-3',  source: 'cf-3',   target: 'waf-3' },
      { id: 'e-waf-alb-3', source: 'waf-3',  target: 'alb-3' },
      { id: 'e-alb-api-3', source: 'alb-3',  target: 'api-3' },
      { id: 'e-alb-auth-3',source: 'alb-3',  target: 'auth-3' },
      { id: 'e-api-rds-3', source: 'api-3',  target: 'rds-3' },
      { id: 'e-api-cache-3',source:'api-3',  target: 'cache-3' },
      { id: 'e-api-sqs-3', source: 'api-3',  target: 'sqs-3',  label: 'events' },
      { id: 'e-sqs-work-3',source: 'sqs-3',  target: 'work-3', label: 'consume' },
      { id: 'e-nat-3',     source: 'api-3',  target: 'nat-3',  label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-3',  type: 'vpc',    position: { x: 510, y: 16  }, width: 470, height: 500, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'pub-3',  type: 'subnet', position: { x: 540, y: 38  }, width: 200, height: 100, data: { label: 'Public Subnet (×3 AZ)', subnetType: 'public' } },
      { id: 'prv-3',  type: 'subnet', position: { x: 540, y: 174 }, width: 424, height: 316, data: { label: 'Private Subnet (×3 AZ)', subnetType: 'private' } },
    ],
  },

  // ── Tier 4 — Enterprise ─────────────────────────────────────────────────────
  4: {
    components: [
      { id: 'r53-4',   type: 'route53',     label: 'Route 53',              position: { x: -460, y: 280 }, config: { failover: true } },
      { id: 'cf-4',    type: 'cloudfront',  label: 'CloudFront CDN',        position: { x: -220, y: 280 }, config: {} },
      { id: 'waf-4',   type: 'waf',         label: 'WAF + Shield',          position: { x: 20,   y: 280 }, config: {} },
      { id: 'alb-4',   type: 'alb',         label: 'App Load Balancer',     position: { x: 260,  y: 280 }, config: {} },
      { id: 'nat-4',   type: 'nat_gateway', label: 'NAT ×3',                position: { x: 520,  y: 60  }, config: { count: 3 } },
      { id: 'api-4',   type: 'ecs',         label: 'API Service ×10',       position: { x: 520,  y: 160 }, config: { vcpu: 4, memoryGb: 8, count: 10, maxCount: 100 } },
      { id: 'auth-4',  type: 'ecs',         label: 'Auth Service ×4',       position: { x: 520,  y: 300 }, config: { vcpu: 2, memoryGb: 4, count: 4 } },
      { id: 'work-4',  type: 'ecs',         label: 'Worker Service ×10',    position: { x: 520,  y: 420 }, config: { vcpu: 4, memoryGb: 8, count: 10, maxCount: 100 } },
      { id: 'sqs-4',   type: 'sqs',         label: 'SQS FIFO Queue',        position: { x: 800,  y: 420 }, config: {} },
      { id: 'aurora-4',type: 'rds',         label: 'Aurora Global DB',      position: { x: 800,  y: 160 }, config: { instanceClass: 'db.r6g.2xlarge', multiAz: true, global: true } },
      { id: 'cache-4', type: 'elasticache', label: 'ElastiCache ×6',        position: { x: 800,  y: 300 }, config: { nodeType: 'cache.r6g.2xlarge', nodes: 6 } },
    ],
    edges: [
      { id: 'e-r53-cf-4',  source: 'r53-4',  target: 'cf-4' },
      { id: 'e-cf-waf-4',  source: 'cf-4',   target: 'waf-4' },
      { id: 'e-waf-alb-4', source: 'waf-4',  target: 'alb-4' },
      { id: 'e-alb-api-4', source: 'alb-4',  target: 'api-4' },
      { id: 'e-alb-auth-4',source: 'alb-4',  target: 'auth-4' },
      { id: 'e-api-db-4',  source: 'api-4',  target: 'aurora-4' },
      { id: 'e-api-cache-4',source:'api-4',  target: 'cache-4' },
      { id: 'e-api-sqs-4', source: 'api-4',  target: 'sqs-4',   label: 'events' },
      { id: 'e-sqs-work-4',source: 'sqs-4',  target: 'work-4',  label: 'consume' },
      { id: 'e-nat-4',     source: 'api-4',  target: 'nat-4',   label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-4',  type: 'vpc',    position: { x: 450, y: 16  }, width: 470, height: 510, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'pub-4',  type: 'subnet', position: { x: 480, y: 38  }, width: 200, height: 100, data: { label: 'Public Subnet (×3 AZ)', subnetType: 'public' } },
      { id: 'prv-4',  type: 'subnet', position: { x: 480, y: 174 }, width: 420, height: 326, data: { label: 'Private Subnet (×3 AZ)', subnetType: 'private' } },
    ],
  },
}

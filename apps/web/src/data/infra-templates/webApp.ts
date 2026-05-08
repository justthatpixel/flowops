import type { TierLayout } from '@/types/infra'
import type { ScaleTierIndex } from '@/types/infra'

export const WEB_APP_TIERS: Record<ScaleTierIndex, TierLayout> = {
  // ── Tier 0 — Dev / Hobby (10 users) ────────────────────────────────────────
  0: {
    components: [
      { id: 'alb-0',  type: 'alb', label: 'App Load Balancer',    position: { x: 100, y: 220 }, config: { scheme: 'internet-facing' } },
      { id: 'ecs-0',  type: 'ecs', label: 'ECS 0.25vCPU / 0.5GB', position: { x: 380, y: 220 }, config: { vcpu: 0.25, memoryGb: 0.5, count: 1 } },
      { id: 'rds-0',  type: 'rds', label: 'RDS t3.micro',          position: { x: 660, y: 220 }, config: { instanceClass: 'db.t3.micro', multiAz: false } },
    ],
    edges: [
      { id: 'e-alb-ecs-0', source: 'alb-0', target: 'ecs-0' },
      { id: 'e-ecs-rds-0', source: 'ecs-0', target: 'rds-0' },
    ],
  },

  // ── Tier 1 — Early Startup (1k users) ──────────────────────────────────────
  1: {
    components: [
      { id: 'alb-1',  type: 'alb',         label: 'App Load Balancer',    position: { x: 80,  y: 240 }, config: { scheme: 'internet-facing' } },
      { id: 'nat-1',  type: 'nat_gateway',  label: 'NAT Gateway',          position: { x: 380, y: 80  }, config: { count: 1 } },
      { id: 'ecs-1',  type: 'ecs',          label: 'ECS 0.5vCPU / 1GB',    position: { x: 380, y: 240 }, config: { vcpu: 0.5, memoryGb: 1, count: 1 } },
      { id: 'rds-1',  type: 'rds',          label: 'RDS t3.medium',         position: { x: 680, y: 240 }, config: { instanceClass: 'db.t3.medium', multiAz: false } },
    ],
    edges: [
      { id: 'e-alb-ecs-1',  source: 'alb-1',  target: 'ecs-1' },
      { id: 'e-ecs-rds-1',  source: 'ecs-1',  target: 'rds-1' },
      { id: 'e-ecs-nat-1',  source: 'ecs-1',  target: 'nat-1', label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-1',         type: 'vpc',    position: { x: 310, y: 30  }, width: 480, height: 310, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'subnet-pub-1',  type: 'subnet', position: { x: 340, y: 54  }, width: 220, height: 110, data: { label: 'Public Subnet', subnetType: 'public'  } },
      { id: 'subnet-prv-1',  type: 'subnet', position: { x: 340, y: 196 }, width: 420, height: 110, data: { label: 'Private Subnet', subnetType: 'private' } },
    ],
  },

  // ── Tier 2 — Growing (10k users) ───────────────────────────────────────────
  2: {
    components: [
      { id: 'alb-2',   type: 'alb',         label: 'App Load Balancer',    position: { x: 80,  y: 260 }, config: { scheme: 'internet-facing' } },
      { id: 'nat-2',   type: 'nat_gateway',  label: 'NAT Gateway ×2',       position: { x: 380, y: 60  }, config: { count: 2 } },
      { id: 'ecs-2',   type: 'ecs',          label: 'ECS ×2 · 1vCPU / 2GB', position: { x: 380, y: 260 }, config: { vcpu: 1, memoryGb: 2, count: 2 } },
      { id: 'rds-2',   type: 'rds',          label: 'RDS Multi-AZ',          position: { x: 680, y: 160 }, config: { instanceClass: 'db.t3.medium', multiAz: true } },
      { id: 'cache-2', type: 'elasticache',  label: 'ElastiCache Redis',     position: { x: 680, y: 360 }, config: { nodeType: 'cache.t3.small', nodes: 1 } },
    ],
    edges: [
      { id: 'e-alb-ecs-2',   source: 'alb-2',   target: 'ecs-2' },
      { id: 'e-ecs-rds-2',   source: 'ecs-2',   target: 'rds-2' },
      { id: 'e-ecs-cache-2', source: 'ecs-2',   target: 'cache-2' },
      { id: 'e-ecs-nat-2',   source: 'ecs-2',   target: 'nat-2', label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-2',         type: 'vpc',    position: { x: 310, y: 14  }, width: 500, height: 420, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'subnet-pub-2',  type: 'subnet', position: { x: 340, y: 38  }, width: 220, height: 110, data: { label: 'Public Subnet (×2 AZ)', subnetType: 'public'  } },
      { id: 'subnet-prv-2',  type: 'subnet', position: { x: 340, y: 200 }, width: 450, height: 210, data: { label: 'Private Subnet (×2 AZ)', subnetType: 'private' } },
    ],
  },

  // ── Tier 3 — Scaling (100k users) ──────────────────────────────────────────
  3: {
    components: [
      { id: 'cf-3',     type: 'cloudfront',  label: 'CloudFront CDN',           position: { x: -200, y: 260 }, config: {} },
      { id: 'waf-3',    type: 'waf',         label: 'WAF',                       position: { x: 80,   y: 160 }, config: {} },
      { id: 'shield-3', type: 'shield',      label: 'Shield Standard',           position: { x: 80,   y: 360 }, config: {} },
      { id: 'alb-3',    type: 'alb',         label: 'App Load Balancer',         position: { x: 360,  y: 260 }, config: { scheme: 'internet-facing' } },
      { id: 'nat-3',    type: 'nat_gateway', label: 'NAT Gateway ×3',            position: { x: 600,  y: 80  }, config: { count: 3 } },
      { id: 'ecs-3',    type: 'ecs',         label: 'ECS Auto-scale · t3.large', position: { x: 600,  y: 260 }, config: { vcpu: 2, memoryGb: 4, count: 2, maxCount: 20 } },
      { id: 'aurora-3', type: 'rds',         label: 'Aurora PostgreSQL Multi-AZ',position: { x: 880,  y: 160 }, config: { instanceClass: 'db.r6g.large', multiAz: true, engine: 'aurora-postgresql' } },
      { id: 'cache-3',  type: 'elasticache', label: 'ElastiCache Cluster ×3',   position: { x: 880,  y: 360 }, config: { nodeType: 'cache.r6g.large', nodes: 3 } },
    ],
    edges: [
      { id: 'e-cf-waf-3',     source: 'cf-3',     target: 'waf-3' },
      { id: 'e-waf-alb-3',    source: 'waf-3',    target: 'alb-3' },
      { id: 'e-alb-ecs-3',    source: 'alb-3',    target: 'ecs-3' },
      { id: 'e-ecs-aurora-3', source: 'ecs-3',    target: 'aurora-3' },
      { id: 'e-ecs-cache-3',  source: 'ecs-3',    target: 'cache-3' },
      { id: 'e-ecs-nat-3',    source: 'ecs-3',    target: 'nat-3', label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-3',         type: 'vpc',    position: { x: 290, y: 14  }, width: 720, height: 450, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'subnet-pub-3',  type: 'subnet', position: { x: 320, y: 36  }, width: 380, height: 110, data: { label: 'Public Subnet (×3 AZ)', subnetType: 'public'  } },
      { id: 'subnet-prv-3',  type: 'subnet', position: { x: 320, y: 188 }, width: 660, height: 244, data: { label: 'Private Subnet (×3 AZ)', subnetType: 'private' } },
    ],
  },

  // ── Tier 4 — Enterprise (1M users) ─────────────────────────────────────────
  4: {
    components: [
      { id: 'r53-4',    type: 'route53',     label: 'Route 53 + Health Checks',   position: { x: -480, y: 260 }, config: { failover: true } },
      { id: 'cf-4',     type: 'cloudfront',  label: 'CloudFront CDN',              position: { x: -240, y: 260 }, config: {} },
      { id: 'waf-4',    type: 'waf',         label: 'WAF + Shield Advanced',       position: { x: 0,    y: 260 }, config: {} },
      { id: 'alb-4',    type: 'alb',         label: 'App Load Balancer',           position: { x: 260,  y: 260 }, config: { scheme: 'internet-facing' } },
      { id: 'nat-4',    type: 'nat_gateway', label: 'NAT Gateway ×3',              position: { x: 520,  y: 80  }, config: { count: 3 } },
      { id: 'ecs-4',    type: 'ecs',         label: 'ECS Auto-scale · c6g.2xlarge',position: { x: 520,  y: 260 }, config: { vcpu: 8, memoryGb: 16, count: 10, maxCount: 200 } },
      { id: 'aurora-4', type: 'rds',         label: 'Aurora Global Database',      position: { x: 800,  y: 160 }, config: { instanceClass: 'db.r6g.2xlarge', multiAz: true, global: true } },
      { id: 'cache-4',  type: 'elasticache', label: 'ElastiCache ×6 Multi-AZ',    position: { x: 800,  y: 360 }, config: { nodeType: 'cache.r6g.2xlarge', nodes: 6 } },
    ],
    edges: [
      { id: 'e-r53-cf-4',     source: 'r53-4',    target: 'cf-4' },
      { id: 'e-cf-waf-4',     source: 'cf-4',     target: 'waf-4' },
      { id: 'e-waf-alb-4',    source: 'waf-4',    target: 'alb-4' },
      { id: 'e-alb-ecs-4',    source: 'alb-4',    target: 'ecs-4' },
      { id: 'e-ecs-aurora-4', source: 'ecs-4',    target: 'aurora-4' },
      { id: 'e-ecs-cache-4',  source: 'ecs-4',    target: 'cache-4' },
      { id: 'e-ecs-nat-4',    source: 'ecs-4',    target: 'nat-4', label: 'outbound' },
    ],
    containers: [
      { id: 'vpc-4',         type: 'vpc',    position: { x: 180, y: 14  }, width: 740, height: 450, data: { label: 'VPC (10.0.0.0/16)' } },
      { id: 'subnet-pub-4',  type: 'subnet', position: { x: 210, y: 36  }, width: 380, height: 110, data: { label: 'Public Subnet (×3 AZ)', subnetType: 'public'  } },
      { id: 'subnet-prv-4',  type: 'subnet', position: { x: 210, y: 188 }, width: 690, height: 244, data: { label: 'Private Subnet (×3 AZ)', subnetType: 'private' } },
    ],
  },
}

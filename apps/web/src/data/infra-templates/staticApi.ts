import type { TierLayout, ScaleTierIndex } from '@/types/infra'

export const STATIC_API_TIERS: Record<ScaleTierIndex, TierLayout> = {
  // ── Tier 0 — Dev / Hobby ────────────────────────────────────────────────────
  0: {
    components: [
      { id: 'cf-0',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: 80,  y: 200 }, config: {} },
      { id: 's3-0',    type: 's3',          label: 'S3 Static Site',     position: { x: 380, y: 120 }, config: {} },
      { id: 'apigw-0', type: 'api_gateway', label: 'API Gateway',        position: { x: 380, y: 280 }, config: {} },
      { id: 'fn-0',    type: 'lambda',      label: 'Lambda Function',    position: { x: 660, y: 280 }, config: { memoryMb: 256, durationMs: 200 } },
    ],
    edges: [
      { id: 'e-cf-s3-0',  source: 'cf-0',    target: 's3-0',   label: 'static' },
      { id: 'e-cf-gw-0',  source: 'cf-0',    target: 'apigw-0',label: 'API' },
      { id: 'e-gw-fn-0',  source: 'apigw-0', target: 'fn-0' },
    ],
  },

  // ── Tier 1 — Early Startup ──────────────────────────────────────────────────
  1: {
    components: [
      { id: 'cf-1',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: 80,  y: 220 }, config: {} },
      { id: 's3-1',    type: 's3',          label: 'S3 Static Site',     position: { x: 380, y: 120 }, config: {} },
      { id: 'apigw-1', type: 'api_gateway', label: 'API Gateway',        position: { x: 380, y: 280 }, config: {} },
      { id: 'fn-1',    type: 'lambda',      label: 'Lambda Functions',   position: { x: 660, y: 200 }, config: { memoryMb: 512, durationMs: 200 } },
      { id: 'ddb-1',   type: 'dynamodb',    label: 'DynamoDB Table',     position: { x: 660, y: 360 }, config: {} },
    ],
    edges: [
      { id: 'e-cf-s3-1',  source: 'cf-1',    target: 's3-1',   label: 'static' },
      { id: 'e-cf-gw-1',  source: 'cf-1',    target: 'apigw-1',label: 'API' },
      { id: 'e-gw-fn-1',  source: 'apigw-1', target: 'fn-1' },
      { id: 'e-fn-ddb-1', source: 'fn-1',    target: 'ddb-1' },
    ],
  },

  // ── Tier 2 — Growing ────────────────────────────────────────────────────────
  2: {
    components: [
      { id: 'cf-2',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: 80,  y: 260 }, config: {} },
      { id: 's3-2',    type: 's3',          label: 'S3 Static Site',     position: { x: 380, y: 100 }, config: {} },
      { id: 'apigw-2', type: 'api_gateway', label: 'API Gateway',        position: { x: 380, y: 280 }, config: {} },
      { id: 'fn-2',    type: 'lambda',      label: 'Lambda Functions',   position: { x: 660, y: 180 }, config: { memoryMb: 1024, durationMs: 200 } },
      { id: 'sqs-2',   type: 'sqs',         label: 'SQS Queue',          position: { x: 660, y: 360 }, config: {} },
      { id: 'ddb-2',   type: 'dynamodb',    label: 'DynamoDB (Global)',  position: { x: 920, y: 180 }, config: {} },
      { id: 'cache-2', type: 'elasticache', label: 'ElastiCache Redis',  position: { x: 920, y: 360 }, config: { nodeType: 'cache.t3.small', nodes: 1 } },
    ],
    edges: [
      { id: 'e-cf-s3-2',    source: 'cf-2',    target: 's3-2',   label: 'static' },
      { id: 'e-cf-gw-2',    source: 'cf-2',    target: 'apigw-2',label: 'API' },
      { id: 'e-gw-fn-2',    source: 'apigw-2', target: 'fn-2' },
      { id: 'e-fn-sqs-2',   source: 'fn-2',    target: 'sqs-2',  label: 'async' },
      { id: 'e-fn-ddb-2',   source: 'fn-2',    target: 'ddb-2' },
      { id: 'e-fn-cache-2', source: 'fn-2',    target: 'cache-2' },
    ],
  },

  // ── Tier 3 — Scaling ────────────────────────────────────────────────────────
  3: {
    components: [
      { id: 'r53-3',   type: 'route53',     label: 'Route 53',           position: { x: -200, y: 260 }, config: {} },
      { id: 'cf-3',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: 60,   y: 260 }, config: {} },
      { id: 'waf-3',   type: 'waf',         label: 'WAF',                position: { x: 320,  y: 160 }, config: {} },
      { id: 's3-3',    type: 's3',          label: 'S3 Static Site',     position: { x: 320,  y: 360 }, config: {} },
      { id: 'apigw-3', type: 'api_gateway', label: 'API Gateway',        position: { x: 580,  y: 160 }, config: {} },
      { id: 'fn-3',    type: 'lambda',      label: 'Lambda Functions',   position: { x: 860,  y: 100 }, config: { memoryMb: 1024, durationMs: 150 } },
      { id: 'sqs-3',   type: 'sqs',         label: 'SQS Queue',          position: { x: 860,  y: 260 }, config: {} },
      { id: 'ddb-3',   type: 'dynamodb',    label: 'DynamoDB Global',    position: { x: 1100, y: 100 }, config: {} },
      { id: 'cache-3', type: 'elasticache', label: 'ElastiCache ×2',     position: { x: 1100, y: 280 }, config: { nodeType: 'cache.r6g.large', nodes: 2 } },
    ],
    edges: [
      { id: 'e-r53-cf-3',   source: 'r53-3',   target: 'cf-3' },
      { id: 'e-cf-waf-3',   source: 'cf-3',    target: 'waf-3',  label: 'API' },
      { id: 'e-cf-s3-3',    source: 'cf-3',    target: 's3-3',   label: 'static' },
      { id: 'e-waf-gw-3',   source: 'waf-3',   target: 'apigw-3' },
      { id: 'e-gw-fn-3',    source: 'apigw-3', target: 'fn-3' },
      { id: 'e-fn-sqs-3',   source: 'fn-3',    target: 'sqs-3',  label: 'async' },
      { id: 'e-fn-ddb-3',   source: 'fn-3',    target: 'ddb-3' },
      { id: 'e-fn-cache-3', source: 'fn-3',    target: 'cache-3' },
    ],
  },

  // ── Tier 4 — Enterprise ─────────────────────────────────────────────────────
  4: {
    components: [
      { id: 'r53-4',   type: 'route53',     label: 'Route 53 Failover',  position: { x: -440, y: 280 }, config: { failover: true } },
      { id: 'shield-4',type: 'shield',      label: 'Shield Advanced',    position: { x: -200, y: 160 }, config: {} },
      { id: 'cf-4',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: -200, y: 340 }, config: {} },
      { id: 'waf-4',   type: 'waf',         label: 'WAF',                position: { x: 60,   y: 160 }, config: {} },
      { id: 's3-4',    type: 's3',          label: 'S3 (multi-region)',  position: { x: 60,   y: 360 }, config: {} },
      { id: 'apigw-4', type: 'api_gateway', label: 'API Gateway',        position: { x: 320,  y: 160 }, config: {} },
      { id: 'fn-4',    type: 'lambda',      label: 'Lambda Functions',   position: { x: 600,  y: 100 }, config: { memoryMb: 3008, durationMs: 100 } },
      { id: 'sqs-4',   type: 'sqs',         label: 'SQS FIFO Queue',     position: { x: 600,  y: 280 }, config: {} },
      { id: 'ddb-4',   type: 'dynamodb',    label: 'DynamoDB Global',    position: { x: 880,  y: 100 }, config: {} },
      { id: 'cache-4', type: 'elasticache', label: 'ElastiCache ×6',     position: { x: 880,  y: 280 }, config: { nodeType: 'cache.r6g.2xlarge', nodes: 6 } },
    ],
    edges: [
      { id: 'e-r53-cf-4',   source: 'r53-4',   target: 'cf-4' },
      { id: 'e-r53-sh-4',   source: 'r53-4',   target: 'shield-4' },
      { id: 'e-sh-waf-4',   source: 'shield-4',target: 'waf-4' },
      { id: 'e-cf-s3-4',    source: 'cf-4',    target: 's3-4',   label: 'static' },
      { id: 'e-cf-waf-4',   source: 'cf-4',    target: 'waf-4',  label: 'API' },
      { id: 'e-waf-gw-4',   source: 'waf-4',   target: 'apigw-4' },
      { id: 'e-gw-fn-4',    source: 'apigw-4', target: 'fn-4' },
      { id: 'e-fn-sqs-4',   source: 'fn-4',    target: 'sqs-4',  label: 'async' },
      { id: 'e-fn-ddb-4',   source: 'fn-4',    target: 'ddb-4' },
      { id: 'e-fn-cache-4', source: 'fn-4',    target: 'cache-4' },
    ],
  },
}

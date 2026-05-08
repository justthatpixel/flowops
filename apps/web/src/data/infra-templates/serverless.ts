import type { TierLayout, ScaleTierIndex } from '@/types/infra'

export const SERVERLESS_TIERS: Record<ScaleTierIndex, TierLayout> = {
  // ── Tier 0 — Dev / Hobby (10 users) ────────────────────────────────────────
  0: {
    components: [
      { id: 'apigw-0', type: 'api_gateway', label: 'API Gateway',        position: { x: 100, y: 200 }, config: {} },
      { id: 'fn-0',    type: 'lambda',      label: 'Lambda Function',     position: { x: 380, y: 200 }, config: { memoryMb: 256, durationMs: 150 } },
      { id: 'ddb-0',   type: 'dynamodb',    label: 'DynamoDB Table',      position: { x: 660, y: 200 }, config: {} },
    ],
    edges: [
      { id: 'e-gw-fn-0',  source: 'apigw-0', target: 'fn-0' },
      { id: 'e-fn-ddb-0', source: 'fn-0',    target: 'ddb-0' },
    ],
  },

  // ── Tier 1 — Early Startup (1k users) ──────────────────────────────────────
  1: {
    components: [
      { id: 'cf-1',    type: 'cloudfront',  label: 'CloudFront CDN',      position: { x: -160, y: 200 }, config: {} },
      { id: 'apigw-1', type: 'api_gateway', label: 'API Gateway',         position: { x: 120,  y: 200 }, config: {} },
      { id: 's3-1',    type: 's3',          label: 'S3 (static assets)',  position: { x: 120,  y: 360 }, config: {} },
      { id: 'fn-1',    type: 'lambda',      label: 'Lambda Function',     position: { x: 400,  y: 200 }, config: { memoryMb: 512, durationMs: 200 } },
      { id: 'ddb-1',   type: 'dynamodb',    label: 'DynamoDB Table',      position: { x: 680,  y: 200 }, config: {} },
    ],
    edges: [
      { id: 'e-cf-gw-1',  source: 'cf-1',    target: 'apigw-1' },
      { id: 'e-cf-s3-1',  source: 'cf-1',    target: 's3-1',   label: 'static' },
      { id: 'e-gw-fn-1',  source: 'apigw-1', target: 'fn-1' },
      { id: 'e-fn-ddb-1', source: 'fn-1',    target: 'ddb-1' },
    ],
  },

  // ── Tier 2 — Growing (10k users) ───────────────────────────────────────────
  2: {
    components: [
      { id: 'cf-2',    type: 'cloudfront',  label: 'CloudFront CDN',      position: { x: -180, y: 220 }, config: {} },
      { id: 'apigw-2', type: 'api_gateway', label: 'API Gateway',         position: { x: 100,  y: 220 }, config: {} },
      { id: 's3-2',    type: 's3',          label: 'S3 (assets + models)',position: { x: 100,  y: 380 }, config: {} },
      { id: 'fn-2',    type: 'lambda',      label: 'Lambda ×3 functions', position: { x: 380,  y: 220 }, config: { memoryMb: 1024, durationMs: 300 } },
      { id: 'sqs-2',   type: 'sqs',         label: 'SQS Queue',           position: { x: 380,  y: 380 }, config: {} },
      { id: 'ddb-2',   type: 'dynamodb',    label: 'DynamoDB (Global)',   position: { x: 660,  y: 220 }, config: {} },
    ],
    edges: [
      { id: 'e-cf-gw-2',  source: 'cf-2',    target: 'apigw-2' },
      { id: 'e-cf-s3-2',  source: 'cf-2',    target: 's3-2',   label: 'static' },
      { id: 'e-gw-fn-2',  source: 'apigw-2', target: 'fn-2' },
      { id: 'e-fn-sqs-2', source: 'fn-2',    target: 'sqs-2',  label: 'async' },
      { id: 'e-fn-ddb-2', source: 'fn-2',    target: 'ddb-2' },
    ],
  },

  // ── Tier 3 — Scaling (100k users) ──────────────────────────────────────────
  3: {
    components: [
      { id: 'waf-3',   type: 'waf',         label: 'WAF',                 position: { x: -200, y: 220 }, config: {} },
      { id: 'cf-3',    type: 'cloudfront',  label: 'CloudFront CDN',      position: { x: 60,   y: 220 }, config: {} },
      { id: 'apigw-3', type: 'api_gateway', label: 'API Gateway',         position: { x: 320,  y: 160 }, config: {} },
      { id: 's3-3',    type: 's3',          label: 'S3 (assets)',         position: { x: 320,  y: 320 }, config: {} },
      { id: 'fn-api',  type: 'lambda',      label: 'Lambda API handlers', position: { x: 600,  y: 100 }, config: { memoryMb: 1024, durationMs: 200 } },
      { id: 'fn-proc', type: 'lambda',      label: 'Lambda processors',   position: { x: 600,  y: 260 }, config: { memoryMb: 2048, durationMs: 900 } },
      { id: 'sqs-3',   type: 'sqs',         label: 'SQS Queue',           position: { x: 600,  y: 400 }, config: {} },
      { id: 'ddb-3',   type: 'dynamodb',    label: 'DynamoDB Global',     position: { x: 880,  y: 160 }, config: {} },
    ],
    edges: [
      { id: 'e-waf-cf-3',  source: 'waf-3',   target: 'cf-3' },
      { id: 'e-cf-gw-3',   source: 'cf-3',    target: 'apigw-3' },
      { id: 'e-cf-s3-3',   source: 'cf-3',    target: 's3-3',   label: 'static' },
      { id: 'e-gw-fn-3',   source: 'apigw-3', target: 'fn-api' },
      { id: 'e-fn-sqs-3',  source: 'fn-api',  target: 'sqs-3',  label: 'enqueue' },
      { id: 'e-sqs-proc-3',source: 'sqs-3',   target: 'fn-proc',label: 'trigger' },
      { id: 'e-fn-ddb-3',  source: 'fn-api',  target: 'ddb-3' },
      { id: 'e-proc-ddb-3',source: 'fn-proc', target: 'ddb-3' },
    ],
  },

  // ── Tier 4 — Enterprise (1M users) ─────────────────────────────────────────
  4: {
    components: [
      { id: 'r53-4',   type: 'route53',     label: 'Route 53',            position: { x: -420, y: 240 }, config: { failover: true } },
      { id: 'shield-4',type: 'shield',      label: 'Shield Advanced',     position: { x: -200, y: 140 }, config: {} },
      { id: 'waf-4',   type: 'waf',         label: 'WAF + Shield',        position: { x: -200, y: 320 }, config: {} },
      { id: 'cf-4',    type: 'cloudfront',  label: 'CloudFront CDN',      position: { x: 60,   y: 240 }, config: {} },
      { id: 'apigw-4', type: 'api_gateway', label: 'API Gateway (REST)',  position: { x: 320,  y: 160 }, config: {} },
      { id: 's3-4',    type: 's3',          label: 'S3 (multi-region)',   position: { x: 320,  y: 340 }, config: {} },
      { id: 'fn-api',  type: 'lambda',      label: 'Lambda API handlers', position: { x: 600,  y: 100 }, config: { memoryMb: 1024, durationMs: 150 } },
      { id: 'fn-proc', type: 'lambda',      label: 'Lambda processors',   position: { x: 600,  y: 260 }, config: { memoryMb: 3008, durationMs: 900 } },
      { id: 'sqs-4',   type: 'sqs',         label: 'SQS FIFO Queue',      position: { x: 600,  y: 400 }, config: {} },
      { id: 'ddb-4',   type: 'dynamodb',    label: 'DynamoDB Global',     position: { x: 880,  y: 180 }, config: {} },
    ],
    edges: [
      { id: 'e-r53-cf-4',  source: 'r53-4',   target: 'cf-4' },
      { id: 'e-sh-cf-4',   source: 'shield-4', target: 'cf-4' },
      { id: 'e-waf-cf-4',  source: 'waf-4',   target: 'cf-4' },
      { id: 'e-cf-gw-4',   source: 'cf-4',    target: 'apigw-4' },
      { id: 'e-cf-s3-4',   source: 'cf-4',    target: 's3-4',   label: 'static' },
      { id: 'e-gw-fn-4',   source: 'apigw-4', target: 'fn-api' },
      { id: 'e-fn-sqs-4',  source: 'fn-api',  target: 'sqs-4',  label: 'enqueue' },
      { id: 'e-sqs-proc-4',source: 'sqs-4',   target: 'fn-proc',label: 'trigger' },
      { id: 'e-fn-ddb-4',  source: 'fn-api',  target: 'ddb-4' },
      { id: 'e-proc-ddb-4',source: 'fn-proc', target: 'ddb-4' },
    ],
  },
}

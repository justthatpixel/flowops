import type { TierLayout, ScaleTierIndex } from '@/types/infra'

export const ML_INFERENCE_TIERS: Record<ScaleTierIndex, TierLayout> = {
  // ── Tier 0 — Dev / Hobby ────────────────────────────────────────────────────
  0: {
    components: [
      { id: 'apigw-0', type: 'api_gateway', label: 'API Gateway',        position: { x: 80,  y: 200 }, config: {} },
      { id: 'fn-0',    type: 'lambda',      label: 'Inference Lambda',   position: { x: 360, y: 200 }, config: { memoryMb: 1024, durationMs: 500 } },
      { id: 's3-0',    type: 's3',          label: 'S3 Model Store',     position: { x: 640, y: 120 }, config: {} },
      { id: 'ddb-0',   type: 'dynamodb',    label: 'DynamoDB Results',   position: { x: 640, y: 280 }, config: {} },
    ],
    edges: [
      { id: 'e-gw-fn-0',  source: 'apigw-0', target: 'fn-0' },
      { id: 'e-fn-s3-0',  source: 'fn-0',    target: 's3-0',  label: 'load model' },
      { id: 'e-fn-ddb-0', source: 'fn-0',    target: 'ddb-0', label: 'store' },
    ],
  },

  // ── Tier 1 — Early Startup ──────────────────────────────────────────────────
  1: {
    components: [
      { id: 'cf-1',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: -160, y: 220 }, config: {} },
      { id: 'apigw-1', type: 'api_gateway', label: 'API Gateway',        position: { x: 100,  y: 220 }, config: {} },
      { id: 'fn-1',    type: 'lambda',      label: 'Inference Lambda',   position: { x: 380,  y: 140 }, config: { memoryMb: 2048, durationMs: 800 } },
      { id: 'sqs-1',   type: 'sqs',         label: 'Async Job Queue',    position: { x: 380,  y: 320 }, config: {} },
      { id: 's3-1',    type: 's3',          label: 'S3 Model Store',     position: { x: 660,  y: 140 }, config: {} },
      { id: 'ddb-1',   type: 'dynamodb',    label: 'DynamoDB Results',   position: { x: 660,  y: 320 }, config: {} },
    ],
    edges: [
      { id: 'e-cf-gw-1',  source: 'cf-1',    target: 'apigw-1' },
      { id: 'e-gw-fn-1',  source: 'apigw-1', target: 'fn-1',   label: 'sync' },
      { id: 'e-gw-sqs-1', source: 'apigw-1', target: 'sqs-1',  label: 'async' },
      { id: 'e-fn-s3-1',  source: 'fn-1',    target: 's3-1',   label: 'load model' },
      { id: 'e-fn-ddb-1', source: 'fn-1',    target: 'ddb-1' },
    ],
  },

  // ── Tier 2 — Growing ────────────────────────────────────────────────────────
  2: {
    components: [
      { id: 'cf-2',    type: 'cloudfront',  label: 'CloudFront CDN',     position: { x: -180, y: 260 }, config: {} },
      { id: 'apigw-2', type: 'api_gateway', label: 'API Gateway',        position: { x: 80,   y: 180 }, config: {} },
      { id: 'alb-2',   type: 'alb',         label: 'App Load Balancer',  position: { x: 80,   y: 360 }, config: {} },
      { id: 'fn-2',    type: 'lambda',      label: 'Inference Lambda',   position: { x: 360,  y: 140 }, config: { memoryMb: 3008, durationMs: 1000 } },
      { id: 'ecs-2',   type: 'ecs',         label: 'ECS GPU Inference',  position: { x: 360,  y: 360 }, config: { vcpu: 4, memoryGb: 16, count: 2 } },
      { id: 'sqs-2',   type: 'sqs',         label: 'Batch Job Queue',    position: { x: 640,  y: 260 }, config: {} },
      { id: 's3-2',    type: 's3',          label: 'S3 Model Artifacts', position: { x: 640,  y: 140 }, config: {} },
      { id: 'ddb-2',   type: 'dynamodb',    label: 'DynamoDB Results',   position: { x: 880,  y: 260 }, config: {} },
    ],
    edges: [
      { id: 'e-cf-gw-2',   source: 'cf-2',    target: 'apigw-2' },
      { id: 'e-cf-alb-2',  source: 'cf-2',    target: 'alb-2',  label: 'batch API' },
      { id: 'e-gw-fn-2',   source: 'apigw-2', target: 'fn-2',   label: 'sync' },
      { id: 'e-alb-ecs-2', source: 'alb-2',   target: 'ecs-2',  label: 'batch' },
      { id: 'e-fn-s3-2',   source: 'fn-2',    target: 's3-2',   label: 'load model' },
      { id: 'e-ecs-sqs-2', source: 'ecs-2',   target: 'sqs-2',  label: 'jobs' },
      { id: 'e-fn-ddb-2',  source: 'fn-2',    target: 'ddb-2' },
      { id: 'e-ecs-ddb-2', source: 'ecs-2',   target: 'ddb-2' },
    ],
  },

  // ── Tier 3 — Scaling ────────────────────────────────────────────────────────
  3: {
    components: [
      { id: 'cf-3',    type: 'cloudfront',  label: 'CloudFront CDN',      position: { x: -200, y: 280 }, config: {} },
      { id: 'waf-3',   type: 'waf',         label: 'WAF',                  position: { x: 60,   y: 280 }, config: {} },
      { id: 'apigw-3', type: 'api_gateway', label: 'API Gateway',          position: { x: 320,  y: 180 }, config: {} },
      { id: 'alb-3',   type: 'alb',         label: 'App Load Balancer',    position: { x: 320,  y: 380 }, config: {} },
      { id: 'fn-3',    type: 'lambda',      label: 'Inference Lambda ×N',  position: { x: 600,  y: 120 }, config: { memoryMb: 3008, durationMs: 600 } },
      { id: 'ecs-3',   type: 'ecs',         label: 'ECS GPU Workers ×4',   position: { x: 600,  y: 300 }, config: { vcpu: 8, memoryGb: 32, count: 4 } },
      { id: 'sqs-3',   type: 'sqs',         label: 'Batch Job Queue',      position: { x: 600,  y: 460 }, config: {} },
      { id: 'cache-3', type: 'elasticache', label: 'ElastiCache (results)',position: { x: 880,  y: 120 }, config: { nodeType: 'cache.r6g.large', nodes: 2 } },
      { id: 's3-3',    type: 's3',          label: 'S3 Model Registry',    position: { x: 880,  y: 300 }, config: {} },
      { id: 'ddb-3',   type: 'dynamodb',    label: 'DynamoDB Results',     position: { x: 880,  y: 460 }, config: {} },
    ],
    edges: [
      { id: 'e-cf-waf-3',   source: 'cf-3',    target: 'waf-3' },
      { id: 'e-waf-gw-3',   source: 'waf-3',   target: 'apigw-3' },
      { id: 'e-waf-alb-3',  source: 'waf-3',   target: 'alb-3' },
      { id: 'e-gw-fn-3',    source: 'apigw-3', target: 'fn-3',   label: 'sync' },
      { id: 'e-alb-ecs-3',  source: 'alb-3',   target: 'ecs-3',  label: 'batch' },
      { id: 'e-ecs-sqs-3',  source: 'ecs-3',   target: 'sqs-3',  label: 'jobs' },
      { id: 'e-fn-cache-3', source: 'fn-3',    target: 'cache-3',label: 'cache hit' },
      { id: 'e-fn-s3-3',    source: 'fn-3',    target: 's3-3',   label: 'load model' },
      { id: 'e-fn-ddb-3',   source: 'fn-3',    target: 'ddb-3' },
      { id: 'e-ecs-ddb-3',  source: 'ecs-3',   target: 'ddb-3' },
    ],
  },

  // ── Tier 4 — Enterprise ─────────────────────────────────────────────────────
  4: {
    components: [
      { id: 'r53-4',   type: 'route53',     label: 'Route 53',             position: { x: -460, y: 280 }, config: {} },
      { id: 'cf-4',    type: 'cloudfront',  label: 'CloudFront CDN',       position: { x: -220, y: 280 }, config: {} },
      { id: 'waf-4',   type: 'waf',         label: 'WAF + Shield',         position: { x: 20,   y: 280 }, config: {} },
      { id: 'apigw-4', type: 'api_gateway', label: 'API Gateway',          position: { x: 280,  y: 160 }, config: {} },
      { id: 'alb-4',   type: 'alb',         label: 'App Load Balancer',    position: { x: 280,  y: 380 }, config: {} },
      { id: 'fn-4',    type: 'lambda',      label: 'Inference Lambda ×N',  position: { x: 560,  y: 100 }, config: { memoryMb: 3008, durationMs: 400 } },
      { id: 'ecs-4',   type: 'ecs',         label: 'ECS GPU Fleet ×10',    position: { x: 560,  y: 300 }, config: { vcpu: 16, memoryGb: 64, count: 10, maxCount: 100 } },
      { id: 'sqs-4',   type: 'sqs',         label: 'Priority Job Queue',   position: { x: 560,  y: 460 }, config: {} },
      { id: 'cache-4', type: 'elasticache', label: 'ElastiCache ×6',       position: { x: 840,  y: 100 }, config: { nodeType: 'cache.r6g.2xlarge', nodes: 6 } },
      { id: 's3-4',    type: 's3',          label: 'S3 Model Registry',    position: { x: 840,  y: 300 }, config: {} },
      { id: 'ddb-4',   type: 'dynamodb',    label: 'DynamoDB Global',      position: { x: 840,  y: 460 }, config: {} },
    ],
    edges: [
      { id: 'e-r53-cf-4',   source: 'r53-4',   target: 'cf-4' },
      { id: 'e-cf-waf-4',   source: 'cf-4',    target: 'waf-4' },
      { id: 'e-waf-gw-4',   source: 'waf-4',   target: 'apigw-4' },
      { id: 'e-waf-alb-4',  source: 'waf-4',   target: 'alb-4' },
      { id: 'e-gw-fn-4',    source: 'apigw-4', target: 'fn-4',   label: 'sync' },
      { id: 'e-alb-ecs-4',  source: 'alb-4',   target: 'ecs-4',  label: 'batch' },
      { id: 'e-ecs-sqs-4',  source: 'ecs-4',   target: 'sqs-4',  label: 'jobs' },
      { id: 'e-fn-cache-4', source: 'fn-4',    target: 'cache-4',label: 'cache hit' },
      { id: 'e-fn-s3-4',    source: 'fn-4',    target: 's3-4',   label: 'load model' },
      { id: 'e-fn-ddb-4',   source: 'fn-4',    target: 'ddb-4' },
      { id: 'e-ecs-ddb-4',  source: 'ecs-4',   target: 'ddb-4' },
    ],
  },
}

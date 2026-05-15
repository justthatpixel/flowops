/**
 * demoPlan.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo Terraform plan resources used in Architecture Plan Mode.
 * These are injected onto matching canvas nodes and ghost nodes to show the
 * visual diff between the current production state and proposed changes.
 */

export type PlanAction = 'create' | 'update' | 'delete' | 'replace'

export interface PlanResource {
  id:         string
  tfType:     string
  tfAddress:  string
  planAction: PlanAction
  diff:       Record<string, { before: unknown; after: unknown }>
}

export const DEMO_PLAN: PlanResource[] = [
  {
    id:         'plan-alb',
    tfType:     'aws_lb',
    tfAddress:  'aws_lb.main',
    planAction: 'update',
    diff: {
      listener_port:  { before: 80,    after: 443 },
      ssl_policy:     { before: null,  after: 'ELBSecurityPolicy-TLS13-1-2-2021-06' },
      access_logs:    { before: false, after: true },
    },
  },
  {
    id:         'plan-ecs',
    tfType:     'aws_ecs_service',
    tfAddress:  'aws_ecs_service.api',
    planAction: 'update',
    diff: {
      desired_count:         { before: 2,  after: 4 },
      health_check_grace:    { before: 30, after: 60 },
      deployment_max_pct:    { before: 100, after: 200 },
    },
  },
  {
    id:         'plan-rds',
    tfType:     'aws_db_instance',
    tfAddress:  'aws_db_instance.main',
    planAction: 'update',
    diff: {
      instance_class:          { before: 'db.t3.micro',  after: 'db.t3.small' },
      backup_retention_period: { before: 7,              after: 14 },
      multi_az:                { before: false,          after: true },
    },
  },
  {
    id:         'plan-cloudfront',
    tfType:     'aws_cloudfront_distribution',
    tfAddress:  'aws_cloudfront_distribution.cdn',
    planAction: 'delete',
    diff: {
      enabled:     { before: true,           after: null },
      price_class: { before: 'PriceClass_100', after: null },
      aliases:     { before: '["cdn.myapp.io"]', after: null },
    },
  },
  {
    id:         'plan-lambda',
    tfType:     'aws_lambda_function',
    tfAddress:  'aws_lambda_function.processor',
    planAction: 'create',
    diff: {
      runtime:       { before: null, after: 'nodejs20.x' },
      memory_size:   { before: null, after: 512 },
      timeout:       { before: null, after: 30 },
      reserved_conc: { before: null, after: 10 },
    },
  },
  {
    id:         'plan-s3',
    tfType:     'aws_s3_bucket',
    tfAddress:  'aws_s3_bucket.assets',
    planAction: 'create',
    diff: {
      bucket:      { before: null, after: 'myapp-assets-prod' },
      versioning:  { before: null, after: 'Enabled' },
      encryption:  { before: null, after: 'aws:kms' },
    },
  },
  {
    id:         'plan-route53',
    tfType:     'aws_route53_record',
    tfAddress:  'aws_route53_record.www',
    planAction: 'update',
    diff: {
      ttl:     { before: 300,         after: 60 },
      records: { before: '10.0.1.5',  after: '10.0.1.8' },
    },
  },
]

/** Summary counts derived from DEMO_PLAN */
export const PLAN_SUMMARY = DEMO_PLAN.reduce(
  (acc, r) => {
    acc[r.planAction] = (acc[r.planAction] ?? 0) + 1
    return acc
  },
  {} as Record<PlanAction, number>,
)

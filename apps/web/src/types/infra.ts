export type AwsServiceType =
  // ── Compute ──────────────────────────────────────────────────────────────
  | 'ecs'               // ECS Fargate Service
  | 'ecs_task'          // ECS Task Definition
  | 'ec2_asg'           // EC2 Auto Scaling Group
  | 'lambda'            // Lambda Function
  | 'elastic_beanstalk' // Elastic Beanstalk
  // ── Networking ───────────────────────────────────────────────────────────
  | 'vpc'               // VPC
  | 'public_subnet'     // Public Subnet
  | 'private_subnet'    // Private Subnet
  | 'alb'               // Application Load Balancer
  | 'nat_gateway'       // NAT Gateway
  | 'route53'           // Route 53 Record
  | 'cloudfront'        // CloudFront Distribution
  | 'api_gateway'       // API Gateway
  // ── Database ─────────────────────────────────────────────────────────────
  | 'rds'               // RDS PostgreSQL
  | 'rds_mysql'         // RDS MySQL
  | 'aurora_serverless' // Aurora Serverless
  | 'aurora_global'     // Aurora Global
  | 'dynamodb'          // DynamoDB Table
  | 'elasticache'       // ElastiCache Redis
  | 'elasticache_memcached' // ElastiCache Memcached
  // ── Storage ──────────────────────────────────────────────────────────────
  | 's3'                // S3 Bucket
  | 'efs'               // EFS File System
  | 'ecr'               // ECR Repository
  // ── Security ─────────────────────────────────────────────────────────────
  | 'iam_role'          // IAM Role
  | 'waf'               // WAF Web ACL
  | 'shield'            // Shield Standard
  | 'shield_advanced'   // Shield Advanced
  | 'security_group'    // Security Group
  | 'secrets_manager'   // Secrets Manager
  | 'kms'               // KMS Key
  // ── Messaging ────────────────────────────────────────────────────────────
  | 'sqs'               // SQS Queue
  | 'sns'               // SNS Topic
  | 'eventbridge'       // EventBridge Rule
  | 'kinesis'           // Kinesis Stream
  // ── Observability ────────────────────────────────────────────────────────
  | 'cloudwatch_dashboard' // CloudWatch Dashboard
  | 'cloudwatch_alarm'  // CloudWatch Alarm
  | 'xray'              // X-Ray Tracing
  // ── Custom ───────────────────────────────────────────────────────────────
  | 'custom'            // User-defined external service / API

export type ScaleTierIndex = 0 | 1 | 2 | 3 | 4

export type ArchTemplateId =
  | 'web-app'
  | 'serverless'
  | 'microservices'
  | 'api-workers'
  | 'ml-inference'
  | 'static-api'

export interface InfraComponent {
  id: string
  type: AwsServiceType
  label: string
  position: { x: number; y: number }
  config: Record<string, unknown>
  subnetId?: string
  availabilityZone?: string
}

export interface InfraEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface ScaleTierDef {
  index: ScaleTierIndex
  label: string
  userCount: string
  costPerMonth: number
  reqPerMin: number
  headroom: number
  headroomStatus: 'green' | 'amber' | 'red'
  bottleneck?: string
}

export interface InfraContainer {
  id: string
  type: 'vpc' | 'subnet'
  position: { x: number; y: number }
  width: number
  height: number
  data: {
    label: string
    subnetType?: 'public' | 'private'
  }
}

export interface TierLayout {
  components: InfraComponent[]
  edges: InfraEdge[]
  containers?: InfraContainer[]
}

/**
 * Generated Terraform HCL file set.
 * Always-present keys: main.tf, variables.tf, versions.tf, outputs.tf.
 * All other keys are emitted only when the matching service is on the canvas.
 */
export interface TerraformFiles {
  'versions.tf':     string
  'variables.tf':    string
  'main.tf':         string
  'outputs.tf':      string
  // Service-specific — only present when the service exists on the canvas
  'ecs.tf'?:         string
  'rds.tf'?:         string
  'lambda.tf'?:      string
  'api_gateway.tf'?: string
  'dynamodb.tf'?:    string
  'sqs.tf'?:         string
  'cache.tf'?:       string
  'cdn.tf'?:         string
  'waf.tf'?:         string
  's3.tf'?:          string
}

/**
 * Lightweight summary of an infra design saved when the user closes the
 * InfraDesigner for a specific pipeline Deploy node.  Persisted in
 * `infraStore.infraSnapshots[deployNodeId]` so the Deploy node config panel
 * can show a summary card and the pipeline canvas node can show a badge.
 */
export interface InfraSnapshot {
  templateId:      ArchTemplateId
  scaleTier:       ScaleTierIndex
  componentCount:  number           // number of AWS service nodes on canvas
  costLabel:       string           // e.g. "$340/mo"
  reqLabel:        string           // e.g. "6k req/min"
  headroomStatus:  'green' | 'amber' | 'red'
  hasTerraform:    boolean          // whether HCL has been generated
  savedAt:         number           // Date.now() timestamp
}

export interface CostBreakdown {
  ecs: number
  rds: number
  alb: number
  nat: number
  cache: number
  cdn: number
  transfer: number
  total: number
}

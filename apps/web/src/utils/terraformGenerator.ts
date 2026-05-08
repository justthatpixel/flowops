/**
 * terraformGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates production-ready Terraform HCL from the current InfraDesigner
 * canvas state.  Called when the user clicks "Generate Terraform" in the
 * InfraDesigner top bar.
 *
 * OUTPUT FILES
 *   versions.tf     — provider + Terraform version constraints
 *   variables.tf    — region, environment, project_name variables
 *   main.tf         — VPC, subnets, IGW, route tables (always generated)
 *   ecs.tf          — ECS cluster, task definition, service, IAM roles (if ECS present)
 *   rds.tf          — RDS instance, subnet group, security group (if RDS present)
 *   lambda.tf       — Lambda function, IAM role, CloudWatch log group (if Lambda present)
 *   api_gateway.tf  — API Gateway REST API + stage + Lambda integration (if API GW present)
 *   dynamodb.tf     — DynamoDB table(s) (if DynamoDB present)
 *   sqs.tf          — SQS queue(s) (if SQS present)
 *   cache.tf        — ElastiCache subnet group + replication group (if ElastiCache present)
 *   cdn.tf          — CloudFront distribution (if CloudFront present)
 *   waf.tf          — WAFv2 Web ACL (if WAF present)
 *   s3.tf           — S3 bucket(s) (if S3 present)
 *   outputs.tf      — Key resource ARNs / URLs / endpoints
 *
 * DESIGN NOTES
 *   • Each service uses the component's live `config` object so changes made
 *     in InfraComponentForm are reflected in the generated HCL.
 *   • Resources reference each other using Terraform resource attributes
 *     (e.g. `aws_vpc.main.id`, `aws_subnet.private[*].id`).
 *   • HCL is formatted with 2-space indentation to match `terraform fmt`.
 *   • NAT Gateway and Route 53 produce comment stubs if present (they require
 *     domain/IP inputs that the user must supply).
 *
 * ENTRY POINT
 *   generateTerraform(components, templateId, scaleTier) → TerraformFiles
 */

import type { InfraComponent, TerraformFiles, ArchTemplateId, ScaleTierIndex } from '@/types/infra'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Indent every line of a block by `n` spaces. */
function indent(block: string, n = 2): string {
  const pad = ' '.repeat(n)
  return block
    .split('\n')
    .map((l) => (l.trim() === '' ? '' : pad + l))
    .join('\n')
}

/** Find the first component matching a type, or undefined. */
function find(components: InfraComponent[], type: string) {
  return components.find((c) => c.type === type)
}

/** Find ALL components matching a type. */
function findAll(components: InfraComponent[], type: string) {
  return components.filter((c) => c.type === type)
}

/** Boolean — is this service type present on the canvas? */
function has(components: InfraComponent[], type: string) {
  return components.some((c) => c.type === type)
}

/** Return config value with type-safe fallback. */
function cfg<T>(component: InfraComponent, key: string, fallback: T): T {
  const v = component.config[key]
  return (v !== undefined && v !== null) ? (v as T) : fallback
}

// ─── Fargate CPU → memory mapping (valid Fargate combinations) ───────────────
const FARGATE_CPU_LABEL: Record<number, string> = {
  256: '256',
  512: '512',
  1024: '1024',
  2048: '2048',
  4096: '4096',
  8192: '8192',
  16384: '16384',
}

// ─── File generators ─────────────────────────────────────────────────────────

function genVersions(): string {
  return `# versions.tf — Provider and Terraform version constraints
# ──────────────────────────────────────────────────────────────────────────────
# Run: terraform init
#      terraform plan -var-file=terraform.tfvars

terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment to enable remote state (recommended for teams):
  # backend "s3" {
  #   bucket         = "my-terraform-state"
  #   key            = "flowops/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
`
}

function genVariables(templateId: ArchTemplateId, tier: ScaleTierIndex): string {
  const tierLabel = ['dev', 'startup', 'growing', 'scaling', 'enterprise'][tier]
  return `# variables.tf — Input variables
# ──────────────────────────────────────────────────────────────────────────────
# Override defaults by creating terraform.tfvars:
#   aws_region   = "us-west-2"
#   project_name = "myapp"
#   environment  = "staging"

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
  default     = "${tierLabel}"

  validation {
    condition     = contains(["dev", "staging", "prod", "${tierLabel}"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Short name prefix applied to all resource names and tags"
  type        = string
  default     = "flowops"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-20 lowercase alphanumeric characters or hyphens."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Generated from FlowOps Infrastructure Designer
# Template : ${templateId}
# Scale tier: ${tierLabel} (tier ${tier})
`
}

function genMain(components: InfraComponent[]): string {
  const hasNat   = has(components, 'nat_gateway')
  const hasAlb   = has(components, 'alb')
  const hasEcs   = has(components, 'ecs')
  const hasRds   = has(components, 'rds')
  const hasCache = has(components, 'elasticache')

  const natLines = hasNat ? `
# ── NAT Gateway (one per AZ for HA) ─────────────────────────────────────────

resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "\${var.project_name}-nat-eip-\${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "\${var.project_name}-nat-\${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "\${var.project_name}-private-rt-\${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
` : `
# Private route table — routes to NAT Gateway (add aws_nat_gateway if needed)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
`

  const albSgLines = hasAlb ? `
resource "aws_security_group" "alb" {
  name        = "\${var.project_name}-alb-sg"
  description = "Allow HTTP and HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "\${var.project_name}-alb-sg" }
}
` : ''

  const ecsSgLines = hasEcs ? `
resource "aws_security_group" "ecs" {
  name        = "\${var.project_name}-ecs-sg"
  description = "Allow inbound from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = ${hasAlb ? '[aws_security_group.alb.id]' : '[]'}
    description     = "App port from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "\${var.project_name}-ecs-sg" }
}
` : ''

  const rdsSgLines = hasRds ? `
resource "aws_security_group" "rds" {
  name        = "\${var.project_name}-rds-sg"
  description = "Allow Postgres from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = ${hasEcs ? '[aws_security_group.ecs.id]' : '["0.0.0.0/0"]'}
    description     = "Postgres from ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "\${var.project_name}-rds-sg" }
}
` : ''

  const cacheSgLines = hasCache ? `
resource "aws_security_group" "cache" {
  name        = "\${var.project_name}-cache-sg"
  description = "Allow Redis from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = ${hasEcs ? '[aws_security_group.ecs.id]' : '["0.0.0.0/0"]'}
    description     = "Redis from ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "\${var.project_name}-cache-sg" }
}
` : ''

  const albLines = hasAlb ? `
# ── Application Load Balancer ────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "\${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = { Name = "\${var.project_name}-alb" }
}

resource "aws_lb_target_group" "app" {
  name        = "\${var.project_name}-app-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    path                = "/health"
    timeout             = 5
    matcher             = "200-299"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Redirect HTTP → HTTPS in production; forward directly in dev
  default_action {
    type = var.environment == "prod" ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = var.environment == "prod" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    dynamic "forward" {
      for_each = var.environment != "prod" ? [1] : []
      content {
        target_group {
          arn = aws_lb_target_group.app.arn
        }
      }
    }
  }
}
` : ''

  return `# main.tf — VPC, networking, security groups, and ALB
# ──────────────────────────────────────────────────────────────────────────────
# Foundation resources shared by all services.  Every other .tf file in this
# module references aws_vpc.main, aws_subnet.public/private, and the security
# groups defined here.

data "aws_availability_zones" "available" {
  state = "available"
}

# ── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "\${var.project_name}-vpc" }
}

# ── Subnets (2 AZs for high availability) ────────────────────────────────────

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = { Name = "\${var.project_name}-public-\${count.index + 1}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "\${var.project_name}-private-\${count.index + 1}" }
}

# ── Internet Gateway + public route table ────────────────────────────────────

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "\${var.project_name}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "\${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
${natLines}
# ── Security groups ───────────────────────────────────────────────────────────
${albSgLines}${ecsSgLines}${rdsSgLines}${cacheSgLines}${albLines}`
}

function genEcs(components: InfraComponent[]): string | null {
  const ecsList = findAll(components, 'ecs')
  if (ecsList.length === 0) return null

  const hasAlb = has(components, 'alb')
  const hasRds = has(components, 'rds')
  const hasCache = has(components, 'elasticache')

  // Use first ECS component's config as representative
  const primary = ecsList[0]
  const vcpuUnits = Math.round(cfg(primary, 'vcpu', 1) * 1024)
  const memMb     = Math.round(cfg(primary, 'memoryGb', 2) * 1024)
  const desired   = cfg(primary, 'count', 2) as number
  const maxCount  = cfg(primary, 'maxCount', desired * 2) as number

  const cpuLabel = FARGATE_CPU_LABEL[vcpuUnits] ?? String(vcpuUnits)

  const envVarLines = [
    hasRds   ? `      { name = "DATABASE_URL",   value = "postgres://\${aws_db_instance.main.endpoint}/app" },` : null,
    hasCache ? `      { name = "REDIS_URL",       value = "redis://\${aws_elasticache_replication_group.main.primary_endpoint_address}:6379" },` : null,
  ].filter(Boolean).join('\n')

  return `# ecs.tf — ECS Fargate cluster, task definition, service, and IAM roles
# ──────────────────────────────────────────────────────────────────────────────
# Fargate: ${cfg(primary, 'vcpu', 1)} vCPU · ${cfg(primary, 'memoryGb', 2)} GB · desired ${desired} · max ${maxCount}

# ── ECR repository (stores container images) ─────────────────────────────────

resource "aws_ecr_repository" "app" {
  name                 = "\${var.project_name}/app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle_policy {
    policy = jsonencode({
      rules = [{
        rulePriority = 1
        description  = "Expire untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = { type = "expire" }
      }]
    })
  }
}

# ── CloudWatch log group ──────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "ecs_app" {
  name              = "/ecs/\${var.project_name}-app"
  retention_in_days = 30
}

# ── IAM roles ─────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "\${var.project_name}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name               = "\${var.project_name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

# ── ECS cluster ───────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "\${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ── Task definition ───────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "app" {
  family                   = "\${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "${cpuLabel}"
  memory                   = "${memMb}"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "\${aws_ecr_repository.app.repository_url}:latest"
      essential = true

      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
${envVarLines ? indent(envVarLines, 8) : ''}
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  lifecycle {
    create_before_destroy = true
  }
}

# ── ECS service ───────────────────────────────────────────────────────────────

resource "aws_ecs_service" "app" {
  name            = "\${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = ${desired}
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
${hasAlb ? `
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }
` : ''}
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [${hasAlb ? 'aws_lb_listener.http' : 'aws_ecs_cluster.main'}]
}

# ── Auto-scaling ──────────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = ${maxCount}
  min_capacity       = ${desired}
  resource_id        = "service/\${aws_ecs_cluster.main.name}/\${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "\${var.project_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 65.0
  }
}
`
}

function genRds(components: InfraComponent[]): string | null {
  const rds = find(components, 'rds')
  if (!rds) return null

  const engine       = cfg(rds, 'engine', 'postgres') as string
  const instanceClass = cfg(rds, 'instanceClass', 'db.t3.medium') as string
  const multiAz      = cfg(rds, 'multiAz', false) as boolean
  const storage      = cfg(rds, 'allocatedStorage', 20) as number

  const isPostgres = engine.includes('postgres') || engine.includes('aurora-postgresql')
  const isMysql    = engine.includes('mysql')    || engine.includes('aurora-mysql')
  const dbPort     = isPostgres ? 5432 : isMysql ? 3306 : 5432
  const dbName     = isPostgres ? 'postgres' : 'mysql'

  const engineVersion = isPostgres ? '16.2' : '8.0'
  const family        = isPostgres ? 'postgres16' : 'mysql8.0'

  return `# rds.tf — RDS managed relational database
# ──────────────────────────────────────────────────────────────────────────────
# Engine: ${engine} · Instance: ${instanceClass} · Multi-AZ: ${multiAz}

resource "random_password" "rds" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "rds_password" {
  name                    = "\${var.project_name}/rds-master-password"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds.result
}

# ── DB subnet group ────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "\${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "\${var.project_name}-db-subnet-group" }
}

# ── Parameter group ────────────────────────────────────────────────────────────

resource "aws_db_parameter_group" "main" {
  name   = "\${var.project_name}-db-params"
  family = "${family}"

  parameter {
    name  = "log_connections"
    value = "1"
  }
}

# ── RDS instance ───────────────────────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier     = "\${var.project_name}-db"
  engine         = "${engine}"
  engine_version = "${engineVersion}"
  instance_class = "${instanceClass}"

  allocated_storage     = ${storage}
  max_allocated_storage = ${storage * 4}
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "app"
  username = "dbadmin"
  password = random_password.rds.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  port                   = ${dbPort}
  multi_az               = ${multiAz}
  publicly_accessible    = false
  deletion_protection    = var.environment == "prod"
  skip_final_snapshot    = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "\${var.project_name}-db-final-snapshot" : null

  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  enabled_cloudwatch_logs_exports = ["${isPostgres ? 'postgresql' : 'error,general,slowquery'}"]

  tags = { Name = "\${var.project_name}-db" }

  lifecycle {
    prevent_destroy       = false
    ignore_changes        = [password]
  }
}
`
}

function genElasticache(components: InfraComponent[]): string | null {
  const cache = find(components, 'elasticache')
  if (!cache) return null

  const nodeType  = cfg(cache, 'nodeType', 'cache.t3.small') as string
  const nodeCount = cfg(cache, 'nodes', 1) as number
  const isCluster = nodeCount > 1

  return `# cache.tf — ElastiCache Redis ${isCluster ? `replication group (${nodeCount} nodes)` : 'single node'}
# ──────────────────────────────────────────────────────────────────────────────
# Node type: ${nodeType}

resource "aws_elasticache_subnet_group" "main" {
  name       = "\${var.project_name}-cache-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "\${var.project_name}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}

${isCluster ? `resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "\${var.project_name}-redis"
  description          = "Redis cluster for \${var.project_name}"

  node_type            = "${nodeType}"
  num_cache_clusters   = ${nodeCount}
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]
  parameter_group_name = aws_elasticache_parameter_group.main.name

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = ${nodeCount > 1}
  multi_az_enabled           = ${nodeCount > 1}

  snapshot_retention_limit = 1
  snapshot_window          = "05:00-06:00"

  tags = { Name = "\${var.project_name}-redis" }
}` : `resource "aws_elasticache_cluster" "main" {
  cluster_id           = "\${var.project_name}-redis"
  engine               = "redis"
  node_type            = "${nodeType}"
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]

  tags = { Name = "\${var.project_name}-redis" }
}`}
`
}

function genLambda(components: InfraComponent[]): string | null {
  const lambdas = findAll(components, 'lambda')
  if (lambdas.length === 0) return null

  const blocks = lambdas.map((fn, i) => {
    const suffix   = lambdas.length > 1 ? `_${i + 1}` : ''
    const name     = fn.label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '')
    const memMb    = cfg(fn, 'memoryMb', 512) as number
    const timeoutS = Math.ceil((cfg(fn, 'durationMs', 3000) as number) / 1000)
    const arch     = cfg(fn, 'arch', 'x86_64') as string

    return `# ── Lambda: ${fn.label} ──────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "lambda${suffix}" {
  name              = "/aws/lambda/\${var.project_name}-${name}"
  retention_in_days = 14
}

data "aws_iam_policy_document" "lambda_assume${suffix}" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda${suffix}" {
  name               = "\${var.project_name}-lambda${suffix}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume${suffix}.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs${suffix}" {
  role       = aws_iam_role.lambda${suffix}.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "fn${suffix}" {
  function_name = "\${var.project_name}-${name}"
  role          = aws_iam_role.lambda${suffix}.arn

  # Upload your deployment package — zip or container image
  filename      = "\${path.module}/lambda${suffix}.zip"
  handler       = "index.handler"
  runtime       = "nodejs22.x"

  memory_size   = ${memMb}
  timeout       = ${timeoutS}
  architectures = ["${arch}"]

  environment {
    variables = {
      NODE_ENV = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda${suffix},
    aws_iam_role_policy_attachment.lambda_logs${suffix},
  ]
}
`
  })

  return `# lambda.tf — Lambda functions
# ──────────────────────────────────────────────────────────────────────────────
# ${lambdas.length} function(s) on canvas: ${lambdas.map((f) => f.label).join(', ')}

${blocks.join('\n')}
`
}

function genApiGateway(components: InfraComponent[]): string | null {
  const gw = find(components, 'api_gateway')
  if (!gw) return null

  const hasLambda = has(components, 'lambda')
  const apiType   = cfg(gw, 'apiType', 'HTTP') as string
  const isHttp    = apiType !== 'REST'
  const throttle  = cfg(gw, 'throttleLimit', 1000) as number

  return `# api_gateway.tf — API Gateway ${apiType} API
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "main" {
  name          = "\${var.project_name}-api"
  protocol_type = "${isHttp ? 'HTTP' : 'HTTP'}"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
  }

  default_route_settings {
    throttling_burst_limit = ${throttle}
    throttling_rate_limit  = ${throttle}
  }
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/apigateway/\${var.project_name}"
  retention_in_days = 7
}
${hasLambda ? `
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.fn.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/\${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fn.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
` : ''}
`
}

function genDynamoDB(components: InfraComponent[]): string | null {
  const tables = findAll(components, 'dynamodb')
  if (tables.length === 0) return null

  const blocks = tables.map((tbl, i) => {
    const suffix  = tables.length > 1 ? `_${i + 1}` : ''
    const billing = cfg(tbl, 'billingMode', 'PAY_PER_REQUEST') as string
    const rcu     = cfg(tbl, 'readCapacity', 5) as number
    const wcu     = cfg(tbl, 'writeCapacity', 5) as number
    const name    = tbl.label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '')
    const isProvisioned = billing === 'PROVISIONED'

    return `resource "aws_dynamodb_table" "main${suffix}" {
  name         = "\${var.project_name}-${name}"
  billing_mode = "${isProvisioned ? 'PROVISIONED' : 'PAY_PER_REQUEST'}"
${isProvisioned ? `  read_capacity  = ${rcu}\n  write_capacity = ${wcu}\n` : ''}
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # Global Secondary Index — add more as needed
  # global_secondary_index { ... }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  server_side_encryption {
    enabled = true
  }

  tags = { Name = "\${var.project_name}-${name}" }
}
`
  })

  return `# dynamodb.tf — DynamoDB table(s)
# ──────────────────────────────────────────────────────────────────────────────
# ${tables.length} table(s) on canvas: ${tables.map((t) => t.label).join(', ')}

${blocks.join('\n')}
`
}

function genSqs(components: InfraComponent[]): string | null {
  const queues = findAll(components, 'sqs')
  if (queues.length === 0) return null

  const blocks = queues.map((q, i) => {
    const suffix  = queues.length > 1 ? `_${i + 1}` : ''
    const isFifo  = (q.label.toLowerCase().includes('fifo') || cfg<string>(q, 'queueType', 'standard') === 'fifo')
    const vis     = cfg(q, 'visibilityTimeout', 30) as number
    const name    = q.label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '')
    const qName   = isFifo ? `\${var.project_name}-${name}.fifo` : `\${var.project_name}-${name}`

    return `resource "aws_sqs_queue" "dlq${suffix}" {
  name                      = "\${var.project_name}-${name}-dlq${isFifo ? '.fifo' : ''}"
  ${isFifo ? 'fifo_queue                  = true\n  content_based_deduplication = true' : ''}
  message_retention_seconds = 1209600  # 14 days
}

resource "aws_sqs_queue" "main${suffix}" {
  name                      = "${qName}"
  ${isFifo ? 'fifo_queue                  = true\n  content_based_deduplication = true' : ''}
  visibility_timeout_seconds = ${vis}
  message_retention_seconds  = 345600  # 4 days

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq${suffix}.arn
    maxReceiveCount     = 5
  })

  tags = { Name = "\${var.project_name}-${name}" }
}
`
  })

  return `# sqs.tf — SQS queues with Dead Letter Queues
# ──────────────────────────────────────────────────────────────────────────────
# ${queues.length} queue(s) on canvas: ${queues.map((q) => q.label).join(', ')}

${blocks.join('\n')}
`
}

function genCloudFront(components: InfraComponent[]): string | null {
  const cf = find(components, 'cloudfront')
  if (!cf) return null

  const hasS3     = has(components, 's3')
  const hasAlb    = has(components, 'alb')
  const hasApiGw  = has(components, 'api_gateway')
  const priceClass = cfg(cf, 'priceClass', 'PriceClass_100') as string
  const compress   = cfg(cf, 'compress', true) as boolean

  return `# cdn.tf — CloudFront distribution
# ──────────────────────────────────────────────────────────────────────────────
# Price class: ${priceClass}

${hasS3 ? `# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "\${var.project_name}-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
` : ''}
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "\${var.project_name} CDN"
  price_class         = "${priceClass}"
  wait_for_deployment = false
${hasS3 ? `
  origin {
    domain_name              = aws_s3_bucket.main.bucket_regional_domain_name
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }
` : ''}${hasAlb ? `
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
` : ''}${hasApiGw ? `
  origin {
    domain_name = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
    origin_id   = "apigw-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
` : ''}
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "${hasAlb ? 'alb-origin' : hasApiGw ? 'apigw-origin' : 's3-origin'}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = ${compress}

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
${hasS3 ? `
  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 86400
    default_ttl = 604800
    max_ttl     = 31536000
  }
` : ''}
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # Replace with ACM certificate for custom domain:
    # acm_certificate_arn      = aws_acm_certificate.main.arn
    # ssl_support_method        = "sni-only"
    # minimum_protocol_version  = "TLSv1.2_2021"
  }
}
`
}

function genWaf(components: InfraComponent[]): string | null {
  const waf = find(components, 'waf')
  if (!waf) return null

  const ruleCount = cfg(waf, 'ruleCount', 3) as number

  return `# waf.tf — WAFv2 Web ACL
# ──────────────────────────────────────────────────────────────────────────────
# ${ruleCount} managed rule group(s)

resource "aws_wafv2_web_acl" "main" {
  name  = "\${var.project_name}-waf"
  scope = "CLOUDFRONT"  # Use REGIONAL for ALB/API GW

  default_action {
    allow {}
  }

  # AWS Managed Rules — Core rule set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules — Known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting — 2000 requests per 5 minutes per IP
  rule {
    name     = "RateLimit"
    priority = 3

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "\${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
}
`
}

function genS3(components: InfraComponent[]): string | null {
  const buckets = findAll(components, 's3')
  if (buckets.length === 0) return null

  const hasCf = has(components, 'cloudfront')

  const blocks = buckets.map((b, i) => {
    const suffix  = buckets.length > 1 ? `_${i + 1}` : ''
    const versioning = cfg(b, 'versioning', false) as boolean
    const name    = b.label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '')

    return `resource "aws_s3_bucket" "main${suffix}" {
  bucket = "\${var.project_name}-${name}-\${data.aws_caller_identity.current.account_id}"

  tags = { Name = "\${var.project_name}-${name}" }
}

resource "aws_s3_bucket_versioning" "main${suffix}" {
  bucket = aws_s3_bucket.main${suffix}.id
  versioning_configuration {
    status = "${versioning ? 'Enabled' : 'Disabled'}"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main${suffix}" {
  bucket = aws_s3_bucket.main${suffix}.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "main${suffix}" {
  bucket                  = aws_s3_bucket.main${suffix}.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
${hasCf ? `
# Bucket policy: allow CloudFront OAC only
resource "aws_s3_bucket_policy" "main${suffix}" {
  bucket = aws_s3_bucket.main${suffix}.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "\${aws_s3_bucket.main${suffix}.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}
` : ''}
`
  })

  return `# s3.tf — S3 bucket(s)
# ──────────────────────────────────────────────────────────────────────────────
# ${buckets.length} bucket(s) on canvas: ${buckets.map((b) => b.label).join(', ')}

data "aws_caller_identity" "current" {}

${blocks.join('\n')}
`
}

function genOutputs(components: InfraComponent[]): string {
  const outputs: string[] = []

  if (has(components, 'alb')) {
    outputs.push(`output "load_balancer_dns" {
  description = "ALB DNS name — point your domain's CNAME here"
  value       = aws_lb.main.dns_name
}`)
  }

  if (has(components, 'cloudfront')) {
    outputs.push(`output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "Used for cache invalidation: aws cloudfront create-invalidation --distribution-id $id --paths '/*'"
  value       = aws_cloudfront_distribution.main.id
}`)
  }

  if (has(components, 'rds')) {
    outputs.push(`output "rds_endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}`)
  }

  if (has(components, 'elasticache')) {
    const isCluster = (cfg(find(components, 'elasticache')!, 'nodes', 1) as number) > 1
    outputs.push(`output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = ${isCluster
    ? 'aws_elasticache_replication_group.main.primary_endpoint_address'
    : 'aws_elasticache_cluster.main.cache_nodes[0].address'}
}`)
  }

  if (has(components, 'ecs')) {
    outputs.push(`output "ecs_cluster_name" {
  description = "ECS cluster name (for aws ecs update-service)"
  value       = aws_ecs_cluster.main.name
}

output "ecr_repository_url" {
  description = "ECR URL — docker push this to deploy"
  value       = aws_ecr_repository.app.repository_url
}`)
  }

  if (has(components, 'lambda')) {
    outputs.push(`output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.fn.function_name
}`)
  }

  if (has(components, 'api_gateway')) {
    outputs.push(`output "api_gateway_endpoint" {
  description = "API Gateway invoke URL"
  value       = aws_apigatewayv2_stage.main.invoke_url
}`)
  }

  if (has(components, 's3')) {
    outputs.push(`output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.main.id
}`)
  }

  if (has(components, 'dynamodb')) {
    outputs.push(`output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}`)
  }

  if (has(components, 'sqs')) {
    outputs.push(`output "sqs_queue_url" {
  description = "SQS queue URL"
  value       = aws_sqs_queue.main.url
}`)
  }

  return `# outputs.tf — Exported values after terraform apply
# ──────────────────────────────────────────────────────────────────────────────

${outputs.join('\n\n')}
`
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generates a complete set of Terraform HCL files from the current canvas state.
 *
 * @param components  The current InfraComponent[] from infraStore
 * @param templateId  Active architecture template (used in variables.tf comment)
 * @param scaleTier   Active scale tier (0–4, used in variables.tf comment)
 * @returns           TerraformFiles — keyed by filename, values are HCL strings
 */
export function generateTerraform(
  components: InfraComponent[],
  templateId: ArchTemplateId,
  scaleTier: ScaleTierIndex,
): TerraformFiles {
  const files: Partial<TerraformFiles> = {}

  // Always-present files
  files['versions.tf']  = genVersions()
  files['variables.tf'] = genVariables(templateId, scaleTier)
  files['main.tf']      = genMain(components)
  files['outputs.tf']   = genOutputs(components)

  // Service-specific files — only generated when the service is on the canvas
  const ecs = genEcs(components)
  if (ecs) files['ecs.tf'] = ecs

  const rds = genRds(components)
  if (rds) files['rds.tf'] = rds

  const cache = genElasticache(components)
  if (cache) files['cache.tf'] = cache

  const lambda = genLambda(components)
  if (lambda) files['lambda.tf'] = lambda

  const apigw = genApiGateway(components)
  if (apigw) files['api_gateway.tf'] = apigw

  const dynamo = genDynamoDB(components)
  if (dynamo) files['dynamodb.tf'] = dynamo

  const sqs = genSqs(components)
  if (sqs) files['sqs.tf'] = sqs

  const cdn = genCloudFront(components)
  if (cdn) files['cdn.tf'] = cdn

  const waf = genWaf(components)
  if (waf) files['waf.tf'] = waf

  const s3 = genS3(components)
  if (s3) files['s3.tf'] = s3

  return files as TerraformFiles
}

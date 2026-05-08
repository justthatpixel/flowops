/**
 * awsNodeConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Static display configuration for every AWS (and custom) resource type.
 * Imported by InfraSidebar, BaseAwsNode, InfraConfigPanel, and cost utilities.
 */

import type { AwsServiceType } from '@/types/infra'

// ─── Existing icon imports ────────────────────────────────────────────────────
import albIcon           from '@/assets/aws-icons/alb.svg'
import ecsIcon           from '@/assets/aws-icons/ecs.svg'
import rdsIcon           from '@/assets/aws-icons/rds.svg'
import elasticacheIcon   from '@/assets/aws-icons/elasticache.svg'
import natIcon           from '@/assets/aws-icons/nat_gateway.svg'
import cloudfrontIcon    from '@/assets/aws-icons/cloudfront.svg'
import wafIcon           from '@/assets/aws-icons/waf.svg'
import shieldIcon        from '@/assets/aws-icons/shield.svg'
import s3Icon            from '@/assets/aws-icons/s3.svg'
import apiGwIcon         from '@/assets/aws-icons/api_gateway.svg'
import lambdaIcon        from '@/assets/aws-icons/lambda.svg'
import sqsIcon           from '@/assets/aws-icons/sqs.svg'
import dynamodbIcon      from '@/assets/aws-icons/dynamodb.svg'
import route53Icon       from '@/assets/aws-icons/route53.svg'

// ─── New icon imports ─────────────────────────────────────────────────────────
import ec2AsgIcon        from '@/assets/aws-icons/ec2_asg.svg'
import ecsTaskIcon       from '@/assets/aws-icons/ecs_task.svg'
import beanstalkIcon     from '@/assets/aws-icons/elastic_beanstalk.svg'
import vpcIcon           from '@/assets/aws-icons/vpc.svg'
import publicSubnetIcon  from '@/assets/aws-icons/public_subnet.svg'
import privateSubnetIcon from '@/assets/aws-icons/private_subnet.svg'
import efsIcon           from '@/assets/aws-icons/efs.svg'
import ecrIcon           from '@/assets/aws-icons/ecr.svg'
import iamRoleIcon       from '@/assets/aws-icons/iam_role.svg'
import securityGroupIcon from '@/assets/aws-icons/security_group.svg'
import secretsIcon       from '@/assets/aws-icons/secrets_manager.svg'
import kmsIcon           from '@/assets/aws-icons/kms.svg'
import snsIcon           from '@/assets/aws-icons/sns.svg'
import eventbridgeIcon   from '@/assets/aws-icons/eventbridge.svg'
import kinesisIcon       from '@/assets/aws-icons/kinesis.svg'
import cloudwatchIcon    from '@/assets/aws-icons/cloudwatch.svg'
import cloudwatchAlarmIcon from '@/assets/aws-icons/cloudwatch_alarm.svg'
import xrayIcon          from '@/assets/aws-icons/xray.svg'
import auroraIcon        from '@/assets/aws-icons/aurora.svg'
import shieldAdvIcon     from '@/assets/aws-icons/shield_advanced.svg'
import customIcon        from '@/assets/aws-icons/custom.svg'

// ─── Config entry shape ───────────────────────────────────────────────────────

export interface AwsNodeConfigEntry {
  icon:         string   // SVG asset URL
  color:        string   // brand accent color (borders, highlights, pills)
  serviceLabel: string   // short display name shown on canvas node
  description:  string   // shown in hover tooltip + config panel
  category:     string   // sidebar category key
}

// ─── Full registry ────────────────────────────────────────────────────────────

export const AWS_NODE_CONFIG: Record<AwsServiceType, AwsNodeConfigEntry> = {

  // ── Compute ──────────────────────────────────────────────────────────────
  ecs: {
    icon: ecsIcon, color: '#FF9900', category: 'compute',
    serviceLabel: 'ECS Fargate',
    description:  'Container compute on AWS Fargate — fully managed, no EC2 to provision or patch.',
  },
  ecs_task: {
    icon: ecsTaskIcon, color: '#FF9900', category: 'compute',
    serviceLabel: 'ECS Task Def',
    description:  'Blueprint for running containers — defines CPU, memory, image, and environment variables.',
  },
  ec2_asg: {
    icon: ec2AsgIcon, color: '#EC7211', category: 'compute',
    serviceLabel: 'EC2 Auto Scaling',
    description:  'Auto Scaling Group — scales EC2 instances up/down based on demand or schedule.',
  },
  lambda: {
    icon: lambdaIcon, color: '#F97316', category: 'compute',
    serviceLabel: 'Lambda',
    description:  'Serverless compute — runs up to 15 min, scales to zero, billed per 1ms of execution.',
  },
  elastic_beanstalk: {
    icon: beanstalkIcon, color: '#4DB6AC', category: 'compute',
    serviceLabel: 'Elastic Beanstalk',
    description:  'PaaS runtime that handles deployment, capacity provisioning, load balancing and monitoring.',
  },

  // ── Networking ───────────────────────────────────────────────────────────
  vpc: {
    icon: vpcIcon, color: '#8B5CF6', category: 'networking',
    serviceLabel: 'VPC',
    description:  'Logically isolated virtual network for your AWS resources with full control over IP ranges.',
  },
  public_subnet: {
    icon: publicSubnetIcon, color: '#22C55E', category: 'networking',
    serviceLabel: 'Public Subnet',
    description:  'Subnet with a route to an Internet Gateway — instances can receive inbound traffic.',
  },
  private_subnet: {
    icon: privateSubnetIcon, color: '#F59E0B', category: 'networking',
    serviceLabel: 'Private Subnet',
    description:  'Subnet without a direct route to the internet — outbound via NAT Gateway only.',
  },
  alb: {
    icon: albIcon, color: '#3B82F6', category: 'networking',
    serviceLabel: 'Load Balancer',
    description:  'Application Load Balancer — distributes HTTP/S traffic across targets in multiple AZs.',
  },
  nat_gateway: {
    icon: natIcon, color: '#F59E0B', category: 'networking',
    serviceLabel: 'NAT Gateway',
    description:  'Enables private-subnet resources to initiate outbound internet traffic without inbound exposure.',
  },
  route53: {
    icon: route53Icon, color: '#8B5CF6', category: 'networking',
    serviceLabel: 'Route 53',
    description:  'Authoritative DNS with health checks, latency-based routing, failover, and GeoDNS.',
  },
  cloudfront: {
    icon: cloudfrontIcon, color: '#E11D48', category: 'networking',
    serviceLabel: 'CloudFront',
    description:  'Global CDN with 450+ edge locations — serves cached content at low latency worldwide.',
  },
  api_gateway: {
    icon: apiGwIcon, color: '#EC4899', category: 'networking',
    serviceLabel: 'API Gateway',
    description:  'Managed REST/HTTP/WebSocket API endpoint with auth, throttling, and caching built in.',
  },

  // ── Database ─────────────────────────────────────────────────────────────
  rds: {
    icon: rdsIcon, color: '#22C55E', category: 'database',
    serviceLabel: 'RDS PostgreSQL',
    description:  'Managed PostgreSQL with automated backups, read replicas, and Multi-AZ HA.',
  },
  rds_mysql: {
    icon: rdsIcon, color: '#00758F', category: 'database',
    serviceLabel: 'RDS MySQL',
    description:  'Managed MySQL database with automated backups, parameter groups, and Multi-AZ support.',
  },
  aurora_serverless: {
    icon: auroraIcon, color: '#059669', category: 'database',
    serviceLabel: 'Aurora Serverless',
    description:  'Aurora Serverless v2 — auto-scales from 0 to thousands of ACUs. Ideal for variable workloads.',
  },
  aurora_global: {
    icon: auroraIcon, color: '#047857', category: 'database',
    serviceLabel: 'Aurora Global',
    description:  'Aurora Global Database — spans multiple regions with sub-second RPO and cross-region reads.',
  },
  dynamodb: {
    icon: dynamodbIcon, color: '#3B82F6', category: 'database',
    serviceLabel: 'DynamoDB',
    description:  'Serverless NoSQL — single-digit millisecond latency at any scale with on-demand pricing.',
  },
  elasticache: {
    icon: elasticacheIcon, color: '#8B5CF6', category: 'database',
    serviceLabel: 'ElastiCache Redis',
    description:  'In-memory Redis cache — dramatically reduces database load with sub-ms read latency.',
  },
  elasticache_memcached: {
    icon: elasticacheIcon, color: '#A78BFA', category: 'database',
    serviceLabel: 'ElastiCache Memcached',
    description:  'Managed Memcached cluster — high-performance, multi-threaded caching for simple key-value data.',
  },

  // ── Storage ──────────────────────────────────────────────────────────────
  s3: {
    icon: s3Icon, color: '#16A34A', category: 'storage',
    serviceLabel: 'S3 Bucket',
    description:  'Object storage for static assets, build artifacts, backups, and data lake workloads.',
  },
  efs: {
    icon: efsIcon, color: '#3B82F6', category: 'storage',
    serviceLabel: 'EFS File System',
    description:  'Elastic NFS file system — shared, scalable POSIX storage mountable across EC2, ECS, and Lambda.',
  },
  ecr: {
    icon: ecrIcon, color: '#F97316', category: 'storage',
    serviceLabel: 'ECR Repository',
    description:  'Elastic Container Registry — managed Docker container image storage, scanning, and replication.',
  },

  // ── Security ─────────────────────────────────────────────────────────────
  iam_role: {
    icon: iamRoleIcon, color: '#6366F1', category: 'security',
    serviceLabel: 'IAM Role',
    description:  'IAM Role — grants AWS services and users fine-grained permissions via policies.',
  },
  waf: {
    icon: wafIcon, color: '#EF4444', category: 'security',
    serviceLabel: 'WAF Web ACL',
    description:  'Web Application Firewall — filters malicious traffic using managed and custom rule sets.',
  },
  shield: {
    icon: shieldIcon, color: '#DC2626', category: 'security',
    serviceLabel: 'Shield Standard',
    description:  'Shield Standard (free) provides always-on L3/L4 DDoS detection and automatic mitigations.',
  },
  shield_advanced: {
    icon: shieldAdvIcon, color: '#991B1B', category: 'security',
    serviceLabel: 'Shield Advanced',
    description:  'Shield Advanced — 24/7 DDoS Response Team, attack forensics, WAF integration, cost protection.',
  },
  security_group: {
    icon: securityGroupIcon, color: '#EF4444', category: 'security',
    serviceLabel: 'Security Group',
    description:  'Virtual firewall controlling inbound and outbound traffic for EC2, RDS, and other resources.',
  },
  secrets_manager: {
    icon: secretsIcon, color: '#DC2626', category: 'security',
    serviceLabel: 'Secrets Manager',
    description:  'Securely stores, rotates, and retrieves credentials, API keys, and other secrets at scale.',
  },
  kms: {
    icon: kmsIcon, color: '#F59E0B', category: 'security',
    serviceLabel: 'KMS Key',
    description:  'AWS Key Management Service — create and control encryption keys for data at rest and in transit.',
  },

  // ── Messaging ────────────────────────────────────────────────────────────
  sqs: {
    icon: sqsIcon, color: '#F59E0B', category: 'messaging',
    serviceLabel: 'SQS Queue',
    description:  'Fully managed message queue for decoupling producers from consumers with at-least-once delivery.',
  },
  sns: {
    icon: snsIcon, color: '#E11D48', category: 'messaging',
    serviceLabel: 'SNS Topic',
    description:  'Pub/Sub messaging — fan out notifications to Lambda, SQS, HTTP, email, and mobile endpoints.',
  },
  eventbridge: {
    icon: eventbridgeIcon, color: '#7C3AED', category: 'messaging',
    serviceLabel: 'EventBridge',
    description:  'Serverless event bus — routes events between AWS services, SaaS apps, and custom applications.',
  },
  kinesis: {
    icon: kinesisIcon, color: '#0EA5E9', category: 'messaging',
    serviceLabel: 'Kinesis Stream',
    description:  'Real-time data streaming — ingests gigabytes of data per second from hundreds of sources.',
  },

  // ── Observability ────────────────────────────────────────────────────────
  cloudwatch_dashboard: {
    icon: cloudwatchIcon, color: '#FF9900', category: 'observability',
    serviceLabel: 'CloudWatch Dashboard',
    description:  'Custom operational dashboard — visualise metrics, logs, and alarms across your AWS resources.',
  },
  cloudwatch_alarm: {
    icon: cloudwatchAlarmIcon, color: '#EF4444', category: 'observability',
    serviceLabel: 'CloudWatch Alarm',
    description:  'Triggers actions (SNS, Auto Scaling, EC2) when a metric crosses a defined threshold.',
  },
  xray: {
    icon: xrayIcon, color: '#8B5CF6', category: 'observability',
    serviceLabel: 'X-Ray Tracing',
    description:  'Distributed tracing — end-to-end request visibility across microservices, Lambda, and APIs.',
  },

  // ── Custom ───────────────────────────────────────────────────────────────
  custom: {
    icon: customIcon, color: '#6B7280', category: 'custom',
    serviceLabel: 'Custom Resource',
    description:  'User-defined external service, third-party API, or infrastructure component.',
  },
}

/**
 * placeholderFiles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns production-quality generated files for each pipeline node type,
 * derived purely from the node's config (no AI needed for the base output).
 *
 * Files are shown in the NodeConfigPanel "Files" tab and can be downloaded
 * or regenerated with Claude.
 */

import type {
  PipelineNodeData,
  TriggerConfig,
  BuildConfig,
  DeployConfig,
  DockerConfig,
  TestConfig,
  ClaudeTaskConfig,
  GeneratedFile,
} from '@/types/pipeline'
import {
  generateTriggerWorkflow,
  generateBuildWorkflow,
  generateDockerWorkflow,
} from './generators/githubActionsGenerator'
import {
  generateDockerfile,
  generateDockerIgnore,
  generateDockerCompose,
} from './generators/dockerfileGenerator'

// ─── Entry point ─────────────────────────────────────────────────────────────

export function getPlaceholderFiles(data: PipelineNodeData): GeneratedFile[] {
  const { nodeType, config } = data

  switch (nodeType) {
    case 'trigger':
      return getTriggerFiles(config as TriggerConfig | undefined)
    case 'build':
      return getBuildFiles(config as BuildConfig | undefined)
    case 'test':
      return getTestFiles(config as TestConfig | undefined)
    case 'docker':
      return getDockerFiles(config as DockerConfig | undefined)
    case 'deploy':
      return getDeployFiles(config as DeployConfig | undefined)
    case 'claude_task':
      return getClaudeTaskFiles(config as ClaudeTaskConfig | undefined)
    case 'notify':
      return getNotifyFiles()
    default:
      return []
  }
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

function getTriggerFiles(cfg?: TriggerConfig): GeneratedFile[] {
  const provider = cfg?.provider ?? 'github'
  if (provider === 'manual') return []

  const workflow = generateTriggerWorkflow(
    cfg ?? { provider: 'github', branch: 'main', event: 'push' },
  )

  if (provider === 'gitlab') {
    return [
      {
        path: '.gitlab-ci.yml',
        language: 'yaml',
        content: generateGitLabCIStub(cfg),
      },
    ]
  }

  return [
    {
      path: '.github/workflows/ci.yml',
      language: 'yaml',
      content: workflow,
    },
  ]
}

function generateGitLabCIStub(cfg?: TriggerConfig): string {
  const branch = cfg?.branch ?? 'main'
  const event = cfg?.event ?? 'push'

  const only =
    event === 'tag'
      ? `only:\n  - tags`
      : event === 'pr'
      ? `only:\n  - merge_requests`
      : `only:\n  - ${branch}`

  return `# FlowOps generated .gitlab-ci.yml
# https://docs.gitlab.com/ee/ci/

default:
  image: ubuntu:22.04

stages:
  - build
  - test
  - docker
  - deploy

variables:
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TAG: \$CI_COMMIT_SHORT_SHA

cache:
  key: "\$CI_COMMIT_REF_SLUG"
  paths:
    - node_modules/
    - .yarn/cache/

build:
  stage: build
  ${only}
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day

test:
  stage: test
  ${only}
  script:
    - npm run test

docker-build:
  stage: docker
  image: docker:24
  services:
    - docker:24-dind
  ${only}
  before_script:
    - docker login -u "\$CI_REGISTRY_USER" -p "\$CI_REGISTRY_PASSWORD" \$CI_REGISTRY
  script:
    - docker build --tag \$CI_REGISTRY_IMAGE:\$IMAGE_TAG .
    - docker push \$CI_REGISTRY_IMAGE:\$IMAGE_TAG
`
}

// ─── Build ────────────────────────────────────────────────────────────────────

function getBuildFiles(cfg?: BuildConfig): GeneratedFile[] {
  const build = cfg ?? { ciProvider: 'github_actions', runtime: 'node' }

  if (build.ciProvider === 'none') {
    return [getMakefile(build)]
  }

  if (build.ciProvider === 'jenkins') {
    return [getJenkinsfile(build)]
  }

  // GitHub Actions
  const workflow = generateBuildWorkflow(build)
  return [
    {
      path: '.github/workflows/build.yml',
      language: 'yaml',
      content: workflow,
    },
    getMakefile(build),
  ]
}

function getMakefile(build: BuildConfig): GeneratedFile {
  const pm = build.packageManager ?? 'npm'
  const buildCmd = build.buildCommand || defaultBuildCmd(build)
  const testCmd = defaultTestCmd(build)
  const installCmd = pm === 'pnpm'
    ? 'pnpm install --frozen-lockfile'
    : pm === 'yarn'
    ? 'yarn install --frozen-lockfile'
    : pm === 'pip'
    ? 'pip install -r requirements.txt'
    : pm === 'poetry'
    ? 'poetry install --no-interaction'
    : `${pm} install`

  return {
    path: 'Makefile',
    language: 'makefile',
    content: `# FlowOps generated Makefile
.PHONY: install build test lint clean docker-build docker-push

install:
\t${installCmd}

build: install
\t${buildCmd}

test:
\t${testCmd}

lint:
\t${build.lintCommand ?? `echo "No lint command configured"`}

clean:
\t${build.runtime === 'node' ? 'rm -rf dist node_modules' : build.runtime === 'go' ? 'go clean ./...' : build.runtime === 'rust' ? 'cargo clean' : 'rm -rf dist'}

docker-build:
\tdocker build -t app:local .

docker-push:
\tdocker push app:latest

# Run locally
dev:
\t${pm === 'pnpm' ? 'pnpm dev' : pm === 'yarn' ? 'yarn dev' : build.runtime === 'go' ? 'go run ./cmd/server' : build.runtime === 'python' ? 'uvicorn main:app --reload' : 'npm run dev'}
`,
  }
}

function getJenkinsfile(build: BuildConfig): GeneratedFile {
  const pm = build.packageManager ?? 'npm'
  const buildCmd = build.buildCommand || defaultBuildCmd(build)
  const testCmd = defaultTestCmd(build)

  return {
    path: 'Jenkinsfile',
    language: 'groovy',
    content: `// FlowOps generated Jenkinsfile
// https://www.jenkins.io/doc/book/pipeline/

pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh '${pm === 'pnpm' ? 'npm i -g pnpm && pnpm install --frozen-lockfile' : pm === 'yarn' ? 'yarn install --frozen-lockfile' : `${pm} install`}'
      }
    }

    stage('Build') {
      steps {
        sh '${buildCmd}'
      }
    }

    stage('Test') {
      steps {
        sh '${testCmd}'
      }
      post {
        always {
          junit '**/test-results/*.xml'
        }
      }
    }

    stage('Docker Build') {
      when { branch 'main' }
      steps {
        script {
          def image = docker.build("app:\${env.BUILD_NUMBER}")
          docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-credentials') {
            image.push()
            image.push('latest')
          }
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    failure {
      mail to: 'team@example.com',
           subject: "Pipeline FAILED: \${env.JOB_NAME} #\${env.BUILD_NUMBER}",
           body: "Build failed: \${env.BUILD_URL}"
    }
  }
}
`,
  }
}

// ─── Test ─────────────────────────────────────────────────────────────────────

function getTestFiles(cfg?: TestConfig): GeneratedFile[] {
  const runner = cfg?.runner ?? 'vitest'
  const coverage = cfg?.coverage ?? false

  switch (runner) {
    case 'vitest':
      return [
        {
          path: 'vitest.config.ts',
          language: 'typescript',
          content: `import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    ${coverage
      ? `coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },`
      : ''}
    reporters: ['verbose'],
  },
})
`,
        },
      ]

    case 'jest':
      return [
        {
          path: 'jest.config.ts',
          language: 'typescript',
          content: `import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  ${coverage
    ? `collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },`
    : ''}
}

export default config
`,
        },
      ]

    case 'pytest':
      return [
        {
          path: 'pytest.ini',
          language: 'ini',
          content: `[pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
${coverage ? 'addopts = --cov=. --cov-report=term-missing --cov-report=xml --cov-fail-under=80' : 'addopts = -v'}
markers =
  unit: Unit tests
  integration: Integration tests
  slow: Slow tests (>1s)
`,
        },
      ]

    case 'go_test':
      return [
        {
          path: '.github/workflows/test.yml',
          language: 'yaml',
          content: `name: Go Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - name: Test
        run: go test ./... -v -race${coverage ? ' -coverprofile=coverage.out' : ''}
${coverage
  ? `      - name: Coverage report
        run: go tool cover -html=coverage.out -o coverage.html
      - uses: codecov/codecov-action@v4
        with:
          files: coverage.out`
  : ''}
`,
        },
      ]

    default:
      return []
  }
}

// ─── Docker ───────────────────────────────────────────────────────────────────

function getDockerFiles(cfg?: DockerConfig): GeneratedFile[] {
  const docker = cfg ?? {}
  const workflow = generateDockerWorkflow(docker)

  return [
    {
      path: 'Dockerfile',
      language: 'dockerfile',
      content: generateDockerfile(docker),
    },
    {
      path: '.dockerignore',
      language: 'text',
      content: generateDockerIgnore(),
    },
    {
      path: 'docker-compose.yml',
      language: 'yaml',
      content: generateDockerCompose(docker),
    },
    {
      path: '.github/workflows/docker.yml',
      language: 'yaml',
      content: workflow,
    },
  ]
}

// ─── Deploy ───────────────────────────────────────────────────────────────────

function getDeployFiles(cfg?: DeployConfig): GeneratedFile[] {
  const provider = cfg?.provider ?? 'aws'
  const region = cfg?.region ?? 'us-east-1'

  switch (provider) {
    case 'vercel':
      return [
        {
          path: 'vercel.json',
          language: 'json',
          content: JSON.stringify(
            {
              $schema: 'https://openapi.vercel.sh/vercel.json',
              version: 2,
              builds: [{ src: 'dist/index.js', use: '@vercel/node' }],
              routes: [{ src: '/(.*)', dest: 'dist/index.js' }],
              env: { NODE_ENV: 'production' },
            },
            null,
            2,
          ) + '\n',
        },
        {
          path: '.github/workflows/deploy-vercel.yml',
          language: 'yaml',
          content: `name: Deploy to Vercel

on:
  push:
    branches: [ 'main' ]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
`,
        },
      ]

    case 'fly':
      return [
        {
          path: 'fly.toml',
          language: 'toml',
          content: `# FlowOps generated fly.toml
app = "my-app"
primary_region = "${region}"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

[checks]
  [checks.health]
    grace_period = "30s"
    interval = "15s"
    method = "get"
    path = "/health"
    port = 3000
    timeout = "10s"
    type = "http"
`,
        },
        {
          path: '.github/workflows/deploy-fly.yml',
          language: 'yaml',
          content: `name: Deploy to Fly.io

on:
  push:
    branches: [ 'main' ]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    concurrency: deploy-group
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: \${{ secrets.FLY_API_TOKEN }}
`,
        },
      ]

    case 'aws': {
      const taskFamily = 'my-app'
      const cluster = 'my-app-cluster'
      const service = cfg?.service || 'my-app-service'

      return [
        {
          path: 'infrastructure/ecs.tf',
          language: 'hcl',
          content: `# FlowOps generated Terraform — AWS ECS Fargate
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "my-app/terraform.tfstate"
    region = "${region}"
  }
}

provider "aws" {
  region = "${region}"
}

# ── ECS Cluster ───────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${cluster}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── Task Definition ───────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "app" {
  family                   = "${taskFamily}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "${taskFamily}"
    image     = "\${aws_ecr_repository.app.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT",     value = "3000" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${taskFamily}"
        awslogs-region        = "${region}"
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ── ECS Service ───────────────────────────────────────────────────────────────
resource "aws_ecs_service" "main" {
  name            = "${service}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "${taskFamily}"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]
}

# ── ECR Repository ────────────────────────────────────────────────────────────
resource "aws_ecr_repository" "app" {
  name                 = "${taskFamily}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
`,
        },
        {
          path: 'infrastructure/variables.tf',
          language: 'hcl',
          content: `variable "region" {
  description = "AWS region"
  type        = string
  default     = "${region}"
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}
`,
        },
      ]
    }

    case 'gcp': {
      return [
        {
          path: 'infrastructure/cloudrun.tf',
          language: 'hcl',
          content: `# FlowOps generated Terraform — GCP Cloud Run
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = "${region}"
}

resource "google_cloud_run_v2_service" "app" {
  name     = "my-app"
  location = "${region}"

  template {
    containers {
      image = "gcr.io/\${var.project_id}/my-app:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

resource "google_cloud_run_service_iam_member" "public" {
  location = google_cloud_run_v2_service.app.location
  service  = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
`,
        },
      ]
    }

    case 'render':
      return [
        {
          path: 'render.yaml',
          language: 'yaml',
          content: `# FlowOps generated render.yaml
# https://render.com/docs/blueprint-spec

services:
  - type: web
    name: my-app
    runtime: node
    region: ${region === 'us-east-1' ? 'oregon' : 'frankfurt'}
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: node dist/index.js
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        fromDatabase:
          name: my-app-db
          property: connectionString

databases:
  - name: my-app-db
    plan: starter
    region: ${region === 'us-east-1' ? 'oregon' : 'frankfurt'}
`,
        },
      ]

    default:
      return []
  }
}

// ─── Claude task ──────────────────────────────────────────────────────────────

function getClaudeTaskFiles(cfg?: ClaudeTaskConfig): GeneratedFile[] {
  const prompt = cfg?.prompt ?? 'Describe what Claude should do here'
  return [
    {
      path: 'claude-task.md',
      language: 'markdown',
      content: `# Claude Task

## Prompt

${prompt}

## Usage

This file is used by the FlowOps pipeline to run a Claude task.
Configure it in the node's Config tab, then generate with Claude.

## Expected Output

Claude will generate code, documentation, or analysis based on the prompt above.
Results will appear as additional files in this node's Files tab.
`,
    },
  ]
}

// ─── Notify ───────────────────────────────────────────────────────────────────

function getNotifyFiles(): GeneratedFile[] {
  return [
    {
      path: '.github/workflows/notify.yml',
      language: 'yaml',
      content: `name: Notify

on:
  workflow_run:
    workflows: ['CI/CD Pipeline']
    types: [completed]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack on success
        if: \${{ github.event.workflow_run.conclusion == 'success' }}
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "✅ Pipeline *\${{ github.event.workflow_run.name }}* passed on \`\${{ github.event.workflow_run.head_branch }}\`",
              "blocks": [{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "✅ *\${{ github.event.workflow_run.name }}* passed\\n<\${{ github.event.workflow_run.html_url }}|View run>"
                }
              }]
            }
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

      - name: Notify Slack on failure
        if: \${{ github.event.workflow_run.conclusion == 'failure' }}
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "❌ Pipeline *\${{ github.event.workflow_run.name }}* FAILED on \`\${{ github.event.workflow_run.head_branch }}\`",
              "blocks": [{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "❌ *\${{ github.event.workflow_run.name }}* failed\\n<\${{ github.event.workflow_run.html_url }}|View run and fix>"
                }
              }]
            }
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
`,
    },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultBuildCmd(build: BuildConfig): string {
  const pm = build.packageManager ?? 'npm'
  switch (build.runtime) {
    case 'node':   return pm === 'pnpm' ? 'pnpm run build' : pm === 'yarn' ? 'yarn build' : 'npm run build'
    case 'python': return 'python -m build'
    case 'go':     return 'go build ./...'
    case 'rust':   return 'cargo build --release'
    case 'java':   return build.packageManager === 'gradle' ? './gradlew build' : 'mvn package -q'
    default:       return 'npm run build'
  }
}

function defaultTestCmd(build: BuildConfig): string {
  const pm = build.packageManager ?? 'npm'
  switch (build.runtime) {
    case 'node':   return pm === 'pnpm' ? 'pnpm test' : pm === 'yarn' ? 'yarn test' : 'npm test'
    case 'python': return 'pytest'
    case 'go':     return 'go test ./... -v -race'
    case 'rust':   return 'cargo test'
    case 'java':   return build.packageManager === 'gradle' ? './gradlew test' : 'mvn test -q'
    default:       return 'npm test'
  }
}

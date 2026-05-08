/**
 * githubActionsGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates production-quality GitHub Actions workflow YAML files from
 * FlowOps pipeline node configurations.
 *
 * Exported functions:
 *   generateTriggerWorkflow(cfg)   – minimal on:/jobs: stub for a trigger node
 *   generateBuildWorkflow(cfg)     – full build + test job
 *   generateDockerWorkflow(cfg)    – docker build+push job with registry login
 *   generateFullPipeline(opts)     – unified workflow combining all nodes
 */

import type {
  TriggerConfig,
  BuildConfig,
  TestConfig,
  DockerConfig,
  DeployConfig,
} from '@/types/pipeline'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function indent(str: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return str
    .split('\n')
    .map((l) => (l.trim() === '' ? '' : pad + l))
    .join('\n')
}

function yamlList(items: string[], indentSpaces = 0): string {
  return items.map((i) => ' '.repeat(indentSpaces) + `- ${i}`).join('\n')
}

// ─── On: trigger block ────────────────────────────────────────────────────────

export function buildOnBlock(cfg: TriggerConfig): string {
  const branch = cfg.branch || 'main'

  if (cfg.provider === 'manual' || cfg.event === 'manual') {
    return `on:\n  workflow_dispatch:`
  }

  const pathsBlock = cfg.pathsFilter
    ? `\n      paths:\n${cfg.pathsFilter
        .split(',')
        .map((p) => `        - '${p.trim()}'`)
        .join('\n')}`
    : ''

  const ignoreBlock = cfg.ignorePaths
    ? `\n      paths-ignore:\n${cfg.ignorePaths
        .split(',')
        .map((p) => `        - '${p.trim()}'`)
        .join('\n')}`
    : ''

  switch (cfg.event) {
    case 'push':
      return `on:
  push:
    branches: [ '${branch}' ]${pathsBlock}${ignoreBlock}
  workflow_dispatch:`

    case 'pr':
      return `on:
  pull_request:
    branches: [ '${branch}' ]${pathsBlock}${ignoreBlock}
  push:
    branches: [ '${branch}' ]${pathsBlock}${ignoreBlock}`

    case 'tag':
      return `on:
  push:
    tags: [ 'v*.*.*' ]
  workflow_dispatch:`

    default:
      return `on:\n  push:\n    branches: [ '${branch}' ]`
  }
}

// ─── Concurrency block ────────────────────────────────────────────────────────

function buildConcurrencyBlock(cfg: TriggerConfig): string {
  const cancel = cfg.enableConcurrencyCancel !== false  // default true
  const group =
    cfg.concurrencyGroup || '${{ github.workflow }}-${{ github.ref }}'
  return `concurrency:
  group: ${group}
  cancel-in-progress: ${cancel}`
}

// ─── Build + test job ─────────────────────────────────────────────────────────

function runtimeSetupSteps(build: BuildConfig): string {
  const cacheEnabled = build.cacheEnabled !== false  // default true
  const pm = build.packageManager ?? 'npm'

  switch (build.runtime) {
    case 'node': {
      const ver = build.nodeVersion || '20'
      const cacheArg = cacheEnabled ? `\n          cache: '${pm === 'pnpm' || pm === 'npm' || pm === 'yarn' ? pm : 'npm'}'` : ''
      const pnpmSetup =
        pm === 'pnpm'
          ? `\n      - name: Setup pnpm\n        uses: pnpm/action-setup@v4\n        with:\n          version: latest`
          : ''
      return `${pnpmSetup}
      - name: Setup Node.js ${ver}
        uses: actions/setup-node@v4
        with:
          node-version: '${ver}'${cacheArg}`
    }

    case 'python': {
      const ver = build.pythonVersion || '3.12'
      const cacheArg = cacheEnabled ? `\n          cache: '${pm === 'poetry' ? 'poetry' : 'pip'}'` : ''
      return `      - name: Setup Python ${ver}
        uses: actions/setup-python@v5
        with:
          python-version: '${ver}'${cacheArg}`
    }

    case 'go': {
      const ver = build.goVersion || '1.22'
      const cacheArg = cacheEnabled ? `\n          cache: true` : ''
      return `      - name: Setup Go ${ver}
        uses: actions/setup-go@v5
        with:
          go-version: '${ver}'${cacheArg}`
    }

    case 'rust': {
      return `      - name: Setup Rust (stable)
        uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy
      - name: Cache Rust deps
        uses: Swatinem/rust-cache@v2`
    }

    case 'java': {
      const ver = build.javaVersion || '21'
      return `      - name: Setup Java ${ver}
        uses: actions/setup-java@v4
        with:
          java-version: '${ver}'
          distribution: 'temurin'
          cache: '${pm === 'gradle' ? 'gradle' : 'maven'}'`
    }

    default:
      return ''
  }
}

function installStep(build: BuildConfig): string {
  const pm = build.packageManager ?? 'npm'
  switch (pm) {
    case 'pnpm':    return `pnpm install --frozen-lockfile`
    case 'yarn':    return `yarn install --frozen-lockfile`
    case 'poetry':  return `poetry install --no-interaction`
    case 'pip':     return `pip install -r requirements.txt`
    case 'cargo':   return `cargo fetch`
    case 'maven':   return `mvn dependency:go-offline -q`
    case 'gradle':  return `./gradlew dependencies -q`
    default:        return `npm ci`
  }
}

function buildTestSteps(
  build: BuildConfig,
  test?: TestConfig,
): string {
  const pm = build.packageManager ?? 'npm'
  const runner = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : pm === 'poetry' ? 'poetry run' : pm

  const buildCmd = build.buildCommand || defaultBuildCmd(build)
  const lintStep = build.lintCommand
    ? `\n      - name: Lint\n        run: ${build.lintCommand}${build.workingDirectory ? `\n        working-directory: ${build.workingDirectory}` : ''}`
    : ''

  const workDir = build.workingDirectory
    ? `\n        working-directory: ${build.workingDirectory}`
    : ''

  const testCmd = resolveTestCmd(build, test)
  const coverageFlag = test?.coverage ? resolveCoverageFlag(build, test) : ''

  const testStep = testCmd
    ? `\n      - name: Test
        run: ${testCmd}${coverageFlag}${workDir}${test?.coverage
          ? `\n      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false`
          : ''}`
    : ''

  return `      - name: Install dependencies
        run: ${installStep(build)}${workDir}${lintStep}
      - name: Build
        run: ${buildCmd}${workDir}${testStep}`
}

function defaultBuildCmd(build: BuildConfig): string {
  const pm = build.packageManager ?? 'npm'
  switch (build.runtime) {
    case 'node':   return `${pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run'} build`
    case 'python': return `python -m build`
    case 'go':     return `go build ./...`
    case 'rust':   return `cargo build --release`
    case 'java':   return build.packageManager === 'gradle' ? `./gradlew build` : `mvn package -q`
    default:       return `npm run build`
  }
}

function resolveTestCmd(build: BuildConfig, test?: TestConfig): string {
  if (test?.testCommand) return test.testCommand
  const pm = build.packageManager ?? 'npm'
  const runner = test?.runner
  if (runner === 'pytest')       return `pytest`
  if (runner === 'go_test')      return `go test ./... -v`
  if (runner === 'cargo_test')   return `cargo test`
  if (runner === 'jest')         return `${pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run'} test`
  if (runner === 'vitest')       return `${pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run'} test`
  // default by runtime
  switch (build.runtime) {
    case 'node':   return `${pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run'} test`
    case 'python': return `pytest`
    case 'go':     return `go test ./... -v -race`
    case 'rust':   return `cargo test`
    case 'java':   return build.packageManager === 'gradle' ? `./gradlew test` : `mvn test -q`
    default:       return ''
  }
}

function resolveCoverageFlag(build: BuildConfig, test?: TestConfig): string {
  const runner = test?.runner
  if (runner === 'vitest')   return ` --coverage`
  if (runner === 'jest')     return ` --coverage`
  if (runner === 'pytest')   return ` --cov=. --cov-report=xml`
  if (runner === 'go_test')  return ` -coverprofile=coverage.out`
  return ''
}

// ─── Docker build + push job ──────────────────────────────────────────────────

export function buildDockerJobSteps(docker: DockerConfig): string {
  const registry = docker.registry ?? 'ghcr'
  const imageName = docker.imageName || '${{ github.event.repository.name }}'
  const tag = docker.tag || '${{ github.sha }}'
  const platforms = resolvePlatforms(docker.platforms)
  const dockerfilePath = docker.dockerfilePath || 'Dockerfile'
  const contextPath = docker.contextPath || '.'
  const pushBranch = docker.pushOnBranch || 'main'

  const buildArgLines = docker.buildArgs
    ? docker.buildArgs
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `            ${l.trim()}`)
        .join('\n')
    : ''
  const buildArgBlock = buildArgLines
    ? `\n          build-args: |\n${buildArgLines}`
    : ''

  const registryLogin = buildRegistryLogin(docker)
  const fullImageRef = buildFullImageRef(docker)
  const secretsComment = buildSecretsComment(docker)

  const sha = '${{ github.sha }}'
  const trivyStep = docker.scanAfterPush
    ? `
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${fullImageRef}:${sha}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'`
    : ''

  return `    # ──────────────────────────────────────────────────────────────────────
    # Required secrets:${secretsComment}
    # ──────────────────────────────────────────────────────────────────────
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up QEMU (multi-platform support)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          driver-opts: image=moby/buildkit:latest

${registryLogin}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${fullImageRef}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable=\${{ github.ref == 'refs/heads/${pushBranch}' }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ${contextPath}
          file: ${dockerfilePath}
          platforms: ${platforms}
          push: \${{ github.ref == 'refs/heads/${pushBranch}' }}
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}${buildArgBlock}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true${trivyStep}`
}

function resolvePlatforms(p?: DockerConfig['platforms']): string {
  if (p === 'arm64') return 'linux/arm64'
  if (p === 'multi') return 'linux/amd64,linux/arm64'
  return 'linux/amd64'  // default
}

function buildFullImageRef(docker: DockerConfig): string {
  const name = docker.imageName || '${{ github.event.repository.name }}'
  switch (docker.registry) {
    case 'ghcr':
      return `ghcr.io/\${{ github.repository_owner }}/${name}`
    case 'ecr': {
      const account = docker.ecrAccountId || '${{ secrets.AWS_ACCOUNT_ID }}'
      const region = docker.ecrRegion || 'us-east-1'
      return `${account}.dkr.ecr.${region}.amazonaws.com/${name}`
    }
    case 'gcr': {
      const project = docker.gcrProject || '${{ secrets.GCP_PROJECT_ID }}'
      return `gcr.io/${project}/${name}`
    }
    case 'acr': {
      const registry = docker.acrRegistry || '${{ secrets.ACR_REGISTRY }}'
      return `${registry}/${name}`
    }
    case 'dockerhub':
    default:
      return `\${{ secrets.DOCKERHUB_USERNAME }}/${name}`
  }
}

function buildRegistryLogin(docker: DockerConfig): string {
  switch (docker.registry) {
    case 'ghcr':
      return `      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}`

    case 'ecr': {
      const region = docker.ecrRegion || 'us-east-1'
      return `      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${region}

      - name: Log in to Amazon ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2`
    }

    case 'gcr':
      return `      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: \${{ secrets.GCP_SA_KEY }}

      - name: Configure Docker for GCR
        run: gcloud auth configure-docker gcr.io --quiet`

    case 'acr': {
      const registry = docker.acrRegistry || '${{ secrets.ACR_REGISTRY }}'
      return `      - name: Log in to Azure Container Registry
        uses: azure/docker-login@v2
        with:
          login-server: ${registry}
          username: \${{ secrets.ACR_USERNAME }}
          password: \${{ secrets.ACR_PASSWORD }}`
    }

    case 'dockerhub':
    default:
      return `      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}`
  }
}

function buildSecretsComment(docker: DockerConfig): string {
  switch (docker.registry) {
    case 'ghcr':
      return `\n    # • GITHUB_TOKEN (auto-provided)`
    case 'ecr':
      return `\n    # • AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY${docker.ecrAccountId ? '' : ', AWS_ACCOUNT_ID'}`
    case 'gcr':
      return `\n    # • GCP_SA_KEY (service account JSON)${docker.gcrProject ? '' : ', GCP_PROJECT_ID'}`
    case 'acr':
      return `\n    # • ACR_USERNAME, ACR_PASSWORD${docker.acrRegistry ? '' : ', ACR_REGISTRY'}`
    case 'dockerhub':
    default:
      return `\n    # • DOCKERHUB_USERNAME, DOCKERHUB_TOKEN`
  }
}

// ─── Deploy job ───────────────────────────────────────────────────────────────

function buildDeployJob(deploy: DeployConfig, docker?: DockerConfig): string {
  const region = deploy.region || 'us-east-1'
  switch (deploy.provider) {
    case 'vercel':
      return `  deploy:
    name: Deploy to Vercel
    needs: [build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'`

    case 'fly':
      return `  deploy:
    name: Deploy to Fly.io
    needs: [build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: \${{ secrets.FLY_API_TOKEN }}`

    case 'aws': {
      const service = deploy.service || 'my-app-service'
      const cluster = 'my-app-cluster'
      const taskDef = 'my-app'
      const containerName = docker?.imageName || 'app'
      const imageRef = docker ? buildFullImageRef(docker) : 'my-app'
      return `  deploy:
    name: Deploy to AWS ECS
    needs: [docker]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${region}

      - name: Download task definition
        run: |
          aws ecs describe-task-definition --task-definition ${taskDef} \\
            --query taskDefinition > task-definition.json

      - name: Update ECS container image
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${containerName}
          image: ${imageRef}:\${{ github.sha }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: \${{ steps.task-def.outputs.task-definition }}
          service: ${service}
          cluster: ${cluster}
          wait-for-service-stability: true`
    }

    case 'gcp': {
      const project = 'my-gcp-project'
      const svcName = deploy.service || 'my-app'
      return `  deploy:
    name: Deploy to Cloud Run
    needs: [docker]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: \${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${svcName}
          region: ${region}
          image: gcr.io/\${{ secrets.GCP_PROJECT_ID }}/${docker?.imageName || 'app'}:\${{ github.sha }}`
    }

    default:
      return ''
  }
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

export interface FullPipelineOptions {
  pipelineName: string
  trigger: TriggerConfig
  build?: BuildConfig
  test?: TestConfig
  docker?: DockerConfig
  deploy?: DeployConfig
}

export function generateFullPipeline(opts: FullPipelineOptions): string {
  const { pipelineName, trigger, build, test, docker, deploy } = opts
  const workflowName = trigger.workflowName || pipelineName || 'CI/CD Pipeline'
  const branch = trigger.branch || 'main'

  const onBlock = buildOnBlock(trigger)
  const concurrencyBlock = buildConcurrencyBlock(trigger)

  const hasDocker = !!docker
  const hasDeploy = !!deploy
  const hasBuild = !!build

  const envBlock = buildEnvBlock(build, docker)

  let jobs = ''

  // ── Build job ──────────────────────────────────────────────────────────────
  if (hasBuild) {
    const setupSteps = runtimeSetupSteps(build!)
    const mainSteps = buildTestSteps(build!, test)
    const artifactStep =
      build?.runtime === 'node'
        ? `
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 7`
        : ''

    jobs += `  build:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
${indent(setupSteps.trimStart(), 6)}
${indent(mainSteps.trimStart(), 6)}${artifactStep}

`
  }

  // ── Docker job ─────────────────────────────────────────────────────────────
  if (hasDocker) {
    const dockerNeeds = hasBuild ? `\n    needs: [build]` : ''
    const dockerPerms = `\n    permissions:
      contents: read
      packages: write`
    const dockerEnv = trigger.environment
      ? `\n    environment: ${trigger.environment}`
      : ''

    jobs += `  docker:
    name: Docker Build & Push${dockerNeeds}
    runs-on: ubuntu-latest${dockerPerms}${dockerEnv}
${buildDockerJobSteps(docker!)}

`
  }

  // ── Deploy job ─────────────────────────────────────────────────────────────
  if (hasDeploy) {
    jobs += buildDeployJob(deploy!, docker) + '\n'
  }

  // If no jobs, add a placeholder
  if (!jobs) {
    jobs = `  ci:
    name: CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pipeline triggered
        run: echo "Pipeline '${pipelineName}' triggered successfully"
`
  }

  const lines: string[] = [
    `name: ${workflowName}`,
    '',
    onBlock,
    '',
    concurrencyBlock,
    '',
  ]

  if (envBlock) {
    lines.push(envBlock, '')
  }

  lines.push('jobs:')
  lines.push(jobs.trimEnd())

  return lines.join('\n') + '\n'
}

function buildEnvBlock(build?: BuildConfig, docker?: DockerConfig): string {
  const vars: string[] = []
  if (build?.runtime === 'node') {
    vars.push(`  NODE_VERSION: '${build.nodeVersion || '20'}'`)
  }
  if (docker?.registry === 'ghcr') {
    vars.push(`  REGISTRY: ghcr.io`)
  }
  if (vars.length === 0) return ''
  return `env:\n${vars.join('\n')}`
}

// ─── Standalone generators (single-node) ─────────────────────────────────────

export function generateTriggerWorkflow(cfg: TriggerConfig): string {
  return generateFullPipeline({
    pipelineName: cfg.workflowName || 'CI Pipeline',
    trigger: cfg,
  })
}

export function generateBuildWorkflow(
  build: BuildConfig,
  trigger?: TriggerConfig,
  test?: TestConfig,
): string {
  return generateFullPipeline({
    pipelineName: 'Build & Test',
    trigger: trigger ?? { provider: 'github', branch: 'main', event: 'push' },
    build,
    test,
  })
}

export function generateDockerWorkflow(
  docker: DockerConfig,
  trigger?: TriggerConfig,
  build?: BuildConfig,
): string {
  return generateFullPipeline({
    pipelineName: 'Docker Build & Push',
    trigger: trigger ?? { provider: 'github', branch: 'main', event: 'push' },
    build,
    docker,
  })
}

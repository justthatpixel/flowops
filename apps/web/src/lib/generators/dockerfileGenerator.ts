/**
 * dockerfileGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates production-quality, multi-stage Dockerfiles for each supported
 * runtime, plus matching .dockerignore and docker-compose.yml files.
 */

import type { BuildConfig, DockerConfig } from '@/types/pipeline'

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateDockerfile(
  docker: DockerConfig,
  build?: BuildConfig,
): string {
  const runtime = build?.runtime ?? 'node'
  const pm = build?.packageManager ?? 'npm'

  switch (runtime) {
    case 'node':   return nodeDockerfile(docker, pm)
    case 'python': return pythonDockerfile(docker, pm)
    case 'go':     return goDockerfile(docker)
    case 'rust':   return rustDockerfile(docker)
    case 'java':   return javaDockerfile(docker, pm)
    default:       return nodeDockerfile(docker, pm)
  }
}

export function generateDockerIgnore(build?: BuildConfig): string {
  const runtime = build?.runtime ?? 'node'
  const base = `# FlowOps generated .dockerignore

# Version control
.git
.gitignore

# CI / Local config
.env
.env.*
!.env.example
.github
.gitlab-ci.yml

# IDE files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Docker files (avoid recursive copy)
Dockerfile*
docker-compose*.yml
.dockerignore

# Logs
*.log
logs/

# Temp files
tmp/
.tmp/
`

  switch (runtime) {
    case 'node':
      return (
        base +
        `
# Node.js
node_modules/
npm-debug.log*
yarn-error.log*
.pnpm-debug.log*
.yarn/cache
.yarn/unplugged
coverage/
.nyc_output/
`
      )
    case 'python':
      return (
        base +
        `
# Python
__pycache__/
*.py[cod]
.Python
venv/
.venv/
env/
*.egg-info/
dist/
build/
.pytest_cache/
.coverage
htmlcov/
`
      )
    case 'go':
      return (
        base +
        `
# Go
vendor/
*.test
*.out
bin/
`
      )
    case 'rust':
      return (
        base +
        `
# Rust
target/
Cargo.lock.bak
`
      )
    case 'java':
      return (
        base +
        `
# Java
target/
build/
.gradle/
*.class
*.jar
!app.jar
`
      )
    default:
      return base
  }
}

export function generateDockerCompose(
  docker: DockerConfig,
  build?: BuildConfig,
): string {
  const runtime = build?.runtime ?? 'node'
  const imageName = docker.imageName || 'app'
  const port = getDefaultPort(runtime)

  const buildArgsBlock = docker.buildArgs
    ? `      args:\n` +
      docker.buildArgs
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `        - ${l.trim()}`)
        .join('\n') +
      '\n'
    : ''

  const targetBlock = docker.target ? `      target: ${docker.target}\n` : ''

  let extraServices = ''
  if (runtime === 'python' || runtime === 'node') {
    extraServices = `
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 3`
  }

  const dbService = `
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-devpassword}
      POSTGRES_DB: app_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U app']
      interval: 10s
      timeout: 5s
      retries: 5`

  return `# FlowOps generated docker-compose.yml
# Run: docker compose up --build

name: ${imageName}

services:
  app:
    build:
      context: .
      dockerfile: ${docker.dockerfilePath || 'Dockerfile'}
${buildArgsBlock}${targetBlock}    image: ${imageName}:local
    ports:
      - '${port}:${port}'
    environment:
      NODE_ENV: development
      PORT: '${port}'
      DATABASE_URL: postgresql://app:\${POSTGRES_PASSWORD:-devpassword}@postgres:5432/app_dev
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    restart: unless-stopped${dbService}${extraServices}

volumes:
  postgres_data:
`
}

// ─── Node.js Dockerfile ───────────────────────────────────────────────────────

function nodeDockerfile(docker: DockerConfig, pm: string): string {
  const base = docker.baseImage || 'node:20-alpine'
  const installCmd = pm === 'pnpm'
    ? `RUN npm install -g pnpm@latest\nCOPY pnpm-lock.yaml ./\nRUN pnpm fetch\nCOPY package.json ./\nRUN pnpm install --frozen-lockfile --prefer-offline`
    : pm === 'yarn'
    ? `COPY yarn.lock ./\nRUN yarn install --frozen-lockfile`
    : `COPY package-lock.json ./\nRUN npm ci --omit=dev`

  const copyLockFile = pm === 'pnpm'
    ? `# pnpm setup above`
    : pm === 'yarn'
    ? `# yarn install above`
    : `# npm ci above`

  return `# ─────────────────────────────────────────────────────────────────────────
# Stage 1: Install dependencies
# ─────────────────────────────────────────────────────────────────────────
FROM ${base} AS deps
WORKDIR /app

# Install package manager if needed
${pm === 'pnpm' ? 'RUN npm install -g pnpm@latest' : `# Using ${pm}`}

# Copy only manifests first (better layer caching)
COPY package.json ${pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'yarn' ? 'yarn.lock' : 'package-lock.json'} ./

${pm === 'pnpm'
  ? 'RUN pnpm install --frozen-lockfile'
  : pm === 'yarn'
  ? 'RUN yarn install --frozen-lockfile'
  : 'RUN npm ci'}

# ─────────────────────────────────────────────────────────────────────────
# Stage 2: Build
# ─────────────────────────────────────────────────────────────────────────
FROM ${base} AS builder
WORKDIR /app

${pm === 'pnpm' ? 'RUN npm install -g pnpm@latest' : ''}
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN ${pm === 'pnpm' ? 'pnpm run build' : pm === 'yarn' ? 'yarn build' : 'npm run build'}

# ─────────────────────────────────────────────────────────────────────────
# Stage 3: Production runtime (minimal image)
# ─────────────────────────────────────────────────────────────────────────
FROM ${base} AS runner
WORKDIR /app

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \\
    adduser  --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json ./

USER nextjs
EXPOSE 3000
CMD ["node", "dist/index.js"]
`
}

// ─── Python Dockerfile ────────────────────────────────────────────────────────

function pythonDockerfile(docker: DockerConfig, pm: string): string {
  const base = docker.baseImage || 'python:3.12-slim'
  const isPoetry = pm === 'poetry'

  return `# ─────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────────────────────────────
FROM ${base} AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential curl && \\
    rm -rf /var/lib/apt/lists/*

${isPoetry
  ? `# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.2

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install project dependencies (no dev deps, no interaction)
RUN poetry config virtualenvs.create false && \\
    poetry install --only main --no-interaction --no-ansi`
  : `# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt`}

COPY . .

# ─────────────────────────────────────────────────────────────────────────
# Stage 2: Production runner
# ─────────────────────────────────────────────────────────────────────────
FROM ${base} AS runner
WORKDIR /app

# Create non-root user
RUN groupadd --gid 1001 python && \\
    useradd  --uid 1001 --gid python --shell /bin/bash --create-home python

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=python:python . .

USER python
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`
}

// ─── Go Dockerfile ────────────────────────────────────────────────────────────

function goDockerfile(docker: DockerConfig): string {
  const goVer = docker.baseImage?.match(/golang:([\d.]+)/)?.[1] ?? '1.22'
  return `# ─────────────────────────────────────────────────────────────────────────
# Stage 1: Build binary
# ─────────────────────────────────────────────────────────────────────────
FROM golang:${goVer}-alpine AS builder
WORKDIR /app

# Install build tools
RUN apk add --no-cache git ca-certificates tzdata

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \\
    -ldflags="-w -s -X main.version=\${VERSION}" \\
    -o /app/server ./cmd/server

# ─────────────────────────────────────────────────────────────────────────
# Stage 2: Minimal runtime (scratch)
# ─────────────────────────────────────────────────────────────────────────
FROM scratch AS runner

# Copy CA certs for HTTPS and timezone data
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the compiled binary
COPY --from=builder /app/server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
`
}

// ─── Rust Dockerfile ──────────────────────────────────────────────────────────

function rustDockerfile(docker: DockerConfig): string {
  return `# ─────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────────────────────
FROM rust:1.78-alpine AS builder
WORKDIR /app

RUN apk add --no-cache musl-dev pkgconfig openssl-dev

# Cache dependency compilation (Cargo.toml + dummy src)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release && rm -rf src

# Build the real binary
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ─────────────────────────────────────────────────────────────────────────
# Stage 2: Minimal runtime
# ─────────────────────────────────────────────────────────────────────────
FROM alpine:3.19 AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates libgcc

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/target/release/app /app/app
RUN chown appuser:appgroup /app/app && chmod +x /app/app

USER appuser
EXPOSE 8080
CMD ["/app/app"]
`
}

// ─── Java Dockerfile ──────────────────────────────────────────────────────────

function javaDockerfile(docker: DockerConfig, pm: string): string {
  const jdkVer = '21'
  const isGradle = pm === 'gradle'
  return `# ─────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:${jdkVer}-jdk-alpine AS builder
WORKDIR /app

${isGradle
  ? `# Cache Gradle wrapper
COPY gradlew gradle.properties ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies

# Build
COPY . .
RUN ./gradlew bootJar --no-daemon -q`
  : `# Cache Maven dependencies
COPY pom.xml ./
RUN mvn dependency:go-offline -q

# Build
COPY src ./src
RUN mvn package -DskipTests -q`}

# ─────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime (JRE only)
# ─────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:${jdkVer}-jre-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/${isGradle ? 'build/libs/*.jar' : 'target/*.jar'} app.jar
RUN chown appuser:appgroup app.jar

USER appuser
EXPOSE 8080
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "java \${JAVA_OPTS} -jar app.jar"]
`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultPort(runtime: string): number {
  switch (runtime) {
    case 'python': return 8000
    case 'go':     return 8080
    case 'rust':   return 8080
    case 'java':   return 8080
    default:       return 3000
  }
}

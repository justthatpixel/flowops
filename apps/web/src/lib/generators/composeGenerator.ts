/**
 * composeGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure function: ContainerNode[] + ContainerEdge[] → GeneratedFiles
 * Generates docker-compose.yml, docker-compose.override.yml, .env.example, Makefile
 */

import type { ContainerNode, ContainerEdge, GeneratedFiles } from '@/types/containers'

// ─── Database image mapping ───────────────────────────────────────────────────

function getDbImage(dbType: string, version: string): string {
  const versionStr = version || 'latest'
  switch (dbType) {
    case 'postgres': return `postgres:${versionStr}`
    case 'mysql': return `mysql:${versionStr}`
    case 'redis': return `redis:${versionStr}`
    case 'mongo': return `mongo:${versionStr}`
    case 'mariadb': return `mariadb:${versionStr}`
    default: return `${dbType}:${versionStr}`
  }
}

function getDbDefaultPort(dbType: string): number {
  switch (dbType) {
    case 'postgres': return 5432
    case 'mysql': return 3306
    case 'redis': return 6379
    case 'mongo': return 27017
    case 'mariadb': return 3306
    default: return 5432
  }
}

// ─── Env var extraction ───────────────────────────────────────────────────────

function extractEnvVars(text: string): string[] {
  const regex = /\$\{([A-Z0-9_]+)\}/g
  const vars: string[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    if (!vars.includes(match[1])) vars.push(match[1])
  }
  return vars
}

// ─── depends_on from edges ────────────────────────────────────────────────────

function getDependencies(nodeId: string, edges: ContainerEdge[], nodeMap: Map<string, ContainerNode>): string[] {
  return edges
    .filter((e) => e.source === nodeId)
    .map((e) => {
      const target = nodeMap.get(e.target)
      return target ? target.label : null
    })
    .filter(Boolean) as string[]
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateCompose(
  nodes: ContainerNode[],
  edges: ContainerEdge[]
): GeneratedFiles {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const services = nodes.filter((n) => n.type === 'service')
  const databases = nodes.filter((n) => n.type === 'database')
  const volumes = nodes.filter((n) => n.type === 'volume')
  const networks = nodes.filter((n) => n.type === 'network')

  const allEnvVars: string[] = []

  // ── docker-compose.yml ────────────────────────────────────────────────────
  let composeYml = `version: '3.9'\n\nservices:\n`

  // Services
  for (const svc of services) {
    const c = svc.config
    const image = (c.image as string) || 'your-app:latest'
    const ports = (c.ports as string) || ''
    const restart = (c.restart as string) || 'unless-stopped'
    const memLimit = (c.memLimit as string) || '512m'
    const cpuLimit = (c.cpuLimit as number) || 0.5
    const healthPath = (c.healthCheckPath as string) || '/health'
    const networksVal = (c.networks as string) || 'default'
    const envVarsRaw = (c.envVars as string) || ''
    const buildDockerfile = c.buildDockerfile as boolean
    const buildContext = (c.buildContext as string) || '.'

    const deps = getDependencies(svc.id, edges, nodeMap)
    const envLines = envVarsRaw.split('\n').filter((l) => l.trim())

    // Collect env var names
    for (const line of envLines) {
      const vars = extractEnvVars(line)
      allEnvVars.push(...vars)
    }

    composeYml += `  ${svc.label}:\n`

    if (buildDockerfile) {
      composeYml += `    build:\n      context: ${buildContext}\n      dockerfile: Dockerfile\n`
    } else {
      composeYml += `    image: ${image}\n`
    }

    if (ports) {
      composeYml += `    ports:\n      - "${ports}"\n`
    }

    if (envLines.length > 0) {
      composeYml += `    environment:\n`
      for (const line of envLines) {
        composeYml += `      - ${line}\n`
      }
    }

    composeYml += `    restart: ${restart}\n`
    composeYml += `    deploy:\n      resources:\n        limits:\n          memory: ${memLimit}\n          cpus: '${cpuLimit}'\n`

    if (healthPath) {
      composeYml += `    healthcheck:\n      test: ["CMD", "curl", "-f", "http://localhost:${healthPath}"]\n      interval: 30s\n      timeout: 10s\n      retries: 3\n      start_period: 40s\n`
    }

    if (deps.length > 0) {
      composeYml += `    depends_on:\n`
      for (const dep of deps) {
        composeYml += `      - ${dep}\n`
      }
    }

    const networksList = networksVal.split(',').map((n) => n.trim()).filter(Boolean)
    if (networksList.length > 0) {
      composeYml += `    networks:\n`
      for (const net of networksList) {
        composeYml += `      - ${net}\n`
      }
    }

    composeYml += `\n`
  }

  // Databases
  for (const db of databases) {
    const c = db.config
    const dbType = (c.dbType as string) || 'postgres'
    const version = (c.version as string) || '15-alpine'
    const port = (c.port as number) || getDbDefaultPort(dbType)
    const dbName = (c.dbName as string) || 'appdb'
    const user = (c.user as string) || 'postgres'
    const volumeMountPath = (c.volumeMountPath as string) || '/var/lib/postgresql/data'
    const image = getDbImage(dbType, version)

    composeYml += `  ${db.label}:\n`
    composeYml += `    image: ${image}\n`
    composeYml += `    ports:\n      - "${port}:${port}"\n`

    // DB-specific env vars
    if (dbType === 'postgres') {
      composeYml += `    environment:\n      POSTGRES_DB: \${POSTGRES_DB:-${dbName}}\n      POSTGRES_USER: \${POSTGRES_USER:-${user}}\n      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}\n`
      allEnvVars.push('POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD')
    } else if (dbType === 'mysql' || dbType === 'mariadb') {
      composeYml += `    environment:\n      MYSQL_DATABASE: \${MYSQL_DATABASE:-${dbName}}\n      MYSQL_USER: \${MYSQL_USER:-${user}}\n      MYSQL_PASSWORD: \${MYSQL_PASSWORD}\n      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}\n`
      allEnvVars.push('MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD')
    } else if (dbType === 'mongo') {
      composeYml += `    environment:\n      MONGO_INITDB_DATABASE: \${MONGO_DATABASE:-${dbName}}\n      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER:-${user}}\n      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD}\n`
      allEnvVars.push('MONGO_DATABASE', 'MONGO_USER', 'MONGO_PASSWORD')
    }

    composeYml += `    volumes:\n      - ${db.label}-data:${volumeMountPath}\n`
    composeYml += `    restart: unless-stopped\n\n`
  }

  // Volumes section
  if (volumes.length > 0 || databases.length > 0) {
    composeYml += `volumes:\n`
    for (const v of volumes) {
      composeYml += `  ${v.label}:\n    driver: ${(v.config.driver as string) || 'local'}\n`
    }
    for (const db of databases) {
      composeYml += `  ${db.label}-data:\n    driver: local\n`
    }
    composeYml += `\n`
  }

  // Networks section
  if (networks.length > 0) {
    composeYml += `networks:\n`
    for (const net of networks) {
      composeYml += `  ${net.label}:\n    driver: ${(net.config.driver as string) || 'bridge'}\n`
      if (net.config.subnet) {
        composeYml += `    ipam:\n      config:\n        - subnet: ${net.config.subnet}\n`
      }
    }
  } else {
    composeYml += `networks:\n  default:\n    driver: bridge\n`
  }

  // ── docker-compose.override.yml ───────────────────────────────────────────
  let overrideYml = `# docker-compose.override.yml — development overrides\n# This file is auto-loaded by docker-compose up\nversion: '3.9'\n\nservices:\n`
  for (const svc of services) {
    const c = svc.config
    const ports = (c.ports as string) || '80:3000'
    overrideYml += `  ${svc.label}:\n`
    overrideYml += `    build:\n      context: .\n      dockerfile: Dockerfile.dev\n`
    overrideYml += `    ports:\n      - "${ports}"\n`
    overrideYml += `    volumes:\n      - .:/app\n      - /app/node_modules\n`
    overrideYml += `    environment:\n      - NODE_ENV=development\n`
    overrideYml += `    command: npm run dev\n\n`
  }
  for (const db of databases) {
    const port = (db.config.port as number) || 5432
    overrideYml += `  ${db.label}:\n`
    overrideYml += `    ports:\n      - "${port}:${port}"\n\n`
  }

  // ── .env.example ─────────────────────────────────────────────────────────
  const uniqueVars = [...new Set(allEnvVars)]
  let envExample = `# .env.example — copy to .env and fill in values\n# Generated by FlowOps Container Designer\n\n`

  if (uniqueVars.length > 0) {
    envExample += `# Application\n`
    for (const v of uniqueVars) {
      envExample += `${v}=\n`
    }
    envExample += `\n`
  }

  envExample += `# Docker Compose\nCOMPOSE_PROJECT_NAME=myapp\n`

  // ── Makefile ──────────────────────────────────────────────────────────────
  const projectName = services[0]?.label || 'app'
  const firstService = services[0]?.label || 'web'

  const makefile = `# Makefile — generated by FlowOps Container Designer
.PHONY: up down logs shell ps build restart clean

up:
\tdocker compose up -d

down:
\tdocker compose down

logs:
\tdocker compose logs -f

logs-%:
\tdocker compose logs -f $*

shell:
\tdocker compose exec ${firstService} sh

shell-%:
\tdocker compose exec $* sh

ps:
\tdocker compose ps

build:
\tdocker compose build --no-cache

restart:
\tdocker compose restart

clean:
\tdocker compose down -v --remove-orphans

# Development helpers
dev:
\tdocker compose -f docker-compose.yml -f docker-compose.override.yml up

setup:
\tcp .env.example .env
\t@echo "Edit .env with your values then run: make up"

# Database helpers
db-shell:
\tdocker compose exec ${databases[0]?.label || 'db'} psql -U \$${'{'}POSTGRES_USER:-postgres${'}'} -d \$${'{'}POSTGRES_DB:-appdb${'}'}
`

  return {
    'docker-compose.yml': composeYml,
    'docker-compose.override.yml': overrideYml,
    '.env.example': envExample,
    'Makefile': makefile,
  }
}

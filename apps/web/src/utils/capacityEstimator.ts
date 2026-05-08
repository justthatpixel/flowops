/**
 * capacityEstimator.ts
 *
 * Derives requests/min capacity and headroom from the current infra layout.
 * Uses heuristic throughput models per service type.
 */

import type { InfraComponent } from '@/types/infra'
import type { AwsServiceType } from '@/types/infra'

export interface CapacityResult {
  reqPerMin:       number
  headroom:        number           // safety factor above expected load
  headroomStatus:  'green' | 'amber' | 'red'
  bottleneck:      string | null    // human-readable warning when amber/red
  userCount:       string           // formatted user count label
}

// Throughput model: estimated req/min per vCPU at common workloads
const REQ_PER_VCPU_PER_MIN = 600  // ~10 req/s per vCPU (modest web API)

// CloudFront multiplier — CDN can serve cached assets at 10× the origin rate
const CDN_CACHE_HIT_RATIO = 0.80

function findComponent(components: InfraComponent[], type: AwsServiceType): InfraComponent | undefined {
  return components.find((c) => c.type === type)
}

function findAllComponents(components: InfraComponent[], type: AwsServiceType): InfraComponent[] {
  return components.filter((c) => c.type === type)
}

export function estimateCapacity(components: InfraComponent[]): CapacityResult {
  // ── Compute layer capacity ──────────────────────────────────────────────
  let computeReqPerMin = 0
  const ecsNodes = findAllComponents(components, 'ecs')

  if (ecsNodes.length > 0) {
    for (const ecs of ecsNodes) {
      const vcpu    = (ecs.config?.vcpu    as number) ?? 0.25
      const count   = (ecs.config?.count   as number) ?? 1
      computeReqPerMin += vcpu * count * REQ_PER_VCPU_PER_MIN
    }
  }

  const lambdaNodes = findAllComponents(components, 'lambda')
  if (lambdaNodes.length > 0) {
    // Lambda can burst to ~3000 concurrent → ~180k req/min theoretical max
    // Use a conservative estimate per function
    computeReqPerMin += lambdaNodes.length * 30_000
  }

  // ── CDN boost ──────────────────────────────────────────────────────────
  const hasCdn = !!findComponent(components, 'cloudfront')
  let effectiveReqPerMin = computeReqPerMin

  if (hasCdn && computeReqPerMin > 0) {
    // CDN serves cached traffic directly; origin only sees cache misses
    effectiveReqPerMin = computeReqPerMin / (1 - CDN_CACHE_HIT_RATIO)
  }

  // ── Database bottleneck check ───────────────────────────────────────────
  const rds = findComponent(components, 'rds')
  let bottleneck: string | null = null

  if (rds) {
    const instanceClass = (rds.config?.instanceClass as string) ?? 'db.t3.micro'
    const multiAz       = (rds.config?.multiAz as boolean) ?? false
    const isAurora      = instanceClass.startsWith('db.r6g') || (rds.config?.engine as string)?.includes('aurora')

    // Rough DB connection limit heuristics
    const connectionLimits: Record<string, number> = {
      'db.t3.micro':    85,
      'db.t3.medium':   170,
      'db.r6g.large':   1000,
      'db.r6g.2xlarge': 4000,
    }
    const maxConns = connectionLimits[instanceClass] ?? 200
    const hasCache = !!findComponent(components, 'elasticache')

    // Each concurrent req needs ~1 DB conn on average
    // Estimate concurrent users as reqPerMin / 30 (avg session ~2s)
    const estimatedConns = effectiveReqPerMin / 30

    if (!isAurora && !hasCache && estimatedConns > maxConns * 0.7) {
      bottleneck = 'Add ElastiCache to reduce DB load'
    } else if (!multiAz && effectiveReqPerMin > 6000) {
      bottleneck = 'Enable Multi-AZ for production HA'
    } else if (isAurora && effectiveReqPerMin > 30000 && !hasCache) {
      bottleneck = 'Consider Aurora connection pooling'
    }
  }

  // ── Headroom calculation ────────────────────────────────────────────────
  // Headroom = capacity / expected load. Expected load ≈ 60% of capacity.
  // We report how much spare room exists above P95 load.
  const expectedLoad      = effectiveReqPerMin * 0.6
  const headroom          = expectedLoad > 0 ? effectiveReqPerMin / expectedLoad : 6.0
  const normalizedHeadroom = Math.round(headroom * 10) / 10

  let headroomStatus: 'green' | 'amber' | 'red'
  if (normalizedHeadroom >= 2.0) {
    headroomStatus = 'green'
  } else if (normalizedHeadroom >= 1.5) {
    headroomStatus = 'amber'
    if (!bottleneck) bottleneck = 'Approaching capacity — consider scaling up'
  } else {
    headroomStatus = 'red'
    if (!bottleneck) bottleneck = 'Near saturation — upgrade instance tier'
  }

  // ── User count label ───────────────────────────────────────────────────
  // Rough conversion: 1 concurrent user ≈ 2 req/min average
  const concurrentUsers  = effectiveReqPerMin / 2
  let userCount: string
  if (concurrentUsers >= 1_000_000) {
    userCount = `${(concurrentUsers / 1_000_000).toFixed(1)}M users`
  } else if (concurrentUsers >= 1_000) {
    userCount = `${(concurrentUsers / 1000).toFixed(0)}k users`
  } else {
    userCount = `${Math.round(concurrentUsers)} users`
  }

  return {
    reqPerMin:      Math.round(effectiveReqPerMin),
    headroom:       normalizedHeadroom,
    headroomStatus,
    bottleneck,
    userCount,
  }
}

export function formatReqPerMin(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

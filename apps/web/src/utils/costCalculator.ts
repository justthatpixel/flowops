/**
 * costCalculator.ts
 *
 * Baked AWS on-demand pricing snapshot for us-east-1 (January 2026).
 * All costs are in USD per month unless noted.
 *
 * Formula: hourly_rate × 730 (avg hours/month)
 */

import type { InfraComponent } from '@/types/infra'
import type { AwsServiceType } from '@/types/infra'

// ── Baked pricing snapshot ─────────────────────────────────────────────────

/** Hourly rates for static services */
const HOURLY_RATES: Partial<Record<AwsServiceType, number>> = {
  alb:         0.008,   // Base ALB rate
  nat_gateway: 0.045,   // Per NAT Gateway instance
  cloudfront:  0,       // Usage-based — estimated separately
  waf:         0.006849,// $5/month ÷ 730 h
  shield:      0,       // Shield Standard is free
  route53:     0,       // Flat fee, estimated below
}

/** Flat monthly fees (in USD) */
const FLAT_MONTHLY: Partial<Record<AwsServiceType, number>> = {
  waf:     5,     // $5/mo per Web ACL
  route53: 1.00,  // ~$0.50/hosted zone × 2 for health checks
  s3:      5,     // Rough estimate for standard workloads
}

export interface CostLineItem {
  componentId: string
  componentLabel: string
  serviceType: AwsServiceType
  monthlyUSD: number
  breakdown: string
}

export interface CostSummary {
  totalMonthlyUSD: number
  lineItems: CostLineItem[]
}

function calcEcsCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  const vcpu    = (config.vcpu    as number) ?? 0.25
  const memGb   = (config.memoryGb as number) ?? 0.5
  const count   = (config.count   as number) ?? 1

  // Fargate pricing us-east-1
  const cpuRate = 0.04048  // per vCPU-hour
  const memRate = 0.004445 // per GB-hour
  const hourly  = (vcpu * cpuRate + memGb * memRate) * count
  const monthly = hourly * 730
  return {
    cost: monthly,
    breakdown: `${count}× ${vcpu}vCPU/${memGb}GB · $${hourly.toFixed(4)}/hr`,
  }
}

function calcRdsCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  // Map instance class to hourly rates (approximate us-east-1 on-demand PostgreSQL)
  const rateMap: Record<string, number> = {
    'db.t3.micro':   0.017,
    'db.t3.small':   0.034,
    'db.t3.medium':  0.068,
    'db.t3.large':   0.136,
    'db.r6g.large':  0.24,
    'db.r6g.xlarge': 0.48,
    'db.r6g.2xlarge':0.96,
  }

  const instanceClass = (config.instanceClass as string) ?? 'db.t3.micro'
  const multiAz       = (config.multiAz as boolean) ?? false
  const hourly        = (rateMap[instanceClass] ?? 0.068) * (multiAz ? 2 : 1)
  const monthly       = hourly * 730
  const storage       = 25  // ~25GB default storage $2.30/mo

  return {
    cost: monthly + storage * 0.115,
    breakdown: `${instanceClass}${multiAz ? ' (Multi-AZ)' : ''} · $${hourly.toFixed(3)}/hr + storage`,
  }
}

function calcElasticacheCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  const rateMap: Record<string, number> = {
    'cache.t3.micro':  0.017,
    'cache.t3.small':  0.034,
    'cache.t3.medium': 0.068,
    'cache.r6g.large': 0.166,
    'cache.r6g.xlarge':0.333,
    'cache.r6g.2xlarge':0.665,
  }

  const nodeType = (config.nodeType as string) ?? 'cache.t3.small'
  const nodes    = (config.nodes   as number) ?? 1
  const hourly   = (rateMap[nodeType] ?? 0.034) * nodes
  const monthly  = hourly * 730

  return {
    cost: monthly,
    breakdown: `${nodes}× ${nodeType} · $${hourly.toFixed(3)}/hr`,
  }
}

function calcNatCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  const count   = (config.count as number) ?? 1
  const hourly  = 0.045 * count
  // Assume ~50GB processed/month per NAT at $0.045/GB
  const dataFee = count * 50 * 0.045
  const monthly = hourly * 730 + dataFee

  return {
    cost: monthly,
    breakdown: `${count}× NAT · $${(0.045 * count).toFixed(3)}/hr + data`,
  }
}

function calcLambdaCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  const invocations = (config.invocations as number) ?? 1_000_000
  const durationMs  = (config.durationMs  as number) ?? 200
  const memoryMb    = (config.memoryMb    as number) ?? 512

  const reqCost  = Math.max(0, invocations - 1_000_000) / 1_000_000 * 0.20
  const gbSec    = (memoryMb / 1024) * (durationMs / 1000) * invocations
  const durCost  = Math.max(0, gbSec - 400_000) * 0.0000166667
  const monthly  = reqCost + durCost

  return {
    cost: monthly,
    breakdown: `~${(invocations / 1_000_000).toFixed(1)}M inv · ${memoryMb}MB/${durationMs}ms`,
  }
}

function calcApiGatewayCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  const calls = (config.callsPerMonth as number) ?? 5_000_000
  const cost  = calls / 1_000_000 * 3.50
  return { cost, breakdown: `~${(calls / 1_000_000).toFixed(1)}M calls/mo` }
}

function calcAlbCost(config: Record<string, unknown>): { cost: number; breakdown: string } {
  const hourly  = 0.008
  const lcuCost = (config.lcuPerHour as number ?? 5) * 0.008 * 730
  const monthly = hourly * 730 + lcuCost
  return { cost: monthly, breakdown: `$0.008/hr base + LCU` }
}

// ── Main entry point ───────────────────────────────────────────────────────

export function calculateCost(components: InfraComponent[]): CostSummary {
  const lineItems: CostLineItem[] = []

  for (const comp of components) {
    const svcType = comp.type as AwsServiceType
    let cost = 0
    let breakdown = ''

    switch (svcType) {
      case 'ecs':
        ;({ cost, breakdown } = calcEcsCost(comp.config ?? {}))
        break
      case 'rds':
        ;({ cost, breakdown } = calcRdsCost(comp.config ?? {}))
        break
      case 'elasticache':
        ;({ cost, breakdown } = calcElasticacheCost(comp.config ?? {}))
        break
      case 'nat_gateway':
        ;({ cost, breakdown } = calcNatCost(comp.config ?? {}))
        break
      case 'lambda':
        ;({ cost, breakdown } = calcLambdaCost(comp.config ?? {}))
        break
      case 'api_gateway':
        ;({ cost, breakdown } = calcApiGatewayCost(comp.config ?? {}))
        break
      case 'alb':
        ;({ cost, breakdown } = calcAlbCost(comp.config ?? {}))
        break
      default: {
        const flat = FLAT_MONTHLY[svcType]
        if (flat) {
          cost = flat
          breakdown = `flat fee`
        } else {
          const hourly = HOURLY_RATES[svcType] ?? 0
          cost = hourly * 730
          breakdown = hourly > 0 ? `$${hourly}/hr` : 'included / usage-based'
        }
      }
    }

    lineItems.push({
      componentId:    comp.id,
      componentLabel: comp.label,
      serviceType:    svcType,
      monthlyUSD:     Math.round(cost * 100) / 100,
      breakdown,
    })
  }

  const totalMonthlyUSD =
    Math.round(lineItems.reduce((s, l) => s + l.monthlyUSD, 0) * 100) / 100

  return { totalMonthlyUSD, lineItems }
}

export function formatCostShort(usd: number): string {
  if (usd >= 10_000) return `$${(usd / 1000).toFixed(0)}k`
  if (usd >= 1_000)  return `$${(usd / 1000).toFixed(1)}k`
  return `$${usd.toFixed(0)}`
}

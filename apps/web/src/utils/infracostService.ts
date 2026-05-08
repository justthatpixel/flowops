/**
 * infracostService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side Infracost-style breakdown (Phase 7).
 *
 * Produces a rich per-component cost analysis with:
 *   • Monthly + annual projections
 *   • Cost drivers (what makes a service expensive)
 *   • Actionable optimisation suggestions with estimated savings
 *   • Savings Plan vs On-Demand comparison
 *
 * All figures use the same baked-in us-east-1 on-demand pricing as
 * costCalculator.ts.  No external API calls are made.
 */

import type { InfraComponent }    from '@/types/infra'
import { calculateCost }          from './costCalculator'
import { formatBudgetLabel }      from './budgetChecker'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CostLineItem {
  componentId:   string
  label:         string
  serviceType:   string
  monthlyCost:   number
  annualCost:    number
  pctOfTotal:    number           // 0–100
  drivers:       string[]         // e.g. ["4 vCPU × $0.04/hr", "Multi-AZ = 2× RDS cost"]
  suggestions:   OptimisationHint[]
}

export interface OptimisationHint {
  title:       string
  description: string
  savingsPct:  number   // estimated % saving if applied
  effort:      'low' | 'medium' | 'high'
}

export interface SavingsPlanRow {
  label:     string    // e.g. "Compute Savings Plan (1yr)"
  discount:  number    // percentage discount
  monthly:   number    // discounted monthly
  annual:    number    // discounted annual
}

export interface CostBreakdown {
  totalMonthly:    number
  totalAnnual:     number
  lineItems:       CostLineItem[]
  savingsPlans:    SavingsPlanRow[]
  topSuggestion:   OptimisationHint | null
}

// ─── Per-service cost drivers + hints ────────────────────────────────────────

function getDriversAndHints(
  c: InfraComponent,
  monthlyCost: number,
): { drivers: string[]; suggestions: OptimisationHint[] } {
  const drivers:     string[]           = []
  const suggestions: OptimisationHint[] = []

  switch (c.type) {
    case 'ecs': {
      const vcpu    = (c.config.vcpu    as number | undefined) ?? 0.5
      const mem     = (c.config.memory  as number | undefined) ?? 1
      const count   = (c.config.count   as number | undefined) ?? 1
      drivers.push(
        `${count} task${count !== 1 ? 's' : ''} × ${vcpu} vCPU @ $0.04048/vCPU·hr`,
        `${count} task${count !== 1 ? 's' : ''} × ${mem} GB mem @ $0.004445/GB·hr`,
      )
      suggestions.push({
        title:       'Switch to Compute Savings Plan',
        description: '1-year Compute Savings Plan covers ECS Fargate for up to 55% off on-demand.',
        savingsPct:  55,
        effort:      'low',
      })
      if (count > 1) {
        suggestions.push({
          title:       'Use Fargate Spot for non-critical tasks',
          description: 'Fargate Spot tasks cost ~70% less. Suitable for async workloads that tolerate interruption.',
          savingsPct:  70,
          effort:      'medium',
        })
      }
      break
    }

    case 'rds': {
      const cls   = (c.config.instanceClass  as string | undefined) ?? 'db.t3.medium'
      const multi = (c.config.multiAz        as boolean | undefined) ?? false
      drivers.push(
        `Instance class: ${cls}`,
        ...(multi ? ['Multi-AZ enabled (2× hourly rate)'] : []),
        'Automated backups: 7-day retention',
      )
      if (multi) {
        suggestions.push({
          title:       'Disable Multi-AZ in non-prod',
          description: 'Multi-AZ doubles RDS hourly cost. Dev/staging environments rarely need it.',
          savingsPct:  45,
          effort:      'low',
        })
      }
      suggestions.push({
        title:       'Reserved Instance (1yr, no upfront)',
        description: 'RDS Reserved Instances save ~30% over on-demand with no upfront commitment.',
        savingsPct:  30,
        effort:      'low',
      })
      const isLarge = cls.includes('db.r') || cls.includes('db.m5.xlarge') || cls.includes('db.m5.2x')
      if (isLarge) {
        suggestions.push({
          title:       'Consider Aurora Serverless v2',
          description: 'Aurora Serverless v2 scales to zero ACUs in dev — eliminates idle cost.',
          savingsPct:  60,
          effort:      'medium',
        })
      }
      break
    }

    case 'elasticache': {
      const nodeType = (c.config.nodeType as string | undefined) ?? 'cache.t3.micro'
      const nodes    = (c.config.numNodes as number | undefined) ?? 1
      drivers.push(
        `${nodes} node${nodes !== 1 ? 's' : ''} × ${nodeType}`,
        'Running 730 hr/mo',
      )
      suggestions.push({
        title:       'ElastiCache Serverless',
        description: 'Pay per ECU consumed instead of provisioned nodes — ideal for variable traffic.',
        savingsPct:  40,
        effort:      'medium',
      })
      if (nodes > 1) {
        suggestions.push({
          title:       'Reduce replica count in dev',
          description: `${nodes} nodes for dev is over-provisioned. 1 node is sufficient for non-prod.`,
          savingsPct:  Math.round((1 - 1 / nodes) * 100),
          effort:      'low',
        })
      }
      break
    }

    case 'nat_gateway': {
      drivers.push(
        '$0.045/hr per gateway (730 hr/mo)',
        'Data processing: ~$0.045/GB outbound',
      )
      suggestions.push({
        title:       'VPC Endpoints for S3 / DynamoDB',
        description: 'Traffic to S3 and DynamoDB via Gateway VPC Endpoints is free — bypasses NAT.',
        savingsPct:  30,
        effort:      'low',
      })
      suggestions.push({
        title:       'Share NAT Gateway across AZs in dev',
        description: 'Use a single NAT Gateway in dev instead of one per AZ.',
        savingsPct:  50,
        effort:      'low',
      })
      break
    }

    case 'alb': {
      drivers.push(
        '$0.008/LCU·hr (Load Balancer Capacity Units)',
        '$0.0225/hr base ($16.4/mo)',
      )
      suggestions.push({
        title:       'Right-size LCU allocation',
        description: 'Monitor LCU utilisation in CloudWatch. Over-provisioned ALBs are rare but check your rules count.',
        savingsPct:  15,
        effort:      'low',
      })
      break
    }

    case 'lambda': {
      const mem = (c.config.memory as number | undefined) ?? 128
      drivers.push(
        `${mem} MB memory allocation`,
        '$0.20 per 1M invocations',
        '$0.0000166667 per GB·second',
      )
      suggestions.push({
        title:       'Use ARM64 (Graviton2) architecture',
        description: 'Lambda on arm64 is ~20% cheaper and ~19% faster than x86_64 for most workloads.',
        savingsPct:  20,
        effort:      'low',
      })
      suggestions.push({
        title:       'Right-size memory with Lambda Power Tuning',
        description: 'AWS Lambda Power Tuning tool finds the optimal memory for cost + performance.',
        savingsPct:  25,
        effort:      'medium',
      })
      break
    }

    case 'cloudfront': {
      drivers.push(
        '~$0.0085/GB data transfer (Price Class All)',
        '$0.0100 per 10k HTTP requests',
      )
      suggestions.push({
        title:       'Switch to Price Class 100 (US/EU only)',
        description: 'Price Class 100 restricts to US/EU edge nodes but cuts CDN cost by ~40%.',
        savingsPct:  40,
        effort:      'low',
      })
      suggestions.push({
        title:       'Increase cache TTL',
        description: 'Higher cache hit ratios reduce origin fetches and CDN data-transfer charges.',
        savingsPct:  20,
        effort:      'medium',
      })
      break
    }

    case 's3': {
      drivers.push(
        '$0.023/GB for Standard storage',
        '$0.005 per 1k PUT requests',
      )
      suggestions.push({
        title:       'S3 Intelligent-Tiering',
        description: 'Automatically moves objects between access tiers. Saves 40–68% on infrequently accessed data.',
        savingsPct:  45,
        effort:      'low',
      })
      suggestions.push({
        title:       'S3 Lifecycle rules',
        description: 'Archive objects older than 90 days to S3 Glacier Instant Retrieval ($0.004/GB vs $0.023/GB).',
        savingsPct:  82,
        effort:      'low',
      })
      break
    }

    case 'dynamodb': {
      const mode = (c.config.billingMode as string | undefined) ?? 'on-demand'
      drivers.push(
        mode === 'provisioned'
          ? `Provisioned: ${c.config.rcu ?? 5} RCU + ${c.config.wcu ?? 5} WCU`
          : 'On-Demand: $1.25 per 1M WRU, $0.25 per 1M RRU',
      )
      if (mode === 'on-demand') {
        suggestions.push({
          title:       'Switch to Provisioned + Auto Scaling',
          description: 'For predictable workloads, provisioned capacity with auto-scaling is 60% cheaper than on-demand.',
          savingsPct:  60,
          effort:      'medium',
        })
      }
      suggestions.push({
        title:       'DynamoDB Standard-IA table class',
        description: 'Reduces storage cost by 60% for tables with infrequent access patterns.',
        savingsPct:  60,
        effort:      'low',
      })
      break
    }

    case 'sqs': {
      drivers.push(
        'First 1M requests/mo free',
        '$0.40 per million requests after free tier',
      )
      suggestions.push({
        title:       'Batch messages (up to 10 per request)',
        description: 'SQS is priced per API call, not per message. Batching 10 messages cuts cost 10×.',
        savingsPct:  90,
        effort:      'low',
      })
      break
    }

    case 'api_gateway': {
      const apiType = (c.config.apiType as string | undefined) ?? 'REST'
      drivers.push(
        apiType === 'HTTP'
          ? '$1.00 per million HTTP API calls'
          : '$3.50 per million REST API calls',
      )
      if (apiType !== 'HTTP') {
        suggestions.push({
          title:       'Switch to HTTP API',
          description: 'HTTP API (v2) is 70% cheaper than REST API and has lower latency.',
          savingsPct:  70,
          effort:      'medium',
        })
      }
      break
    }

    case 'waf': {
      drivers.push(
        '$5/mo per WebACL',
        '$1/mo per managed rule group',
        '$0.60 per million requests',
      )
      suggestions.push({
        title:       'Use AWS Managed Rule Groups',
        description: 'AWS Managed Rules cover OWASP Top 10 at $1/mo vs building custom rules.',
        savingsPct:  30,
        effort:      'low',
      })
      break
    }

    case 'shield': {
      drivers.push(
        'Shield Advanced: $3,000/mo (org-level subscription)',
        'DDoS cost protection included',
      )
      suggestions.push({
        title:       'Use Shield Standard + WAF instead',
        description: 'Shield Standard is free and covers L3/L4 DDoS. WAF handles L7. Consider Advanced only for critical workloads.',
        savingsPct:  100,
        effort:      'medium',
      })
      break
    }

    case 'route53': {
      drivers.push(
        '$0.50/mo per hosted zone',
        '$0.40 per million queries',
      )
      // Route53 is typically already very cheap
      break
    }
  }

  return { drivers, suggestions }
}

// ─── Main breakdown function ──────────────────────────────────────────────────

export function getDetailedBreakdown(components: InfraComponent[]): CostBreakdown {
  const costSummary   = calculateCost(components)
  const totalMonthly  = costSummary.totalMonthlyUSD
  const totalAnnual   = totalMonthly * 12

  const lineItems: CostLineItem[] = costSummary.lineItems.map((item) => {
    const component = components.find((c) => c.id === item.componentId)
    const { drivers, suggestions } = component
      ? getDriversAndHints(component, item.monthlyUSD)
      : { drivers: [], suggestions: [] }

    return {
      componentId: item.componentId,
      label:       item.componentLabel,
      serviceType: item.serviceType,
      monthlyCost: item.monthlyUSD,
      annualCost:  item.monthlyUSD * 12,
      pctOfTotal:  totalMonthly > 0
        ? Math.round((item.monthlyUSD / totalMonthly) * 1000) / 10
        : 0,
      drivers,
      suggestions,
    }
  })

  // Sort by cost descending
  lineItems.sort((a, b) => b.monthlyCost - a.monthlyCost)

  // ── Savings Plans ────────────────────────────────────────────────────────────
  // Compute-eligible services: ECS Fargate, Lambda, EC2 (not in our set)
  const computeCost = lineItems
    .filter((l) => l.serviceType === 'ecs' || l.serviceType === 'lambda')
    .reduce((s, l) => s + l.monthlyCost, 0)

  const savingsPlans: SavingsPlanRow[] = []
  if (computeCost > 0) {
    savingsPlans.push({
      label:    'Compute Savings Plan (1yr, no upfront)',
      discount: 42,
      monthly:  Math.round(totalMonthly - computeCost * 0.42),
      annual:   Math.round((totalMonthly - computeCost * 0.42) * 12),
    })
    savingsPlans.push({
      label:    'Compute Savings Plan (3yr, no upfront)',
      discount: 54,
      monthly:  Math.round(totalMonthly - computeCost * 0.54),
      annual:   Math.round((totalMonthly - computeCost * 0.54) * 12),
    })
  }

  // ── Top suggestion ───────────────────────────────────────────────────────────
  let topSuggestion: OptimisationHint | null = null
  let bestSavings = 0
  for (const item of lineItems) {
    for (const hint of item.suggestions) {
      const absSaving = item.monthlyCost * (hint.savingsPct / 100)
      if (absSaving > bestSavings) {
        bestSavings    = absSaving
        topSuggestion  = hint
      }
    }
  }

  return { totalMonthly, totalAnnual, lineItems, savingsPlans, topSuggestion }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export { formatBudgetLabel }

export function formatAnnual(monthly: number): string {
  return formatBudgetLabel(monthly * 12) + '/yr'
}

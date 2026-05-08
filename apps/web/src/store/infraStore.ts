/**
 * infraStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central Zustand store for the Infrastructure Designer (Epic 2).
 *
 * RESPONSIBILITIES
 *  • Holds the active canvas state: components, edges, VPC/subnet containers
 *  • Tracks which template (web-app, serverless, …) and scale tier (0–4) are
 *    currently shown
 *  • Recomputes liveStats (cost, capacity, headroom) whenever components change
 *  • Exposes actions consumed by InfraDesigner, TemplatePicker, ScaleSlider,
 *    InfraConfigPanel, and InfraCanvas
 *
 * DATA FLOW
 *  setTemplate / setScaleTier
 *    → getTierLayout(templateId, tier)   [data/infra-templates/index.ts]
 *    → computeLiveStats(components)      [utils/costCalculator + capacityEstimator]
 *    → set(state)
 *
 *  updateComponentConfig (Phase 5)
 *    → patches a single component's config in-place
 *    → recomputes liveStats so StatsBar reflects the edit immediately
 *
 * SCALE_TIERS is also exported so UI components (ScaleSlider, StatsBar,
 * InfraDesigner breadcrumb) can map a tier index to its label / userCount.
 */

import { create } from 'zustand'
import type {
  InfraComponent,
  InfraEdge,
  InfraContainer,
  InfraSnapshot,
  ScaleTierIndex,
  ArchTemplateId,
  TerraformFiles,
  ScaleTierDef,
  AwsServiceType,
} from '@/types/infra'
import { getTierLayout } from '@/data/infra-templates'
import { calculateCost, formatCostShort } from '@/utils/costCalculator'
import { estimateCapacity, formatReqPerMin } from '@/utils/capacityEstimator'
import { AWS_NODE_CONFIG } from '@/lib/awsNodeConfig'

// ─── Default configs for freshly-dropped components ──────────────────────────

function getDefaultConfig(type: AwsServiceType): Record<string, unknown> {
  switch (type) {
    // ── Compute ──────────────────────────────────────────────────────────
    case 'ecs':               return { vcpu: 0.5, memoryGb: 1, count: 1, desiredCount: 1, maxCount: 3, region: 'us-east-1' }
    case 'ecs_task':          return { cpu: 256, memory: 512, image: '', region: 'us-east-1' }
    case 'ec2_asg':           return { instanceType: 't3.medium', minSize: 1, maxSize: 4, desiredCapacity: 2, region: 'us-east-1' }
    case 'lambda':            return { memory: 128, timeout: 30, architecture: 'x86_64', runtime: 'nodejs20.x', region: 'us-east-1' }
    case 'elastic_beanstalk': return { platform: 'node.js', instanceType: 't3.small', minInstances: 1, maxInstances: 4, region: 'us-east-1' }
    // ── Networking ──────────────────────────────────────────────────────────
    case 'vpc':               return { cidr: '10.0.0.0/16', enableDnsHostnames: true, region: 'us-east-1' }
    case 'public_subnet':     return { cidr: '10.0.1.0/24', availabilityZone: 'us-east-1a', region: 'us-east-1' }
    case 'private_subnet':    return { cidr: '10.0.2.0/24', availabilityZone: 'us-east-1a', region: 'us-east-1' }
    case 'alb':               return { scheme: 'internet-facing', port: 443, region: 'us-east-1' }
    case 'nat_gateway':       return { count: 1, region: 'us-east-1' }
    case 'route53':           return { routingPolicy: 'simple', healthCheck: false, region: 'us-east-1' }
    case 'cloudfront':        return { priceClass: 'PriceClass_100', compress: true, region: 'us-east-1' }
    case 'api_gateway':       return { apiType: 'HTTP', throttleLimit: 10000, region: 'us-east-1' }
    // ── Database ──────────────────────────────────────────────────────────
    case 'rds':               return { engine: 'postgres', instanceClass: 'db.t3.micro', multiAz: false, encrypted: true, storageGb: 20, publiclyAccessible: false, region: 'us-east-1' }
    case 'rds_mysql':         return { engine: 'mysql', instanceClass: 'db.t3.micro', multiAz: false, encrypted: true, storageGb: 20, publiclyAccessible: false, region: 'us-east-1' }
    case 'aurora_serverless': return { engine: 'aurora-postgresql', minAcu: 0.5, maxAcu: 16, region: 'us-east-1' }
    case 'aurora_global':     return { engine: 'aurora-postgresql', instanceClass: 'db.r5.large', regions: ['us-east-1', 'eu-west-1'] }
    case 'dynamodb':          return { billingMode: 'on-demand', rcu: 5, wcu: 5, region: 'us-east-1' }
    case 'elasticache':       return { nodeType: 'cache.t3.micro', numNodes: 1, atRestEncryption: true, region: 'us-east-1' }
    case 'elasticache_memcached': return { nodeType: 'cache.t3.micro', numNodes: 2, region: 'us-east-1' }
    // ── Storage ──────────────────────────────────────────────────────────
    case 's3':                return { storageClass: 'STANDARD', versioning: false, sse: true, blockPublicAccess: true, region: 'us-east-1' }
    case 'efs':               return { performanceMode: 'generalPurpose', throughputMode: 'bursting', encrypted: true, region: 'us-east-1' }
    case 'ecr':               return { imageScanOnPush: true, encryptionType: 'AES256', region: 'us-east-1' }
    // ── Security ──────────────────────────────────────────────────────────
    case 'iam_role':          return { assumedBy: 'lambda.amazonaws.com', managedPolicies: [], region: 'us-east-1' }
    case 'waf':               return { ruleGroupCount: 1, region: 'us-east-1' }
    case 'shield':            return { plan: 'standard', region: 'us-east-1' }
    case 'shield_advanced':   return { plan: 'advanced', region: 'us-east-1' }
    case 'security_group':    return { vpcId: '', ingressRules: [], egressRules: [], region: 'us-east-1' }
    case 'secrets_manager':   return { rotationEnabled: false, rotationDays: 30, kmsKeyId: 'aws/secretsmanager', region: 'us-east-1' }
    case 'kms':               return { keySpec: 'SYMMETRIC_DEFAULT', keyUsage: 'ENCRYPT_DECRYPT', multiRegion: false, region: 'us-east-1' }
    // ── Messaging ──────────────────────────────────────────────────────────
    case 'sqs':               return { queueType: 'Standard', visibilityTimeout: 30, region: 'us-east-1' }
    case 'sns':               return { protocol: 'https', fifo: false, region: 'us-east-1' }
    case 'eventbridge':       return { scheduleExpression: 'rate(5 minutes)', state: 'ENABLED', region: 'us-east-1' }
    case 'kinesis':           return { shardCount: 1, retentionPeriod: 24, region: 'us-east-1' }
    // ── Observability ──────────────────────────────────────────────────────
    case 'cloudwatch_dashboard': return { period: 300, region: 'us-east-1' }
    case 'cloudwatch_alarm':  return { threshold: 80, evaluationPeriods: 2, comparisonOperator: 'GreaterThanThreshold', region: 'us-east-1' }
    case 'xray':              return { samplingRate: 5, region: 'us-east-1' }
    // ── Custom ──────────────────────────────────────────────────────────
    case 'custom':            return { name: 'External Service', endpoint: '', type: 'External API', region: 'us-east-1' }
    default:                  return { region: 'us-east-1' }
  }
}

// ─── Scale tier metadata ──────────────────────────────────────────────────────
// These are reference values used for the breadcrumb and SliderScale labels.
// The actual live cost/capacity shown in StatsBar comes from computeLiveStats().
export const SCALE_TIERS: ScaleTierDef[] = [
  { index: 0, label: 'Dev / Hobby',   userCount: '10 users',   costPerMonth: 18,   reqPerMin: 120,    headroom: 6.0, headroomStatus: 'green' },
  { index: 1, label: 'Early Startup', userCount: '1k users',   costPerMonth: 120,  reqPerMin: 1200,   headroom: 2.4, headroomStatus: 'green' },
  { index: 2, label: 'Growing',       userCount: '10k users',  costPerMonth: 340,  reqPerMin: 6000,   headroom: 2.0, headroomStatus: 'green' },
  { index: 3, label: 'Scaling',       userCount: '100k users', costPerMonth: 1240, reqPerMin: 30000,  headroom: 1.8, headroomStatus: 'amber', bottleneck: 'Consider Aurora connection pooling' },
  { index: 4, label: 'Enterprise',    userCount: '1M users',   costPerMonth: 8200, reqPerMin: 200000, headroom: 1.5, headroomStatus: 'amber', bottleneck: 'Shard or add regions' },
]

// ─── LiveStats ────────────────────────────────────────────────────────────────
// Computed from the current component list on every state change.
// Displayed in StatsBar and ScaleSlider.
export interface LiveStats {
  costMonthly:    number                    // raw USD/mo (for formatting)
  costLabel:      string                    // e.g. "$1.2k"
  reqPerMin:      number                    // raw requests/min
  reqLabel:       string                    // e.g. "30k"
  headroom:       number                    // safety factor above expected load
  headroomStatus: 'green' | 'amber' | 'red'
  bottleneck:     string | null             // human-readable warning or null
  userCount:      string                    // e.g. "10k users"
}

/** Runs both the cost and capacity estimators and merges into one object. */
function computeLiveStats(components: InfraComponent[]): LiveStats {
  const cost     = calculateCost(components)
  const capacity = estimateCapacity(components)
  return {
    costMonthly:    cost.totalMonthlyUSD,
    costLabel:      formatCostShort(cost.totalMonthlyUSD),
    reqPerMin:      capacity.reqPerMin,
    reqLabel:       formatReqPerMin(capacity.reqPerMin),
    headroom:       capacity.headroom,
    headroomStatus: capacity.headroomStatus,
    bottleneck:     capacity.bottleneck,
    userCount:      capacity.userCount,
  }
}

// ─── Initial state ────────────────────────────────────────────────────────────
const DEFAULT_TEMPLATE: ArchTemplateId = 'web-app'
const DEFAULT_TIER: ScaleTierIndex     = 1
const _initialLayout = getTierLayout(DEFAULT_TEMPLATE, DEFAULT_TIER)

// ─── Store interface ──────────────────────────────────────────────────────────
interface InfraStore {
  // ── Canvas state ──────────────────────────────────────────────────────────
  isOpen:              boolean              // whether InfraDesigner overlay is visible
  deployNodeId:        string | null        // pipeline node that triggered the designer
  templateId:          ArchTemplateId       // active architecture template
  scaleTier:           ScaleTierIndex       // active tier (0 = dev … 4 = enterprise)
  components:          InfraComponent[]     // AWS service nodes on the canvas
  edges:               InfraEdge[]          // connections between components
  containers:          InfraContainer[]     // VPC / subnet background overlays
  terraform:           TerraformFiles | null// generated HCL (Phase 6)
  selectedComponentId: string | null        // which component has the config panel open
  liveStats:           LiveStats            // live-computed cost + capacity
  /**
   * Phase 7: per-deploy-node snapshots saved whenever the designer is closed.
   * Key = deployNodeId (pipeline node ID), value = lightweight summary.
   * Used by: pipeline BaseNode (badge), DeployConfigForm (summary card).
   */
  infraSnapshots:      Record<string, InfraSnapshot>

  // ── Actions ───────────────────────────────────────────────────────────────
  /** Open the designer from a pipeline Deploy node. Resets to web-app / tier 1. */
  openDesigner:         (deployNodeId: string) => void
  /**
   * Close the designer.  If the canvas has components, saves an InfraSnapshot
   * keyed by deployNodeId so the pipeline node can show an infra badge.
   */
  closeDesigner:        () => void
  /** Switch scale tier; reloads the layout for the current template. */
  setScaleTier:         (tier: ScaleTierIndex) => void
  /** Switch architecture template; reloads layout at the current tier. */
  setTemplate:          (id: ArchTemplateId) => void
  /** Bulk-replace canvas state (used by AI / Terraform import). */
  setComponents:        (components: InfraComponent[], edges: InfraEdge[], containers?: InfraContainer[]) => void
  /**
   * Phase 5: patch a single component's config object.
   * Merges `patch` into the existing config so callers only send changed keys.
   * Immediately recomputes liveStats so StatsBar reflects the edit.
   */
  updateComponentConfig:(id: string, patch: Record<string, unknown>) => void
  /** Store generated Terraform HCL (Phase 6). */
  setTerraform:         (files: TerraformFiles) => void
  /** Open or close the right-side config panel for a component. */
  selectComponent:      (id: string | null) => void

  // ── Canvas mutation actions (sidebar drag-drop + canvas interactions) ─────
  /** ID of the component most recently dropped onto the canvas (cleared after pulse). */
  newlyDroppedId:       string | null
  /** Clear the newlyDroppedId after the pulse animation completes. */
  clearNewlyDropped:    () => void
  /** Drop a new AWS service onto the canvas at the given flow position. */
  addComponent:         (type: AwsServiceType, position: { x: number; y: number }) => void
  /** Remove a component and any edges that reference it. */
  removeComponent:      (id: string) => void
  /** Persist a node's position after it is dragged on the canvas. */
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void
  /** Rename a component's display label. */
  updateComponentLabel: (id: string, label: string) => void
  /** Add a directed edge between two components. */
  addEdge:              (source: string, target: string) => void
  /** Remove an edge by ID. */
  removeEdge:           (id: string) => void
}

// ─── Store implementation ─────────────────────────────────────────────────────
export const useInfraStore = create<InfraStore>((set, get) => ({
  isOpen:              false,
  deployNodeId:        null,
  newlyDroppedId:      null,
  templateId:          DEFAULT_TEMPLATE,
  scaleTier:           DEFAULT_TIER,
  components:          _initialLayout.components,
  edges:               _initialLayout.edges,
  containers:          _initialLayout.containers ?? [],
  terraform:           null,
  selectedComponentId: null,
  liveStats:           computeLiveStats(_initialLayout.components),
  infraSnapshots:      {},

  openDesigner: (deployNodeId) => {
    const layout = getTierLayout('web-app', 1)
    set({
      isOpen:              true,
      deployNodeId,
      scaleTier:           1,
      templateId:          'web-app',
      components:          layout.components,
      edges:               layout.edges,
      containers:          layout.containers ?? [],
      terraform:           null,
      selectedComponentId: null,
      liveStats:           computeLiveStats(layout.components),
    })
  },

  closeDesigner: () => {
    const { deployNodeId, templateId, scaleTier, components, liveStats, terraform } = get()
    // Save a snapshot so the pipeline node can show an infra badge
    if (deployNodeId && components.length > 0) {
      const snapshot: InfraSnapshot = {
        templateId,
        scaleTier,
        componentCount: components.length,
        costLabel:       liveStats.costLabel,
        reqLabel:        liveStats.reqLabel,
        headroomStatus:  liveStats.headroomStatus,
        hasTerraform:    terraform !== null,
        savedAt:         Date.now(),
      }
      set((state) => ({
        isOpen:       false,
        deployNodeId: null,
        infraSnapshots: { ...state.infraSnapshots, [deployNodeId]: snapshot },
      }))
    } else {
      set({ isOpen: false, deployNodeId: null })
    }
  },

  setScaleTier: (tier) => {
    const { templateId } = get()
    const layout = getTierLayout(templateId, tier)
    set({
      scaleTier:           tier,
      components:          layout.components,
      edges:               layout.edges,
      containers:          layout.containers ?? [],
      terraform:           null,
      selectedComponentId: null,
      liveStats:           computeLiveStats(layout.components),
    })
  },

  setTemplate: (id) => {
    const { scaleTier } = get()
    const layout = getTierLayout(id, scaleTier)
    set({
      templateId:          id,
      components:          layout.components,
      edges:               layout.edges,
      containers:          layout.containers ?? [],
      terraform:           null,
      selectedComponentId: null,
      liveStats:           computeLiveStats(layout.components),
    })
  },

  // Phase 5: merge `patch` into the target component's config,
  // then recompute live stats so cost/capacity reflects the change immediately.
  updateComponentConfig: (id, patch) => {
    const { components } = get()
    const updated = components.map((c) =>
      c.id === id ? { ...c, config: { ...c.config, ...patch } } : c
    )
    set({ components: updated, liveStats: computeLiveStats(updated) })
  },

  setComponents: (components, edges, containers) =>
    set({
      components,
      edges,
      containers: containers ?? [],
      liveStats:  computeLiveStats(components),
    }),

  setTerraform: (files) => set({ terraform: files }),

  selectComponent: (id) => set({ selectedComponentId: id }),

  clearNewlyDropped: () => set({ newlyDroppedId: null }),

  addComponent: (type, position) => {
    const { components } = get()
    const label = AWS_NODE_CONFIG[type]?.serviceLabel ?? type
    const id    = `${type}-${Date.now()}`
    const newComp: InfraComponent = {
      id,
      type,
      label,
      position,
      config: getDefaultConfig(type),
    }
    const updated = [...components, newComp]
    set({
      components:     updated,
      liveStats:      computeLiveStats(updated),
      newlyDroppedId: id,
      // Auto-select the newly dropped node so the config panel opens
      selectedComponentId: id,
    })
  },

  removeComponent: (id) => {
    const { components, edges, selectedComponentId } = get()
    const updated      = components.filter((c) => c.id !== id)
    const updatedEdges = edges.filter((e) => e.source !== id && e.target !== id)
    set({
      components:          updated,
      edges:               updatedEdges,
      liveStats:           computeLiveStats(updated),
      selectedComponentId: selectedComponentId === id ? null : selectedComponentId,
    })
  },

  updateComponentPosition: (id, position) => {
    const { components } = get()
    const updated = components.map((c) => c.id === id ? { ...c, position } : c)
    set({ components: updated })
    // No liveStats recompute needed — position doesn't affect cost
  },

  updateComponentLabel: (id, label) => {
    const { components } = get()
    const updated = components.map((c) => c.id === id ? { ...c, label } : c)
    set({ components: updated })
  },

  addEdge: (source, target) => {
    const { edges } = get()
    // Prevent duplicate edges
    const exists = edges.some((e) => e.source === source && e.target === target)
    if (exists) return
    const newEdge: InfraEdge = { id: `edge-${source}-${target}-${Date.now()}`, source, target }
    set({ edges: [...edges, newEdge] })
  },

  removeEdge: (id) => {
    const { edges } = get()
    set({ edges: edges.filter((e) => e.id !== id) })
  },
}))

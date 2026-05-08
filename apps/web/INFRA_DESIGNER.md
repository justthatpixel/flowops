# Infrastructure Designer — Architecture Guide

> Epic 2 of FlowOps AI.  A full-screen visual AWS architecture canvas that slides
> up when a Deploy node is clicked in the pipeline editor.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [File Map](#2-file-map)
3. [Data Flow Diagram](#3-data-flow-diagram)
4. [Layer-by-Layer Breakdown](#4-layer-by-layer-breakdown)
   - [Types](#41-types--typesinfrats)
   - [Store](#42-store--storeinfrасторets)
   - [Data / Templates](#43-data--templates)
   - [Utils — Cost & Capacity](#44-utils--cost--capacity)
   - [Lib — Node Config](#45-lib--awsnodeconfigts)
   - [Components](#46-components)
5. [How Templates Work](#5-how-templates-work)
6. [Live Stats Pipeline](#6-live-stats-pipeline)
7. [The Config Panel + Form System](#7-the-config-panel--form-system)
8. [The "Black Flash" Fix](#8-the-black-flash-fix)
9. [Adding a New Template](#9-adding-a-new-template)
10. [Adding a New AWS Service Type](#10-adding-a-new-aws-service-type)
11. [Phase Roadmap](#11-phase-roadmap)

---

## 1. Feature Overview

The Infrastructure Designer lets users:

- **Browse** pre-built AWS architecture templates (Web App, Serverless, Microservices, API + Workers, ML Inference, Static + API)
- **Scale** from Dev/Hobby (10 users) → Enterprise (1 M users) with one click
- **Edit** individual service settings (instance class, memory, count, etc.) via a right-side config panel
- **See live cost + capacity estimates** that update instantly as they edit any field

---

## 2. File Map

```
apps/web/src/
│
├── types/
│   └── infra.ts                   ← All shared TypeScript types for Epic 2
│
├── store/
│   └── infraStore.ts              ← Zustand store — single source of truth
│
├── data/
│   └── infra-templates/
│       ├── index.ts               ← TEMPLATE_REGISTRY + getTierLayout()
│       ├── webApp.ts              ← ECS + ALB + RDS layouts, 5 tiers
│       ├── serverless.ts          ← API GW + Lambda + DynamoDB, 5 tiers
│       ├── microservices.ts       ← Multi-ECS + SQS event bus, 5 tiers
│       ├── apiWorkers.ts          ← API Server → SQS → Workers, 5 tiers
│       ├── mlInference.ts         ← Lambda sync + ECS GPU batch, 5 tiers
│       └── staticApi.ts           ← CloudFront → S3 + API GW → Lambda, 5 tiers
│
├── utils/
│   ├── costCalculator.ts          ← Per-component USD/mo calculator
│   └── capacityEstimator.ts       ← req/min + headroom estimator
│
├── lib/
│   └── awsNodeConfig.ts           ← Icon URL + color + label per service type
│
├── assets/
│   └── aws-icons/                 ← 14 AWS SVG icons (Vite → URL strings)
│       ├── alb.svg
│       ├── ecs.svg
│       ├── rds.svg
│       ├── elasticache.svg
│       ├── nat_gateway.svg
│       ├── cloudfront.svg
│       ├── waf.svg
│       ├── shield.svg
│       ├── s3.svg
│       ├── api_gateway.svg
│       ├── lambda.svg
│       ├── sqs.svg
│       ├── dynamodb.svg
│       └── route53.svg
│
└── components/
    └── infra/
        ├── InfraDesigner.tsx      ← Full-screen overlay shell (Framer Motion slide-up)
        ├── InfraCanvas.tsx        ← ReactFlow canvas (nodes + edges + containers)
        ├── InfraConfigPanel.tsx   ← 300px right-side config panel (absolute overlay)
        ├── InfraComponentForm.tsx ← Per-service config forms (all 14 types)
        ├── StatsBar.tsx           ← Cost / capacity / headroom strip
        ├── ScaleSlider.tsx        ← Floating tier selector widget
        ├── TemplatePicker.tsx     ← Horizontal template chip bar
        └── aws-nodes/
            ├── BaseAwsNode.tsx    ← Single node card for all 14 AWS services
            ├── VpcBoundaryNode.tsx← Dashed VPC rectangle overlay
            └── SubnetBoxNode.tsx  ← Colored subnet rectangle overlay
```

---

## 3. Data Flow Diagram

```
User click: "Open Designer" on Deploy node
    │
    ▼
pipelineStore.openDesigner(deployNodeId)
    │
    ▼
infraStore: isOpen = true
           templateId = 'web-app', scaleTier = 1
           layout = getTierLayout('web-app', 1)
           components[], edges[], containers[] = layout
           liveStats = computeLiveStats(components)
    │
    ├──► InfraDesigner (slide-up overlay)
    │       │
    │       ├──► TemplatePicker  ←──────────── setTemplate(id)
    │       │                                      │
    │       ├──► StatsBar        ◄── liveStats      │
    │       │                                      │
    │       └──► canvas area                       │
    │               │                              │
    │               ├──► InfraCanvas               │
    │               │       │                      │
    │               │       └──► BaseAwsNode ──────┤
    │               │               │  click       │
    │               │               ▼              │
    │               │       selectComponent(id)    │
    │               │               │              │
    │               ├──► ScaleSlider ◄─ setScaleTier(tier)
    │               │                              │
    │               └──► InfraConfigPanel ◄────────┘
    │                       │
    │                       └──► InfraComponentForm
    │                               │  onChange
    │                               ▼
    │                   updateComponentConfig(id, patch)
    │                               │
    │                               ▼
    │                   infraStore.components (patched)
    │                               │
    │                               ▼
    │                   computeLiveStats(components)
    │                               │
    │                               ▼
    │                   infraStore.liveStats → StatsBar + ScaleSlider
    │
    ▼
User click: "← Back to Pipeline"
    │
    ▼
infraStore.closeDesigner()  →  isOpen = false  →  overlay unmounts
```

---

## 4. Layer-by-Layer Breakdown

### 4.1 Types — `types/infra.ts`

The single source of type definitions for Epic 2.

| Type | Purpose |
|---|---|
| `AwsServiceType` | String union of all 14 service keys (`'ecs'`, `'rds'`, …) |
| `InfraComponent` | A service node: `{ id, type, label, position, config }` |
| `InfraEdge` | A directed connection: `{ id, source, target, label? }` |
| `InfraContainer` | A VPC/subnet rectangle: `{ id, type, position, width, height, data }` |
| `TierLayout` | One canvas state: `{ components, edges, containers? }` |
| `ScaleTierIndex` | `0 | 1 | 2 | 3 | 4` |
| `ArchTemplateId` | `'web-app' | 'serverless' | 'microservices' | 'api-workers' | 'ml-inference' | 'static-api'` |
| `TerraformFiles` | `{ main: string; variables: string; outputs: string }` (Phase 6) |
| `ScaleTierDef` | Metadata row: `{ index, label, userCount, costPerMonth, … }` |

---

### 4.2 Store — `store/infraStore.ts`

Zustand store (`create<InfraStore>((set, get) => …)`).

**State**

| Field | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether the InfraDesigner overlay is visible |
| `deployNodeId` | `string \| null` | Which pipeline Deploy node opened the designer |
| `templateId` | `ArchTemplateId` | Currently displayed architecture template |
| `scaleTier` | `ScaleTierIndex` | Currently displayed scale tier (0–4) |
| `components` | `InfraComponent[]` | AWS service nodes on the canvas |
| `edges` | `InfraEdge[]` | Directed connections between nodes |
| `containers` | `InfraContainer[]` | VPC/subnet background overlays |
| `terraform` | `TerraformFiles \| null` | Generated HCL (Phase 6) |
| `selectedComponentId` | `string \| null` | Which node has the config panel open |
| `liveStats` | `LiveStats` | Live-computed cost + capacity (see §6) |

**Actions**

| Action | What it does |
|---|---|
| `openDesigner(deployNodeId)` | Sets `isOpen = true`, resets to `web-app` / tier 1 |
| `closeDesigner()` | Sets `isOpen = false` |
| `setTemplate(id)` | Loads `getTierLayout(id, scaleTier)` → replaces canvas |
| `setScaleTier(tier)` | Loads `getTierLayout(templateId, tier)` → replaces canvas |
| `updateComponentConfig(id, patch)` | Merges patch into one component's config → recomputes liveStats |
| `setComponents(c, e, containers?)` | Bulk-replace (used by AI/Terraform import) |
| `setTerraform(files)` | Stores generated HCL (Phase 6) |
| `selectComponent(id \| null)` | Opens/closes the config panel |

---

### 4.3 Data / Templates

```
data/infra-templates/
├── index.ts          ← Registry + lookup function
├── webApp.ts         ← WEB_APP_TIERS
├── serverless.ts     ← SERVERLESS_TIERS
├── microservices.ts  ← MICROSERVICES_TIERS
├── apiWorkers.ts     ← API_WORKERS_TIERS
├── mlInference.ts    ← ML_INFERENCE_TIERS
└── staticApi.ts      ← STATIC_API_TIERS
```

**`index.ts` exports:**

```ts
// One entry per template, consumed by TemplatePicker
export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  { id: 'web-app', label: 'Web App', icon: '🌐', description: '…', tiers: WEB_APP_TIERS },
  // …5 more
]

// Single lookup used by infraStore.setTemplate / setScaleTier
export function getTierLayout(templateId: ArchTemplateId, tier: ScaleTierIndex): TierLayout {
  const def = TEMPLATE_REGISTRY.find((t) => t.id === templateId)
  return def ? def.tiers[tier] : WEB_APP_TIERS[tier]
}
```

Each `*_TIERS` file exports `Record<ScaleTierIndex, TierLayout>` — a plain object with keys 0–4.

---

### 4.4 Utils — Cost & Capacity

**`utils/costCalculator.ts`**

- Baked-in us-east-1 on-demand pricing snapshot (May 2025)
- Iterates `InfraComponent[]`, accumulates cost per service type
- ECS Fargate: `vcpu × $0.04048 + memGb × $0.004445` per hour × 730 hours/month
- RDS: instance class → hourly rate map
- Returns `CostSummary { totalMonthlyUSD, lineItems[] }`
- Exports `formatCostShort(usd)` → `"$340"` / `"$1.2k"` / `"$8.2k"`

**`utils/capacityEstimator.ts`**

- Baseline: `600 req/vCPU/min`
- CDN multiplier: `÷ (1 - 0.80)` when CloudFront is present (80% cache hit ratio)
- DB bottleneck: checks estimated connection count vs RDS instance class limits
- Returns `CapacityResult { reqPerMin, headroom, headroomStatus, bottleneck, userCount }`
- Exports `formatReqPerMin(n)` → `"120"` / `"6k"` / `"200k"`

---

### 4.5 Lib — `lib/awsNodeConfig.ts`

```ts
export interface AwsNodeConfigEntry {
  icon:         string   // Vite-resolved SVG URL (import albIcon from '*.svg')
  color:        string   // Accent hex color for selected state + icon border
  serviceLabel: string   // Short label e.g. "Application Load Balancer"
  description:  string   // 1-2 sentence description shown in tooltip + panel
}

export const AWS_NODE_CONFIG: Record<AwsServiceType, AwsNodeConfigEntry>
```

All 14 services are registered here.  `BaseAwsNode` and `InfraConfigPanel` both
read from this record to display the correct icon and label.

**SVG imports** require the Vite module declaration in `src/vite-env.d.ts`:
```ts
declare module '*.svg' { const src: string; export default src }
```

---

### 4.6 Components

#### `InfraDesigner`
Top-level overlay.  Slides up via Framer Motion `y: '100%' → 0`.  Orchestrates
all sub-components in a vertical flex column.  Does not manage any local state —
everything comes from `infraStore`.

#### `InfraCanvas`
ReactFlow canvas.  Three node types registered: `awsNode`, `vpcBoundary`, `subnetBox`.
Pure transform functions (`toRFNodes`, `toRFEdges`, `toRFContainers`) convert store
arrays to ReactFlow format.  **`selectedComponentId` is not in the `rfNodes` useMemo
dep array** — see §8 for why this is critical.

#### `InfraConfigPanel`
300px right-side panel.  **Absolutely positioned overlay** — not a flex sibling of
the canvas — so the canvas never resizes when it opens.  Renders:
- Service icon + node label header
- Description card + pricing reference
- `<InfraComponentForm>` for the selected component

#### `InfraComponentForm`
Routes to one of 14 sub-form components based on `component.type`:

| Form | Service | Key config |
|---|---|---|
| `EcsForm` | `ecs` | vCPU, memory (Fargate combos), desired/max count |
| `RdsForm` | `rds` | Engine, instance class, Multi-AZ |
| `ElasticacheForm` | `elasticache` | Node type, cluster size |
| `NatForm` | `nat_gateway` | Count |
| `AlbForm` | `alb` | Scheme (internal/internet-facing), listener port |
| `LambdaForm` | `lambda` | Memory, timeout, architecture (x86/arm64) |
| `ApiGatewayForm` | `api_gateway` | API type, throttle limit |
| `CloudFrontForm` | `cloudfront` | Price class, compression |
| `S3Form` | `s3` | Storage class, versioning |
| `DynamoDbForm` | `dynamodb` | Billing mode, RCU/WCU (provisioned) |
| `SqsForm` | `sqs` | Queue type, visibility timeout |
| `Route53Form` | `route53` | Routing policy, health check |
| `WafForm` | `waf` | Rule group count |
| `ShieldForm` | `shield` | Standard vs Advanced |

Every field calls `updateComponentConfig(component.id, { fieldName: value })`.

#### `StatsBar`
Reads `liveStats` from store.  Shows cost, capacity, headroom, template name.
Animated bottleneck warning banner via Framer Motion `AnimatePresence`.

#### `ScaleSlider`
Floating top-right widget.  Five tier buttons (10 / 1k / 10k / 100k / 1M).
Shows live cost + headroom from `liveStats`.

#### `TemplatePicker`
Horizontal chip bar.  Renders one button per `TEMPLATE_REGISTRY` entry.

#### `BaseAwsNode`
Single ReactFlow node component for all 14 service types.  Hover tooltip +
selection state.  Reads `selectedComponentId` from store directly (see §8).

#### `VpcBoundaryNode` / `SubnetBoxNode`
Non-interactive background overlays.  Sized by `style.width / .height` from the
container node passed by `InfraCanvas`.

---

## 5. How Templates Work

Each template file exports a `Record<ScaleTierIndex, TierLayout>`.  A `TierLayout`
is simply `{ components: InfraComponent[], edges: InfraEdge[], containers?: InfraContainer[] }`.

When the user switches template or tier:

```
User action
    ▼
setTemplate(id) / setScaleTier(tier)   [infraStore.ts]
    ▼
const { scaleTier } = get()             // reads sibling value from store
getTierLayout(id, scaleTier)            // looks up the right layout object
    ▼
set({ components, edges, containers, liveStats })
    ▼
InfraCanvas re-renders with new nodes/edges
```

The store always has the full `templateId × scaleTier` coordinates, so switching
either dimension independently always produces the correct layout.

---

## 6. Live Stats Pipeline

```
User edits a field (e.g. changes ECS instance count from 2 → 4)
    ▼
InfraComponentForm calls updateComponentConfig('ecs-2', { count: 4 })
    ▼
infraStore:
  components = components.map(c =>
    c.id === 'ecs-2' ? { ...c, config: { ...c.config, count: 4 } } : c
  )
  liveStats = computeLiveStats(components)   ← called synchronously
    │
    ├── calculateCost(components)     → CostSummary
    └── estimateCapacity(components)  → CapacityResult
                    ▼
  liveStats = { costLabel, reqLabel, headroom, headroomStatus, bottleneck, userCount }
    ▼
StatsBar + ScaleSlider re-render with new values
```

The entire pipeline runs synchronously on every keystroke / dropdown change.
This is intentional — the calculations are O(n) on the component count (max ~12
nodes) so there is no need to debounce.

---

## 7. The Config Panel + Form System

```
InfraDesigner
  └─ {selectedComponentId && (
       <div style="position:absolute; right:0; width:300">
         <InfraConfigPanel />
       </div>
     )}
         │
         ▼
InfraConfigPanel
  reads: selectedComponentId, components[]
  finds: component = components.find(c => c.id === selectedComponentId)
         │
         ▼
  renders: header + pricing ref + <InfraComponentForm component={component} />
                                          │
                                          ▼
                              switch(component.type)
                                case 'ecs'         → <EcsForm>
                                case 'rds'         → <RdsForm>
                                case 'lambda'      → <LambdaForm>
                                … 11 more cases …
                                          │
                                          ▼ on every change:
                              updateComponentConfig(component.id, patch)
```

**Shared primitives** (defined at top of `InfraComponentForm.tsx`):

| Component | Renders |
|---|---|
| `FormRow` | Label + children in a vertical stack |
| `FormSelect` | Full-width `<select>` with consistent styling |
| `FormInput` | Full-width `<input type="text/number">` |
| `Toggle` | Label + checkbox styled as a toggle |
| `SectionHeading` | Section divider with uppercase label |

All primitives follow this style:
- Label: 11px, `#6B7280`, uppercase, `letter-spacing: 0.05em`
- Input/Select: 100% width, 32px height, `1px #E5E5E5` border, 4px radius, 12px DM Sans
- Focus: `border-color: #3B82F6`

---

## 8. The "Black Flash" Fix

**Symptom:** Clicking a node caused a one-frame black bar to appear next to the
config panel, visible for ~16ms.

**Root cause (3 incorrect hypotheses, 1 correct fix):**

1. ❌ Panel slide animation causing layout shift → remove animation, still flashed
2. ❌ AnimatePresence mode not set to `"wait"` → set it, still flashed
3. ❌ Panel width pushing canvas → use absolute overlay, still flashed
4. ✅ **`selectedComponentId` was in `rfNodes` useMemo deps in `InfraCanvasInner`**

When `selectedComponentId` was a useMemo dep, clicking any node caused:
```
selectComponent(nodeId)
  → infraStore.selectedComponentId changes
  → InfraCanvasInner reads selectedComponentId in useMemo
  → useMemo invalidates → returns new node array
  → ReactFlow receives new nodes → destroys + recreates all node DOM
  → One frame with blank canvas (black)
```

**Fix:** Remove `selectedComponentId` from the dep array.  Have `BaseAwsNode`
compute `selected = useInfraStore().selectedComponentId === id` internally.
Now only the two affected BaseAwsNode instances re-render; the canvas never
rebuilds its DOM.

```tsx
// ❌ Before (InfraCanvas.tsx)
const rfNodes = useMemo(() => {
  return toRFNodes(components).map(n => ({
    ...n,
    selected: n.id === selectedComponentId,   // ← selection here
  }))
}, [components, containers, selectedComponentId])  // ← dep here

// ✅ After
const rfNodes = useMemo(() => {
  const containerNodes = toRFContainers(containers ?? [])
  const awsNodes = toRFNodes(components)
  return [...containerNodes, ...awsNodes]
}, [components, containers])   // ← selectedComponentId NOT here

// BaseAwsNode.tsx
const { selectComponent, selectedComponentId } = useInfraStore()
const selected = selectedComponentId === (id as string)  // ← reads store directly
```

---

## 9. Adding a New Template

1. Create `src/data/infra-templates/myTemplate.ts`:
   ```ts
   import type { TierLayout, ScaleTierIndex } from '@/types/infra'
   export const MY_TEMPLATE_TIERS: Record<ScaleTierIndex, TierLayout> = {
     0: { components: [...], edges: [...] },
     // …tiers 1-4
   }
   ```

2. Register it in `src/data/infra-templates/index.ts`:
   ```ts
   import { MY_TEMPLATE_TIERS } from './myTemplate'

   // Add to TEMPLATE_REGISTRY:
   { id: 'my-template', label: 'My Template', icon: '🚀',
     description: '…', tiers: MY_TEMPLATE_TIERS }
   ```

3. Add the ID to `ArchTemplateId` in `src/types/infra.ts`:
   ```ts
   export type ArchTemplateId = '…existing…' | 'my-template'
   ```

That's it — `TemplatePicker` auto-renders the chip, `getTierLayout` auto-routes to it.

---

## 10. Adding a New AWS Service Type

1. Add the key to `AwsServiceType` in `src/types/infra.ts`.

2. Drop an SVG into `src/assets/aws-icons/my_service.svg`.

3. Add an entry to `AWS_NODE_CONFIG` in `src/lib/awsNodeConfig.ts`:
   ```ts
   import myServiceIcon from '@/assets/aws-icons/my_service.svg'
   // …
   my_service: {
     icon: myServiceIcon,
     color: '#FF9900',
     serviceLabel: 'My Service',
     description: 'What it does in one sentence.',
   }
   ```

4. Add a `pricing hint` entry to the `PRICING_HINT` map in `BaseAwsNode.tsx`.

5. Add a pricing row to `PRICING_TABLE` in `InfraConfigPanel.tsx`.

6. Add a cost calculation branch in `utils/costCalculator.ts`.

7. Add a sub-form in `InfraComponentForm.tsx` and wire it into the `switch` statement.

---

## 11. Phase Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Canvas foundation — ReactFlow integration, BaseAwsNode, store skeleton |
| 2 | ✅ Done | Real AWS SVG icons, hover tooltips, node selection without black flash |
| 3 | ✅ Done | Live cost calculator + capacity estimator, StatsBar, ScaleSlider live data |
| 4 | ✅ Done | 6 architecture templates × 5 scale tiers (30 layouts), TemplatePicker chip bar |
| 5 | ✅ Done | Per-component config forms (all 14 service types), documentation |
| 6 | 🔜 Next | Terraform HCL generation from current canvas state → `infraStore.terraform` |
| 7 | 🔜 | Export (download HCL), pipeline integration (wire Deploy node open button) |
| 8 | 🔜 | AI sidebar: natural-language → `setComponents()` canvas update |

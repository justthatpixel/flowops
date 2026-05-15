/**
 * InfraCanvas.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The ReactFlow canvas for the Infrastructure Designer.  Renders all AWS
 * service nodes (BaseAwsNode), VPC boundary overlays (VpcBoundaryNode),
 * subnet boxes (SubnetBoxNode), and directed edges between them.
 *
 * KEY ARCHITECTURE DECISIONS
 *
 * 1. Exported as `InfraCanvas` (wraps `InfraCanvasInner` in ReactFlowProvider)
 *    so the canvas is self-contained — the parent (InfraDesigner) just mounts it.
 *
 * 2. `selectedComponentId` is NOT in the `rfNodes` useMemo dependency array.
 *    ↳ If it were, clicking any node would force ReactFlow to rebuild the entire
 *      node list, causing a one-frame black repaint ("the black flash bug").
 *    ↳ Instead, each BaseAwsNode reads `selectedComponentId` directly from the
 *      Zustand store so selection state changes are local to that node only.
 *
 * 3. Container nodes (VPC / subnet) are rendered BEFORE service nodes so they
 *    sit behind them visually (zIndex -1 vs 1).  They are also non-selectable
 *    and non-draggable so they never interfere with node interaction.
 *
 * DATA FLOW
 *   infraStore { components, edges, containers }
 *     → toRFNodes / toRFEdges / toRFContainers   (pure transform fns)
 *     → ReactFlow props
 *
 * Clicking an empty area of the canvas calls selectComponent(null) which closes
 * the InfraConfigPanel.
 */

import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ConnectionMode,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodesDelete,
  type OnEdgesDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useInfraStore } from '@/store/infraStore'
import BaseAwsNode, { type AwsNodeData } from './aws-nodes/BaseAwsNode'
import VpcBoundaryNode from './aws-nodes/VpcBoundaryNode'
import SubnetBoxNode from './aws-nodes/SubnetBoxNode'
import type { InfraComponent, InfraEdge, InfraContainer, AwsServiceType } from '@/types/infra'
import { DEMO_PLAN } from '@/data/demoPlan'

// ─── TF resource type → AWS service type ──────────────────────────────────────

const TF_TO_AWS: Record<string, AwsServiceType> = {
  aws_instance:                    'ec2_asg',
  aws_db_instance:                 'rds',
  aws_db_instance_mysql:           'rds_mysql',
  aws_s3_bucket:                   's3',
  aws_cloudwatch_log_group:        'cloudwatch_dashboard',
  aws_cloudwatch_metric_alarm:     'cloudwatch_alarm',
  aws_elb:                         'alb',
  aws_lb:                          'alb',
  aws_alb:                         'alb',
  aws_route53_record:              'route53',
  aws_lambda_function:             'lambda',
  aws_ecs_service:                 'ecs',
  aws_ecs_task_definition:         'ecs_task',
  aws_ecr_repository:              'ecr',
  aws_sqs_queue:                   'sqs',
  aws_sns_topic:                   'sns',
  aws_cloudfront_distribution:     'cloudfront',
  aws_api_gateway_rest_api:        'api_gateway',
  aws_dynamodb_table:              'dynamodb',
  aws_elasticache_cluster:         'elasticache',
  aws_nat_gateway:                 'nat_gateway',
  aws_vpc:                         'vpc',
  aws_kinesis_stream:              'kinesis',
  aws_efs_file_system:             'efs',
  aws_xray_group:                  'xray',
  aws_secretsmanager_secret:       'secrets_manager',
  aws_kms_key:                     'kms',
  aws_iam_role:                    'iam_role',
  aws_wafv2_web_acl:               'waf',
  aws_shield_advanced_protection:  'shield_advanced',
  aws_elastic_beanstalk_environment: 'elastic_beanstalk',
}

const NODE_TYPES = {
  awsNode:     BaseAwsNode,
  vpcBoundary: VpcBoundaryNode,
  subnetBox:   SubnetBoxNode,
}

function toRFNodes(components: InfraComponent[]): Node<AwsNodeData>[] {
  return components.map((c) => ({
    id: c.id,
    type: 'awsNode',
    position: c.position,
    data: {
      type: c.type,
      label: c.label,
      config: c.config,
    },
    draggable: true,
    zIndex: 1,
  }))
}

function toRFContainers(containers: InfraContainer[]): Node[] {
  return containers.map((c) => ({
    id: c.id,
    type: c.type === 'vpc' ? 'vpcBoundary' : 'subnetBox',
    position: c.position,
    style: {
      width: c.width,
      height: c.height,
      pointerEvents: 'none' as const,
    },
    data: c.data,
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: -1,
  }))
}

function toRFEdges(edges: InfraEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'step',
    label: e.label,
    labelStyle: {
      fontSize: 9,
      fill: '#9CA3AF',
      fontFamily: '"DM Sans", sans-serif',
    },
    labelBgStyle: { fill: '#F7F7F5', fillOpacity: 0.9 },
    style: { stroke: '#CBD5E1', strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
      width: 14,
      height: 14,
    },
    zIndex: 2,
  }))
}

// ─── Right-click context menu ─────────────────────────────────────────────────

interface ContextMenuState {
  x:      number
  y:      number
  nodeId: string
}

function NodeContextMenu({
  menu,
  onDelete,
  onClose,
}: {
  menu:     ContextMenuState
  onDelete: (id: string) => void
  onClose:  () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Element)) onClose()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position:     'fixed',
        left:         menu.x,
        top:          menu.y,
        zIndex:       1000,
        background:   '#FFFFFF',
        border:       '1px solid #E5E7EB',
        borderRadius: 8,
        boxShadow:    '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        minWidth:     160,
        overflow:     'hidden',
        fontFamily:   '"DM Sans", sans-serif',
      }}
    >
      <button
        onClick={() => { onDelete(menu.nodeId); onClose() }}
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          width:       '100%',
          padding:     '9px 14px',
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          fontSize:    12,
          fontWeight:  500,
          color:       '#EF4444',
          fontFamily:  '"DM Sans", sans-serif',
          textAlign:   'left',
          transition:  'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF5F5' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
        Delete node
      </button>
      <div style={{ height: 1, background: '#F3F4F6', margin: '0 10px' }} />
      <button
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '9px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 500, color: '#6B7280',
          fontFamily: '"DM Sans", sans-serif', textAlign: 'left',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Canvas inner ─────────────────────────────────────────────────────────────

function InfraCanvasInner() {
  const {
    components, edges, containers,
    selectComponent,
    addComponent, removeComponent,
    addEdge: storeAddEdge, removeEdge: storeRemoveEdge,
    updateComponentPosition,
    planMode,
  } = useInfraStore()

  const { screenToFlowPosition } = useReactFlow()

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // selectedComponentId is intentionally NOT a dependency here.
  // BaseAwsNode reads it directly from the store so selection state
  // changes never cause a full canvas node re-render (which flashed black).
  const rfNodes = useMemo(() => {
    const containerNodes = toRFContainers(containers ?? [])
    let awsNodes = toRFNodes(components)

    if (planMode) {
      // Track which component ids we've already matched
      const matchedIds = new Set<string>()
      const patches    = new Map<string, Partial<AwsNodeData>>()
      const ghostNodes: Node<AwsNodeData>[] = []

      // Compute a bounding box to place ghost nodes below existing canvas
      const maxY = components.length > 0
        ? Math.max(...components.map((c) => c.position.y)) + 160
        : 400

      let ghostX = 80

      for (const resource of DEMO_PLAN) {
        const awsType = TF_TO_AWS[resource.tfType]
        if (!awsType) continue

        if (resource.planAction === 'create') {
          // Place a ghost node below the canvas
          ghostNodes.push({
            id:       resource.id,
            type:     'awsNode',
            position: { x: ghostX, y: maxY },
            data: {
              type:        awsType,
              label:       resource.tfAddress.split('.')[1] ?? resource.tfAddress,
              config:      {},
              planAction:  'create',
              planDiff:    resource.diff,
              planAddress: resource.tfAddress,
              isGhost:     true,
            },
            draggable: false,
            zIndex:    1,
          })
          ghostX += 220
        } else {
          // Match first unmatched existing component of this AWS type
          const match = components.find((c) => c.type === awsType && !matchedIds.has(c.id))
          if (match) {
            matchedIds.add(match.id)
            patches.set(match.id, {
              planAction:  resource.planAction,
              planDiff:    resource.diff,
              planAddress: resource.tfAddress,
            })
          }
        }
      }

      // Apply patches to existing nodes
      awsNodes = awsNodes.map((node) => {
        const patch = patches.get(node.id)
        if (!patch) return node
        return { ...node, data: { ...node.data, ...patch } }
      })

      return [...containerNodes, ...awsNodes, ...ghostNodes]
    }

    return [...containerNodes, ...awsNodes]
  }, [components, containers, planMode])

  const rfEdges = useMemo(() => toRFEdges(edges), [edges])

  const onPaneClick = useCallback(() => {
    selectComponent(null)
    setContextMenu(null)
  }, [selectComponent])

  // Persist node position after drag ends (fires once, avoids per-frame updates)
  const onNodeDragStop = useCallback((_evt: React.MouseEvent, node: Node) => {
    updateComponentPosition(node.id, node.position)
  }, [updateComponentPosition])

  // Wire new connections drawn on the canvas to the store
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      storeAddEdge(connection.source, connection.target)
    }
  }, [storeAddEdge])

  // Delete handlers — ReactFlow calls these when Backspace/Delete is pressed
  const onNodesDelete: OnNodesDelete = useCallback((deleted) => {
    deleted.forEach((n) => removeComponent(n.id))
  }, [removeComponent])

  const onEdgesDelete: OnEdgesDelete = useCallback((deleted) => {
    deleted.forEach((e) => storeRemoveEdge(e.id))
  }, [storeRemoveEdge])

  // HTML5 drag-over: allow the drop
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // HTML5 drop: create a new component at the cursor position
  // addComponent now auto-selects the new node via newlyDroppedId + selectedComponentId
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/infra-service') as AwsServiceType
    if (!type) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addComponent(type, position)
  }, [screenToFlowPosition, addComponent])

  // Right-click on a node → show context menu
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
    selectComponent(node.id)
  }, [selectComponent])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES as never}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeContextMenu={onNodeContextMenu}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#F7F7F5' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#d1d1d1"
        />
        <Controls
          style={{
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
          }}
        />
      </ReactFlow>

      {/* Right-click context menu — rendered outside ReactFlow to avoid z-index issues */}
      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          onDelete={(id) => { removeComponent(id); selectComponent(null) }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default function InfraCanvas() {
  return (
    <ReactFlowProvider>
      <InfraCanvasInner />
    </ReactFlowProvider>
  )
}

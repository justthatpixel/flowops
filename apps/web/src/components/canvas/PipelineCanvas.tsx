import { useCallback, useRef, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type NodeChange,
  type OnNodesChange,
} from '@xyflow/react'
import { usePipelineStore } from '@/store/pipelineStore'
import BaseNode from './nodes/BaseNode'
import GroupBoxNode from './nodes/GroupBoxNode'
import AnimatedEdge from './edges/AnimatedEdge'
import type { PipelineNodeData, NodeType, GroupConfig } from '@/types/pipeline'
import { NODE_CONFIG } from '@/lib/nodeConfig'

const nodeTypes = { pipelineNode: BaseNode, pipelineGroupBox: GroupBoxNode }
const edgeTypes = { animatedEdge: AnimatedEdge }

// ─── Group box computation ─────────────────────────────────────────────────
// Derived from groupConfigs — never stored in the pipeline store itself.

const PAD        = 24   // padding around member nodes (flow-space px)
const FALLBACK_W = 185  // BaseNode width
const FALLBACK_H = 100  // BaseNode approximate height

function computeGroupBoxes(
  nodes: Node<PipelineNodeData>[],
  groupConfigs: Record<string, GroupConfig>,
): Node[] {
  return Object.entries(groupConfigs).flatMap(([id, config]) => {
    const members = nodes.filter((n) => config.memberIds.includes(n.id))
    if (members.length === 0) {
      // Empty group — render a fixed-size placeholder so it's visible on the canvas
      return [{
        id,
        type:        'pipelineGroupBox',
        position:    { x: 0, y: 0 },
        data:        { label: config.label, color: config.color },
        style:       { width: 220, height: 110 },
        draggable:   false,
        selectable:  false,
        connectable: false,
        focusable:   false,
        deletable:   false,
        zIndex:      -1,
      } as Node]
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const node of members) {
      const w = node.measured?.width  ?? FALLBACK_W
      const h = node.measured?.height ?? FALLBACK_H
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + w)
      maxY = Math.max(maxY, node.position.y + h)
    }

    return [{
      id,
      type:        'pipelineGroupBox',
      position:    { x: minX - PAD, y: minY - PAD },
      data:        { label: config.label, color: config.color },
      style:       { width: maxX - minX + PAD * 2, height: maxY - minY + PAD * 2 },
      draggable:   false,
      selectable:  false,
      connectable: false,
      focusable:   false,
      deletable:   false,
      zIndex:      -1,
    } as Node]
  })
}

// ─── Drop-zone detection ───────────────────────────────────────────────────
const DROP_BUFFER = 48

function detectGroupDrop(
  draggedNode: Node<PipelineNodeData>,
  allNodes: Node<PipelineNodeData>[],
  groupConfigs: Record<string, GroupConfig>,
): string | null {
  const dW = draggedNode.measured?.width  ?? FALLBACK_W
  const dH = draggedNode.measured?.height ?? FALLBACK_H
  const cx  = draggedNode.position.x + dW / 2
  const cy  = draggedNode.position.y + dH / 2

  for (const [groupId, config] of Object.entries(groupConfigs)) {
    const others = allNodes.filter(
      (n) => config.memberIds.includes(n.id) && n.id !== draggedNode.id,
    )
    if (others.length === 0) continue

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const m of others) {
      const mW = m.measured?.width  ?? FALLBACK_W
      const mH = m.measured?.height ?? FALLBACK_H
      minX = Math.min(minX, m.position.x - PAD)
      minY = Math.min(minY, m.position.y - PAD)
      maxX = Math.max(maxX, m.position.x + mW + PAD)
      maxY = Math.max(maxY, m.position.y + mH + PAD)
    }

    if (
      cx >= minX - DROP_BUFFER && cx <= maxX + DROP_BUFFER &&
      cy >= minY - DROP_BUFFER && cy <= maxY + DROP_BUFFER
    ) {
      return groupId
    }
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PipelineCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange,
    setNodes, selectNode, selectGroup,
    groupConfigs, setGroupMember, addGroup,
  } = usePipelineStore()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const groupIds = useMemo(() => new Set(Object.keys(groupConfigs)), [groupConfigs])

  const groupBoxNodes = useMemo(
    () => computeGroupBoxes(nodes, groupConfigs),
    [nodes, groupConfigs],
  )
  const allNodes = useMemo(
    () => [...groupBoxNodes, ...nodes],
    [groupBoxNodes, nodes],
  )

  // Filter change events for group boxes — they must never reach the store
  const handleNodesChange = useCallback<OnNodesChange<Node>>(
    (changes) => {
      const pipelineChanges = (changes as NodeChange<Node<PipelineNodeData>>[]).filter((c) => {
        if (c.type === 'add') return true
        return !groupIds.has(c.id)
      })
      if (pipelineChanges.length > 0) onNodesChange(pipelineChanges)
    },
    [onNodesChange, groupIds],
  )

  // ── Drag-drop group membership ────────────────────────────────────────────
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      if (groupIds.has(draggedNode.id)) return

      const newGroupId = detectGroupDrop(
        draggedNode as Node<PipelineNodeData>,
        nodes,
        groupConfigs,
      )

      for (const groupId of Object.keys(groupConfigs)) {
        const isCurrentMember = groupConfigs[groupId].memberIds.includes(draggedNode.id)
        const shouldBeMember  = newGroupId === groupId
        if (isCurrentMember !== shouldBeMember) {
          setGroupMember(groupId, draggedNode.id, shouldBeMember)
        }
      }
    },
    [nodes, groupConfigs, groupIds, setGroupMember],
  )

  // ── Canvas drop ───────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()

      // ── Group drop ────────────────────────────────────────────────
      const groupRaw = e.dataTransfer.getData('application/reactflow-group')
      if (groupRaw) {
        const { label } = JSON.parse(groupRaw) as { label: string }
        const id = `g-${crypto.randomUUID().slice(0, 8)}`
        addGroup(id, label, 'slate')
        return
      }

      // ── Node drop ─────────────────────────────────────────────────
      const raw = e.dataTransfer.getData('application/reactflow')
      if (!raw) return

      const { nodeType, label } = JSON.parse(raw) as { nodeType: NodeType; label: string }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      const newNode: Node<PipelineNodeData> = {
        id: crypto.randomUUID(),
        type: 'pipelineNode',
        position,
        data: { label, nodeType, status: 'idle' },
      }
      setNodes([...nodes, newNode])
    },
    [nodes, setNodes, screenToFlowPosition, addGroup],
  )

  // ── Click handlers ────────────────────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (groupIds.has(node.id)) {
        selectGroup(node.id)   // open group config panel
      } else {
        selectNode(node.id)
      }
    },
    [selectNode, selectGroup, groupIds],
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectGroup(null)
  }, [selectNode, selectGroup])

  return (
    <div ref={wrapperRef} style={{ flex: 1, height: '100%', background: '#F7F7F5' }}>
      <ReactFlow
        nodes={allNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes as never}
        edgeTypes={edgeTypes as never}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'animatedEdge' }}
        style={{ background: '#F7F7F5' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#CCCCCC" />
        <Controls style={{ bottom: 24, left: 24 }} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as PipelineNodeData
            return NODE_CONFIG[data.nodeType]?.color ?? '#E5E5E5'
          }}
          style={{ bottom: 24, right: 24 }}
          maskColor="rgba(247,247,245,0.7)"
        />
      </ReactFlow>
    </div>
  )
}

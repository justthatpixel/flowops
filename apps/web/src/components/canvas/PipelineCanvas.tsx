import { useCallback, useMemo } from 'react'
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

const FALLBACK_W = 185
const FALLBACK_H = 100

// ─── Group boxes from stored position/size ────────────────────────────────────
function computeGroupBoxes(groupConfigs: Record<string, GroupConfig>): Node[] {
  return Object.entries(groupConfigs).map(([id, config]) => ({
    id,
    type:        'pipelineGroupBox',
    position:    config.position ?? { x: 100, y: 100 },
    data:        { label: config.label, color: config.color },
    style:       {
      width:  config.size?.width  ?? 320,
      height: config.size?.height ?? 200,
    },
    draggable:   true,
    selectable:  true,
    connectable: false,
    focusable:   false,
    deletable:   false,
    zIndex:      -1,
  } as Node))
}

// ─── Drop-zone detection using stored group bounds ────────────────────────────
function detectGroupDrop(
  draggedNode: Node<PipelineNodeData>,
  groupConfigs: Record<string, GroupConfig>,
): string | null {
  const dW = draggedNode.measured?.width  ?? FALLBACK_W
  const dH = draggedNode.measured?.height ?? FALLBACK_H
  const cx  = draggedNode.position.x + dW / 2
  const cy  = draggedNode.position.y + dH / 2

  for (const [groupId, config] of Object.entries(groupConfigs)) {
    const { x, y } = config.position ?? { x: 0, y: 0 }
    const w = config.size?.width  ?? 320
    const h = config.size?.height ?? 200
    if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
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
    updateGroupPosition,
  } = usePipelineStore()

  const { screenToFlowPosition } = useReactFlow()

  const groupIds = useMemo(() => new Set(Object.keys(groupConfigs)), [groupConfigs])

  const groupBoxNodes = useMemo(
    () => computeGroupBoxes(groupConfigs),
    [groupConfigs],
  )

  const allNodes = useMemo(
    () => [...groupBoxNodes, ...nodes],
    [groupBoxNodes, nodes],
  )

  // Pass pipeline-node changes to store; group position changes handled via onNodeDragStop
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

  // ── Drag stop: persist group position or update pipeline node membership ──
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      if (groupIds.has(draggedNode.id)) {
        updateGroupPosition(draggedNode.id, draggedNode.position.x, draggedNode.position.y)
        return
      }

      // Regular node — update group membership based on where it landed
      const newGroupId = detectGroupDrop(
        draggedNode as Node<PipelineNodeData>,
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
    [groupConfigs, groupIds, setGroupMember, updateGroupPosition],
  )

  // ── Canvas drop ───────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()

      const groupRaw = e.dataTransfer.getData('application/reactflow-group')
      if (groupRaw) {
        const { label } = JSON.parse(groupRaw) as { label: string }
        const id       = `g-${crypto.randomUUID().slice(0, 8)}`
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        addGroup(id, label, 'slate', position)
        return
      }

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
        selectGroup(node.id)
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
    <div style={{ flex: 1, height: '100%', background: '#F7F7F5' }}>
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

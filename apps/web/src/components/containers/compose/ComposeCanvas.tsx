/**
 * ComposeCanvas.tsx — ReactFlow canvas for Docker Compose mode
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
import { useContainerStore } from '@/store/containerStore'
import type { ContainerNodeType } from '@/types/containers'
import ServiceNode from './ServiceNode'
import DatabaseNode from './DatabaseNode'
import VolumeNode from './VolumeNode'
import NetworkNode from './NetworkNode'

const NODE_TYPES = {
  service: ServiceNode,
  database: DatabaseNode,
  volume: VolumeNode,
  network: NetworkNode,
} as const

interface ContextMenuState {
  x: number
  y: number
  nodeId: string
}

function NodeContextMenu({
  menu,
  onDelete,
  onClose,
}: {
  menu: ContextMenuState
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
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
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        zIndex: 1000,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: 160,
        overflow: 'hidden',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <button
        onClick={() => { onDelete(menu.nodeId); onClose() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 500, color: '#EF4444', fontFamily: '"DM Sans", sans-serif',
          textAlign: 'left', transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF5F5' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        Delete node
      </button>
    </div>
  )
}

function ComposeCanvasInner({ onUpgrade }: { onUpgrade: () => void }) {
  const { nodes, edges, selectNode, addNode, removeNode, addEdge: storeAddEdge, removeEdge: storeRemoveEdge, updateNodePosition } = useContainerStore()
  const { screenToFlowPosition } = useReactFlow()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const rfNodes = useMemo((): Node[] => {
    return nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.label, config: n.config },
      draggable: true,
      zIndex: 1,
    }))
  }, [nodes])

  const rfEdges = useMemo((): Edge[] => {
    return edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'step',
      label: e.label,
      labelStyle: { fontSize: 9, fill: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' },
      labelBgStyle: { fill: '#F7F7F5', fillOpacity: 0.9 },
      style: { stroke: '#CBD5E1', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 },
      zIndex: 2,
    }))
  }, [edges])

  const onPaneClick = useCallback(() => { selectNode(null); setContextMenu(null) }, [selectNode])

  const onNodeDragStop = useCallback((_evt: React.MouseEvent, node: Node) => {
    updateNodePosition(node.id, node.position)
  }, [updateNodePosition])

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) storeAddEdge(connection.source, connection.target)
  }, [storeAddEdge])

  const onNodesDelete: OnNodesDelete = useCallback((deleted) => {
    deleted.forEach((n) => removeNode(n.id))
  }, [removeNode])

  const onEdgesDelete: OnEdgesDelete = useCallback((deleted) => {
    deleted.forEach((e) => storeRemoveEdge(e.id))
  }, [storeRemoveEdge])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/container-node') as ContainerNodeType
    if (!type) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(type, position)
  }, [screenToFlowPosition, addNode])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
    selectNode(node.id)
  }, [selectNode])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#d1d1d1" />
        <Controls style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB', borderRadius: 6 }} />
      </ReactFlow>

      {/* Upgrade to Kubernetes bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 44,
          background: 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: 'pointer',
          zIndex: 10,
        }}
        onClick={onUpgrade}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', fontFamily: '"DM Sans", sans-serif' }}>
          ↑ Upgrade to Kubernetes
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: '"DM Sans", sans-serif' }}>
          — migrate to K8s manifests
        </span>
      </div>

      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          onDelete={(id) => { removeNode(id); selectNode(null) }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default function ComposeCanvas({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <ReactFlowProvider>
      <ComposeCanvasInner onUpgrade={onUpgrade} />
    </ReactFlowProvider>
  )
}

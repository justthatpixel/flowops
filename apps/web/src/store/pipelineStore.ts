import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import { WEB_APP_NODES, WEB_APP_EDGES } from '@/templates/webApp'
import type { PipelineNodeData, NodeStatus, RunState, NodeConfig, GeneratedFile, GroupConfig, GroupColor } from '@/types/pipeline'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface PipelineStore {
  nodes: Node<PipelineNodeData>[]
  edges: Edge[]
  runState: RunState
  pipelineName: string
  selectedNodeId: string | null
  /** Which group box is currently open in the config panel (mutually exclusive with selectedNodeId) */
  selectedGroupId: string | null
  showTemplatePicker: boolean
  /** Per-group config: label, colour tint, member node IDs */
  groupConfigs: Record<string, GroupConfig>

  setNodes: (nodes: Node<PipelineNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange<Node<PipelineNodeData>>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  setPipelineName: (name: string) => void
  selectNode: (id: string | null) => void
  /** Open the group config panel (clears selectedNodeId) */
  selectGroup: (id: string | null) => void
  setShowTemplatePicker: (show: boolean) => void
  setRunState: (state: RunState) => void
  loadTemplate: (nodes: Node<PipelineNodeData>[], edges: Edge[], name: string) => void
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void
  updateNodeLabel: (nodeId: string, label: string) => void
  updateNodeFiles: (nodeId: string, files: GeneratedFile[]) => void
  updateNodeSummary: (nodeId: string, aiSummary: string, suggestedFix: string) => void
  /** Add or remove a node from a group */
  setGroupMember: (groupId: string, nodeId: string, isMember: boolean) => void
  /** Change a group's colour tint */
  setGroupColor: (groupId: string, color: GroupColor) => void
  /** Create a new empty group */
  addGroup: (id: string, label: string, color: GroupColor) => void
  /** Permanently remove a group and its config */
  removeGroup: (groupId: string) => void
  /** Rename a group label */
  updateGroupLabel: (groupId: string, label: string) => void
  startRun: () => void
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  nodes: WEB_APP_NODES,
  edges: WEB_APP_EDGES,
  runState: 'idle',
  pipelineName: 'Web App Pipeline',
  selectedNodeId: null,
  selectedGroupId: null,
  showTemplatePicker: true,
  groupConfigs: {},

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  setPipelineName: (name) => set({ pipelineName: name }),

  selectNode: (id) => set({ selectedNodeId: id, selectedGroupId: null }),
  selectGroup: (id) => set({ selectedGroupId: id, selectedNodeId: null }),

  setShowTemplatePicker: (show) => set({ showTemplatePicker: show }),

  setRunState: (state) => set({ runState: state }),

  loadTemplate: (nodes, edges, name) =>
    set({
      nodes,
      edges,
      pipelineName: name,
      runState: 'idle',
      selectedNodeId: null,
      selectedGroupId: null,
      groupConfigs: {},
      showTemplatePicker: false,
    }),

  updateNodeStatus: (nodeId, status) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
      ),
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
      ),
    })),

  updateNodeLabel: (nodeId, label) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
      ),
    })),

  updateNodeFiles: (nodeId, files) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, generatedFiles: files } } : n
      ),
    })),

  updateNodeSummary: (nodeId, aiSummary, suggestedFix) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, aiSummary, suggestedFix } } : n
      ),
    })),

  setGroupMember: (groupId, nodeId, isMember) =>
    set((state) => {
      const cfg = state.groupConfigs[groupId]
      if (!cfg) return {}
      const memberIds = isMember
        ? [...new Set([...cfg.memberIds, nodeId])]
        : cfg.memberIds.filter((id) => id !== nodeId)
      return {
        groupConfigs: {
          ...state.groupConfigs,
          [groupId]: { ...cfg, memberIds },
        },
      }
    }),

  setGroupColor: (groupId, color) =>
    set((state) => {
      const cfg = state.groupConfigs[groupId]
      if (!cfg) return {}
      return {
        groupConfigs: {
          ...state.groupConfigs,
          [groupId]: { ...cfg, color },
        },
      }
    }),

  addGroup: (id, label, color) =>
    set((state) => ({
      groupConfigs: {
        ...state.groupConfigs,
        [id]: { label, color, memberIds: [] },
      },
    })),

  removeGroup: (groupId) =>
    set((state) => {
      const { [groupId]: _removed, ...rest } = state.groupConfigs
      return {
        groupConfigs: rest,
        selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
      }
    }),

  updateGroupLabel: (groupId, label) =>
    set((state) => {
      const cfg = state.groupConfigs[groupId]
      if (!cfg) return {}
      return {
        groupConfigs: {
          ...state.groupConfigs,
          [groupId]: { ...cfg, label },
        },
      }
    }),

  startRun: () => {
    const { nodes, edges, pipelineName } = get()

    // Reset all nodes to pending and animate edges
    set({
      runState: 'running',
      selectedNodeId: null,
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data, status: 'pending' as NodeStatus } })),
      edges: edges.map((e) => ({ ...e, data: { ...e.data, animated: true } })),
    })

    // Try API-driven execution first; fall back to local simulation
    const nodePayload = nodes.map((n) => ({ id: n.id, data: n.data }))
    const edgePayload = edges.map((e) => ({ source: e.source, target: e.target }))

    fetch(`${API}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pipelineName, nodes: nodePayload, edges: edgePayload }),
    }).catch(() => {
      // Backend unavailable — run local simulation
      runLocalSimulation(nodes, get, set)
    })
  },
}))

function runLocalSimulation(
  nodes: Node<PipelineNodeData>[],
  get: () => PipelineStore,
  set: (partial: Partial<PipelineStore> | ((s: PipelineStore) => Partial<PipelineStore>)) => void,
) {
  const nodeIds = nodes.map((n) => n.id)
  const STEP = 1600
  const RUN_DURATION = 1200

  nodeIds.forEach((id, i) => {
    setTimeout(() => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, status: 'running' as NodeStatus } } : n
        ),
      }))
    }, i * STEP)

    setTimeout(() => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, status: 'success' as NodeStatus } } : n
        ),
      }))
    }, i * STEP + RUN_DURATION)
  })

  setTimeout(() => {
    set((state) => ({
      runState: 'complete',
      edges: state.edges.map((e) => ({ ...e, data: { ...e.data, animated: false } })),
    }))
  }, nodeIds.length * STEP + RUN_DURATION)
}

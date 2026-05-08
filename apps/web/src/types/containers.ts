export type ContainerMode = 'compose' | 'kubernetes' | 'managed'
export type CloudProvider = 'eks' | 'gke' | 'aks'

// Compose node types
export type ComposeNodeType = 'service' | 'database' | 'volume' | 'network'

// Database subtypes
export type DatabaseType = 'postgres' | 'mysql' | 'redis' | 'mongo' | 'mariadb'

// Kubernetes node types
export type K8sNodeType =
  | 'deployment' | 'statefulset' | 'daemonset'
  | 'k8s_service' | 'ingress' | 'configmap' | 'secret'
  | 'pvc' | 'hpa' | 'networkpolicy' | 'serviceaccount'

// Managed (cloud-specific) node types
export type ManagedNodeType =
  | 'nodegroup' | 'fargateprofile' | 'irsa'
  | 'gke_nodepool' | 'gke_workload_identity'
  | 'aks_nodepool' | 'aks_managed_identity'

export type ContainerNodeType = ComposeNodeType | K8sNodeType | ManagedNodeType

export interface ContainerNode {
  id: string
  type: ContainerNodeType
  position: { x: number; y: number }
  label: string
  namespaceId?: string
  config: Record<string, unknown>
}

export interface ContainerEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface Namespace {
  id: string
  name: string
  position: { x: number; y: number }
  width: number
  height: number
}

export interface ResourceSummary {
  totalCpu: string
  totalMemory: string
  totalPods: number
  headroom?: number
}

export interface GeneratedFiles {
  [filename: string]: string
}

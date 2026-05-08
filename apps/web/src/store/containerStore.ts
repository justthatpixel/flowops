/**
 * containerStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store for the Container & Cluster Designer (Epic 5).
 *
 * Supports three modes:
 *   compose    — Docker Compose canvas
 *   kubernetes — Raw K8s manifests canvas
 *   managed    — Managed K8s (EKS/GKE/AKS) canvas
 */

import { create } from 'zustand'
import type {
  ContainerMode,
  CloudProvider,
  ContainerNode,
  ContainerEdge,
  ContainerNodeType,
  Namespace,
  GeneratedFiles,
} from '@/types/containers'

// ─── Default node configs by type ────────────────────────────────────────────

function getDefaultConfig(type: ContainerNodeType): Record<string, unknown> {
  switch (type) {
    // Compose
    case 'service':
      return {
        image: 'your-app:latest',
        ports: '80:3000',
        restart: 'unless-stopped',
        replicas: 1,
        memLimit: '512m',
        cpuLimit: 0.5,
        healthCheckPath: '/health',
        networks: 'default',
        envVars: '',
        buildDockerfile: false,
        buildContext: '.',
      }
    case 'database':
      return {
        dbType: 'postgres',
        version: '15-alpine',
        port: 5432,
        dbName: 'appdb',
        user: 'postgres',
        volumeMountPath: '/var/lib/postgresql/data',
      }
    case 'volume':
      return {
        driver: 'local',
        mountPath: '/data',
      }
    case 'network':
      return {
        driver: 'bridge',
        subnet: '172.20.0.0/16',
      }
    // Kubernetes
    case 'deployment':
      return {
        image: 'your-app:latest',
        registry: 'dockerhub',
        replicas: 3,
        strategy: 'RollingUpdate',
        cpuRequest: '250m',
        cpuLimit: '500m',
        memRequest: '256Mi',
        memLimit: '512Mi',
        port: 3000,
        protocol: 'TCP',
        livenessPath: '/health',
        readinessPath: '/ready',
        imagePullPolicy: 'IfNotPresent',
        namespace: 'default',
      }
    case 'statefulset':
      return {
        image: 'postgres:15-alpine',
        replicas: 1,
        storageSize: '10Gi',
        storageClass: 'standard',
        namespace: 'default',
        cpuRequest: '250m',
        cpuLimit: '500m',
        memRequest: '256Mi',
        memLimit: '512Mi',
      }
    case 'daemonset':
      return {
        image: 'fluentd:latest',
        namespace: 'kube-system',
        cpuRequest: '100m',
        cpuLimit: '200m',
        memRequest: '128Mi',
        memLimit: '256Mi',
      }
    case 'k8s_service':
      return {
        serviceType: 'ClusterIP',
        port: 80,
        targetPort: 3000,
        namespace: 'default',
      }
    case 'ingress':
      return {
        ingressClass: 'nginx',
        host: 'app.example.com',
        tls: false,
        certManager: false,
        namespace: 'default',
      }
    case 'configmap':
      return {
        data: 'APP_ENV=production\nLOG_LEVEL=info',
        mountAs: 'env',
        namespace: 'default',
      }
    case 'secret':
      return {
        secretType: 'Opaque',
        data: 'DB_PASSWORD=changeme\nAPI_KEY=changeme',
        sealedSecrets: false,
        namespace: 'default',
      }
    case 'pvc':
      return {
        storage: '20Gi',
        accessMode: 'ReadWriteOnce',
        storageClass: 'standard',
        namespace: 'default',
      }
    case 'hpa':
      return {
        targetDeployment: '',
        minReplicas: 2,
        maxReplicas: 10,
        cpuTargetPercent: 70,
        memTargetPercent: 80,
        namespace: 'default',
      }
    case 'networkpolicy':
      return {
        podSelector: 'app=web',
        ingressNamespace: 'default',
        ingressPod: '',
        ingressPort: 80,
        egressPort: 443,
        namespace: 'default',
      }
    case 'serviceaccount':
      return {
        annotations: '',
        namespace: 'default',
      }
    // Managed
    case 'nodegroup':
      return {
        instanceType: 't3.medium',
        minSize: 1,
        maxSize: 5,
        desiredSize: 2,
        diskSizeGb: 50,
        subnet: 'private-subnet-1',
      }
    case 'fargateprofile':
      return {
        profileName: 'default',
        namespace: 'default',
        selectors: 'app=web',
        subnets: 'subnet-1, subnet-2',
      }
    case 'irsa':
      return {
        serviceAccountName: 'app-sa',
        namespace: 'default',
        iamPolicy: 'AmazonS3ReadOnlyAccess',
        customArn: '',
      }
    case 'gke_nodepool':
      return {
        machineType: 'n1-standard-2',
        minNodes: 1,
        maxNodes: 5,
        diskSizeGb: 50,
      }
    case 'gke_workload_identity':
      return {
        serviceAccountName: 'app-sa',
        namespace: 'default',
        googleServiceAccount: 'app@project.iam.gserviceaccount.com',
      }
    case 'aks_nodepool':
      return {
        vmSize: 'Standard_D2_v3',
        minCount: 1,
        maxCount: 5,
        osDiskSizeGb: 50,
      }
    case 'aks_managed_identity':
      return {
        identityName: 'app-identity',
        namespace: 'default',
        roleAssignment: 'Contributor',
      }
    default:
      return {}
  }
}

// ─── Auto-label generation ────────────────────────────────────────────────────

function getDefaultLabel(type: ContainerNodeType): string {
  const labels: Record<ContainerNodeType, string> = {
    service: 'web',
    database: 'postgres-db',
    volume: 'app-data',
    network: 'app-network',
    deployment: 'web-deployment',
    statefulset: 'db-statefulset',
    daemonset: 'log-daemon',
    k8s_service: 'web-service',
    ingress: 'web-ingress',
    configmap: 'app-config',
    secret: 'app-secret',
    pvc: 'data-pvc',
    hpa: 'web-hpa',
    networkpolicy: 'web-netpol',
    serviceaccount: 'app-sa',
    nodegroup: 'app-nodes',
    fargateprofile: 'fargate-default',
    irsa: 'app-irsa',
    gke_nodepool: 'app-pool',
    gke_workload_identity: 'app-wi',
    aks_nodepool: 'app-pool',
    aks_managed_identity: 'app-identity',
  }
  return labels[type] ?? type
}

// ─── Default compose nodes ────────────────────────────────────────────────────

function getDefaultComposeNodes(): ContainerNode[] {
  return [
    {
      id: 'service-web-default',
      type: 'service',
      position: { x: 120, y: 160 },
      label: 'web',
      config: {
        image: 'nginx:alpine',
        ports: '80:3000',
        restart: 'unless-stopped',
        replicas: 1,
        memLimit: '512m',
        cpuLimit: 0.5,
        healthCheckPath: '/health',
        networks: 'default',
        envVars: 'NODE_ENV=production',
        buildDockerfile: false,
        buildContext: '.',
      },
    },
    {
      id: 'database-postgres-default',
      type: 'database',
      position: { x: 400, y: 160 },
      label: 'postgres',
      config: {
        dbType: 'postgres',
        version: '15-alpine',
        port: 5432,
        dbName: 'appdb',
        user: 'postgres',
        volumeMountPath: '/var/lib/postgresql/data',
      },
    },
  ]
}

// ─── Default kubernetes nodes ─────────────────────────────────────────────────

function getDefaultKubernetesNodes(): ContainerNode[] {
  return [
    {
      id: 'deployment-web-default',
      type: 'deployment',
      position: { x: 120, y: 160 },
      label: 'web',
      config: {
        image: 'your-app:latest',
        registry: 'dockerhub',
        replicas: 3,
        strategy: 'RollingUpdate',
        cpuRequest: '250m',
        cpuLimit: '500m',
        memRequest: '256Mi',
        memLimit: '512Mi',
        port: 3000,
        protocol: 'TCP',
        livenessPath: '/health',
        readinessPath: '/ready',
        imagePullPolicy: 'IfNotPresent',
        namespace: 'default',
      },
    },
    {
      id: 'k8s_service-web-default',
      type: 'k8s_service',
      position: { x: 380, y: 160 },
      label: 'web-service',
      config: {
        serviceType: 'ClusterIP',
        port: 80,
        targetPort: 3000,
        namespace: 'default',
      },
    },
    {
      id: 'ingress-web-default',
      type: 'ingress',
      position: { x: 640, y: 160 },
      label: 'web-ingress',
      config: {
        ingressClass: 'nginx',
        host: 'app.example.com',
        tls: false,
        certManager: false,
        namespace: 'default',
      },
    },
  ]
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface ContainerStore {
  isOpen: boolean
  mode: ContainerMode | null
  cloudProvider: CloudProvider
  nodes: ContainerNode[]
  edges: ContainerEdge[]
  namespaces: Namespace[]
  selectedNodeId: string | null
  generatedFiles: GeneratedFiles
  activeFileTab: string | null
  showYamlPanel: boolean
  showHelmPanel: boolean

  openDesigner: () => void
  closeDesigner: () => void
  setMode: (mode: ContainerMode) => void
  setCloudProvider: (provider: CloudProvider) => void
  addNode: (type: ContainerNodeType, position: { x: number; y: number }) => void
  removeNode: (id: string) => void
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void
  updateNodeLabel: (id: string, label: string) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void
  addEdge: (source: string, target: string) => void
  removeEdge: (id: string) => void
  selectNode: (id: string | null) => void
  addNamespace: (name: string, position: { x: number; y: number }) => void
  removeNamespace: (id: string) => void
  setGeneratedFiles: (files: GeneratedFiles) => void
  setActiveFileTab: (tab: string | null) => void
  toggleYamlPanel: () => void
  toggleHelmPanel: () => void
  // Migration: replace entire canvas state
  setNodes: (nodes: ContainerNode[]) => void
  setEdges: (edges: ContainerEdge[]) => void
  setNamespaces: (namespaces: Namespace[]) => void
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useContainerStore = create<ContainerStore>((set, get) => ({
  isOpen: false,
  mode: null,
  cloudProvider: 'eks',
  nodes: [],
  edges: [],
  namespaces: [],
  selectedNodeId: null,
  generatedFiles: {},
  activeFileTab: null,
  showYamlPanel: false,
  showHelmPanel: false,

  openDesigner: () => {
    set({
      isOpen: true,
      mode: null,
      nodes: [],
      edges: [],
      namespaces: [],
      selectedNodeId: null,
      generatedFiles: {},
      activeFileTab: null,
      showYamlPanel: false,
      showHelmPanel: false,
    })
  },

  closeDesigner: () => {
    set({
      isOpen: false,
      selectedNodeId: null,
      showYamlPanel: false,
      showHelmPanel: false,
    })
  },

  setMode: (mode) => {
    const { mode: currentMode } = get()
    if (currentMode === mode) return
    // Load defaults for the newly selected mode
    const nodes =
      mode === 'compose'
        ? getDefaultComposeNodes()
        : mode === 'kubernetes' || mode === 'managed'
        ? getDefaultKubernetesNodes()
        : []
    const edges: ContainerEdge[] =
      mode === 'compose'
        ? [{ id: 'edge-web-postgres', source: 'service-web-default', target: 'database-postgres-default', label: 'connects' }]
        : mode === 'kubernetes' || mode === 'managed'
        ? [
            { id: 'edge-dep-svc', source: 'deployment-web-default', target: 'k8s_service-web-default' },
            { id: 'edge-svc-ing', source: 'k8s_service-web-default', target: 'ingress-web-default' },
          ]
        : []
    set({ mode, nodes, edges, namespaces: [], selectedNodeId: null, generatedFiles: {} })
  },

  setCloudProvider: (provider) => set({ cloudProvider: provider }),

  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`
    const node: ContainerNode = {
      id,
      type,
      position,
      label: getDefaultLabel(type),
      config: getDefaultConfig(type),
    }
    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodeId: id,
    }))
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }))
  },

  updateNodeConfig: (id, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, config: { ...n.config, ...config } } : n
      ),
    }))
  },

  updateNodeLabel: (id, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    }))
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
    }))
  },

  addEdge: (source, target) => {
    const { edges } = get()
    if (edges.some((e) => e.source === source && e.target === target)) return
    const edge: ContainerEdge = {
      id: `edge-${source}-${target}-${Date.now()}`,
      source,
      target,
    }
    set((state) => ({ edges: [...state.edges, edge] }))
  },

  removeEdge: (id) => {
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }))
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  addNamespace: (name, position) => {
    const ns: Namespace = {
      id: `ns-${Date.now()}`,
      name,
      position,
      width: 600,
      height: 400,
    }
    set((state) => ({ namespaces: [...state.namespaces, ns] }))
  },

  removeNamespace: (id) => {
    set((state) => ({
      namespaces: state.namespaces.filter((n) => n.id !== id),
      nodes: state.nodes.map((n) =>
        n.namespaceId === id ? { ...n, namespaceId: undefined } : n
      ),
    }))
  },

  setGeneratedFiles: (files) => set({ generatedFiles: files }),

  setActiveFileTab: (tab) => set({ activeFileTab: tab }),

  toggleYamlPanel: () =>
    set((state) => ({
      showYamlPanel: !state.showYamlPanel,
      showHelmPanel: false,
    })),

  toggleHelmPanel: () =>
    set((state) => ({
      showHelmPanel: !state.showHelmPanel,
      showYamlPanel: false,
    })),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setNamespaces: (namespaces) => set({ namespaces }),
}))

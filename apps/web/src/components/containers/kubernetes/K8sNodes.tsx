/**
 * K8sNodes.tsx — All Kubernetes ReactFlow custom node components
 * Each exports a component compatible with ReactFlow's nodeTypes map.
 */

import type { NodeProps, Node } from '@xyflow/react'
import { K8sBaseNode } from './K8sBaseNode'

interface K8sNodeData extends Record<string, unknown> {
  label: string
  config: Record<string, unknown>
}

type K8sNode = Node<K8sNodeData>

function makeIcon(color: string, paths: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.split('|').map((p, i) => {
        if (p.startsWith('circle:')) {
          const parts = p.replace('circle:', '').split(',')
          return <circle key={i} cx={parts[0]} cy={parts[1]} r={parts[2]} />
        }
        if (p.startsWith('rect:')) {
          const parts = p.replace('rect:', '').split(',')
          return <rect key={i} x={parts[0]} y={parts[1]} width={parts[2]} height={parts[3]} rx={parts[4] || '0'} />
        }
        return <path key={i} d={p} />
      })}
    </svg>
  )
}

// ── Deployment ────────────────────────────────────────────────────────────────
export function DeploymentNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const replicas = (config.replicas as number) || 1
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#3B82F6"
      icon={makeIcon('#3B82F6', 'M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5')}
      badge={`${replicas} replicas`}
    />
  )
}

// ── StatefulSet ───────────────────────────────────────────────────────────────
export function StatefulSetNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const storage = (config.storageSize as string) || '10Gi'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#8B5CF6"
      icon={makeIcon('#8B5CF6', 'M3 5h18M3 12h18M3 19h18|M8 5v14M16 5v14')}
      badge={storage}
    />
  )
}

// ── DaemonSet ─────────────────────────────────────────────────────────────────
export function DaemonSetNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const image = (config.image as string) || 'daemon'
  const shortImage = image.split(':')[0].split('/').pop() || 'daemon'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#F97316"
      icon={makeIcon('#F97316', 'M22 12H2|M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z|circle:6,16,1|circle:10,16,1')}
      badge={shortImage}
    />
  )
}

// ── Service (k8s_service) ─────────────────────────────────────────────────────
export function K8sServiceNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const serviceType = (config.serviceType as string) || 'ClusterIP'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#22C55E"
      icon={makeIcon('#22C55E', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z|M12 8v4l3 3')}
      badge={serviceType}
    />
  )
}

// ── Ingress ───────────────────────────────────────────────────────────────────
export function IngressNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const host = (config.host as string) || ''
  const shortHost = host ? host.split('.')[0] : 'ingress'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#EC4899"
      icon={makeIcon('#EC4899', 'M21 3H3m18 0-7 7m7-7v7|M3 3l7 7M3 3v7')}
      badge={shortHost}
    />
  )
}

// ── ConfigMap ─────────────────────────────────────────────────────────────────
export function ConfigMapNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const mountAs = (config.mountAs as string) || 'env'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#F59E0B"
      icon={makeIcon('#F59E0B', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8')}
      badge={mountAs}
    />
  )
}

// ── Secret ────────────────────────────────────────────────────────────────────
export function SecretNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const secretType = (config.secretType as string) || 'Opaque'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#EF4444"
      icon={makeIcon('#EF4444', 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4')}
      badge={secretType}
    />
  )
}

// ── PVC ───────────────────────────────────────────────────────────────────────
export function PvcNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const storage = (config.storage as string) || '20Gi'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#6B7280"
      icon={makeIcon('#6B7280', 'M22 12H2|M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z')}
      badge={storage}
    />
  )
}

// ── HPA ───────────────────────────────────────────────────────────────────────
export function HpaNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const minR = (config.minReplicas as number) || 2
  const maxR = (config.maxReplicas as number) || 10
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#14B8A6"
      icon={makeIcon('#14B8A6', 'M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6')}
      badge={`${minR}–${maxR}`}
    />
  )
}

// ── NetworkPolicy ─────────────────────────────────────────────────────────────
export function NetworkPolicyNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const podSelector = (config.podSelector as string) || ''
  const shortSelector = podSelector.split('=')[0] || 'policy'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#64748B"
      icon={makeIcon('#64748B', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')}
      badge={shortSelector}
    />
  )
}

// ── ServiceAccount ────────────────────────────────────────────────────────────
export function ServiceAccountNode({ id, data: rawData }: NodeProps<K8sNode>) {
  const data = rawData as K8sNodeData
  const config = data.config ?? {}
  const namespace = (config.namespace as string) || 'default'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#A855F7"
      icon={makeIcon('#A855F7', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|circle:12,7,4|M16 11l2 2 4-4')}
      badge={namespace}
    />
  )
}

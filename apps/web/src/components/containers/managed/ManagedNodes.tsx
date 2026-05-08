/**
 * ManagedNodes.tsx — Managed Kubernetes ReactFlow custom nodes (EKS/GKE/AKS)
 */

import type { NodeProps, Node } from '@xyflow/react'
import { K8sBaseNode } from '../kubernetes/K8sBaseNode'

interface ManagedNodeData extends Record<string, unknown> {
  label: string
  config: Record<string, unknown>
}

type ManagedNode = Node<ManagedNodeData>

// ── NodeGroup (EKS) ───────────────────────────────────────────────────────────
export function NodeGroupNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const instanceType = (config.instanceType as string) || 't3.medium'
  const min = (config.minSize as number) || 1
  const max = (config.maxSize as number) || 5
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#22C55E"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      }
      badge={`${instanceType} ${min}–${max}`}
    />
  )
}

// ── FargateProfile (EKS) ──────────────────────────────────────────────────────
export function FargateProfileNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const namespace = (config.namespace as string) || 'default'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#3B82F6"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
      }
      badge={namespace}
    />
  )
}

// ── IRSA (EKS) ────────────────────────────────────────────────────────────────
export function IrsaNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const policy = (config.iamPolicy as string) || 'S3ReadOnly'
  const shortPolicy = policy.split('/').pop()?.replace('Amazon', '') || policy
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#F59E0B"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
      }
      badge={shortPolicy}
    />
  )
}

// ── GKE NodePool ──────────────────────────────────────────────────────────────
export function GkeNodePoolNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const machineType = (config.machineType as string) || 'n1-standard-2'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#4285F4"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      }
      badge={machineType}
    />
  )
}

// ── GKE Workload Identity ──────────────────────────────────────────────────────
export function GkeWorkloadIdentityNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const namespace = (config.namespace as string) || 'default'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#34A853"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <path d="M16 11l2 2 4-4"/>
        </svg>
      }
      badge={namespace}
    />
  )
}

// ── AKS NodePool ──────────────────────────────────────────────────────────────
export function AksNodePoolNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const vmSize = (config.vmSize as string) || 'Standard_D2_v3'
  const shortSize = vmSize.replace('Standard_', '')
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#0078D4"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      }
      badge={shortSize}
    />
  )
}

// ── AKS Managed Identity ──────────────────────────────────────────────────────
export function AksManagedIdentityNode({ id, data: rawData }: NodeProps<ManagedNode>) {
  const data = rawData as ManagedNodeData
  const config = data.config ?? {}
  const role = (config.roleAssignment as string) || 'Contributor'
  return (
    <K8sBaseNode
      id={id as string}
      label={data.label}
      config={config}
      color="#50E6FF"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      }
      badge={role}
    />
  )
}

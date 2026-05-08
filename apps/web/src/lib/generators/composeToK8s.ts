/**
 * composeToK8s.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migration: Docker Compose nodes/edges → K8s nodes/edges/namespaces
 *
 * Mapping:
 *   service  → Deployment + k8s_service
 *   database → StatefulSet + k8s_service + pvc
 *   volume   → pvc
 *   network  → (ignored, use NetworkPolicy instead)
 */

import type { ContainerNode, ContainerEdge, Namespace, GeneratedFiles } from '@/types/containers'
import { generateManifests } from './manifestGenerator'

interface MigrationResult {
  nodes: ContainerNode[]
  edges: ContainerEdge[]
  namespaces: Namespace[]
  manifests: GeneratedFiles
}

function getDbPort(dbType: string): number {
  switch (dbType) {
    case 'postgres': return 5432
    case 'mysql': return 3306
    case 'redis': return 6379
    case 'mongo': return 27017
    case 'mariadb': return 3306
    default: return 5432
  }
}

function getDbImage(dbType: string, version: string): string {
  const v = version || 'latest'
  switch (dbType) {
    case 'postgres': return `postgres:${v}`
    case 'mysql': return `mysql:${v}`
    case 'redis': return `redis:${v}`
    case 'mongo': return `mongo:${v}`
    case 'mariadb': return `mariadb:${v}`
    default: return `${dbType}:${v}`
  }
}

export function composeToK8s(
  composeNodes: ContainerNode[],
  composeEdges: ContainerEdge[]
): MigrationResult {
  const k8sNodes: ContainerNode[] = []
  const k8sEdges: ContainerEdge[] = []
  const now = Date.now()

  // Track old → new ID mapping for edge migration
  const idMap: Map<string, string[]> = new Map()

  let xOffset = 120
  let xDbOffset = 120
  const yService = 100
  const yDb = 340

  // ── Migrate services → Deployment + k8s_service ───────────────────────────
  const services = composeNodes.filter((n) => n.type === 'service')
  for (const svc of services) {
    const c = svc.config
    const portStr = (c.ports as string) || '80:3000'
    const [hostPort, containerPort] = portStr.split(':').map(Number)
    const image = (c.image as string) || 'your-app:latest'
    const replicas = (c.replicas as number) || 1
    const memLimit = (c.memLimit as string) || '512Mi'
    const cpuLimit = (c.cpuLimit as number) || 0.5

    // Deployment
    const depId = `deployment-${svc.label}-${now}`
    k8sNodes.push({
      id: depId,
      type: 'deployment',
      position: { x: xOffset, y: yService },
      label: svc.label,
      config: {
        image,
        replicas,
        strategy: 'RollingUpdate',
        cpuRequest: '250m',
        cpuLimit: `${Math.round(cpuLimit * 1000)}m`,
        memRequest: '256Mi',
        memLimit: memLimit.endsWith('m') ? `${memLimit.slice(0, -1)}Mi` : memLimit,
        port: containerPort || 3000,
        protocol: 'TCP',
        livenessPath: (c.healthCheckPath as string) || '/health',
        readinessPath: '/ready',
        imagePullPolicy: 'IfNotPresent',
        namespace: 'default',
      },
    })

    // k8s_service
    const svcId = `k8s_service-${svc.label}-${now}`
    k8sNodes.push({
      id: svcId,
      type: 'k8s_service',
      position: { x: xOffset + 220, y: yService },
      label: `${svc.label}-svc`,
      config: {
        serviceType: 'ClusterIP',
        port: hostPort || 80,
        targetPort: containerPort || 3000,
        namespace: 'default',
      },
    })

    // Edge: deployment → service
    k8sEdges.push({
      id: `edge-dep-svc-${now}-${svc.label}`,
      source: depId,
      target: svcId,
    })

    idMap.set(svc.id, [depId, svcId])
    xOffset += 500
  }

  // ── Migrate databases → StatefulSet + k8s_service + pvc ───────────────────
  const databases = composeNodes.filter((n) => n.type === 'database')
  for (const db of databases) {
    const c = db.config
    const dbType = (c.dbType as string) || 'postgres'
    const version = (c.version as string) || '15-alpine'
    const port = (c.port as number) || getDbPort(dbType)

    // StatefulSet
    const ssId = `statefulset-${db.label}-${now}`
    k8sNodes.push({
      id: ssId,
      type: 'statefulset',
      position: { x: xDbOffset, y: yDb },
      label: db.label,
      config: {
        image: getDbImage(dbType, version),
        replicas: 1,
        storageSize: '10Gi',
        storageClass: 'standard',
        namespace: 'default',
        cpuRequest: '250m',
        cpuLimit: '500m',
        memRequest: '256Mi',
        memLimit: '512Mi',
      },
    })

    // k8s_service for DB
    const dbSvcId = `k8s_service-${db.label}-${now}`
    k8sNodes.push({
      id: dbSvcId,
      type: 'k8s_service',
      position: { x: xDbOffset + 220, y: yDb },
      label: `${db.label}-svc`,
      config: {
        serviceType: 'ClusterIP',
        port,
        targetPort: port,
        namespace: 'default',
      },
    })

    // PVC for DB
    const pvcId = `pvc-${db.label}-${now}`
    k8sNodes.push({
      id: pvcId,
      type: 'pvc',
      position: { x: xDbOffset + 440, y: yDb },
      label: `${db.label}-pvc`,
      config: {
        storage: '10Gi',
        accessMode: 'ReadWriteOnce',
        storageClass: 'standard',
        namespace: 'default',
      },
    })

    // Edges
    k8sEdges.push({
      id: `edge-ss-svc-${now}-${db.label}`,
      source: ssId,
      target: dbSvcId,
    })
    k8sEdges.push({
      id: `edge-ss-pvc-${now}-${db.label}`,
      source: ssId,
      target: pvcId,
    })

    idMap.set(db.id, [ssId, dbSvcId, pvcId])
    xDbOffset += 720
  }

  // ── Migrate volumes → pvc ─────────────────────────────────────────────────
  const volumes = composeNodes.filter((n) => n.type === 'volume')
  for (const vol of volumes) {
    const pvcId = `pvc-vol-${vol.label}-${now}`
    k8sNodes.push({
      id: pvcId,
      type: 'pvc',
      position: { x: xOffset, y: yService + 220 },
      label: `${vol.label}-pvc`,
      config: {
        storage: '5Gi',
        accessMode: 'ReadWriteOnce',
        storageClass: 'standard',
        namespace: 'default',
      },
    })
    idMap.set(vol.id, [pvcId])
    xOffset += 220
  }

  // ── Migrate edges ─────────────────────────────────────────────────────────
  // Map old edges to new node IDs (use primary mapped node = first in list)
  for (const edge of composeEdges) {
    const sourceIds = idMap.get(edge.source)
    const targetIds = idMap.get(edge.target)
    if (sourceIds && targetIds) {
      k8sEdges.push({
        id: `migrated-${edge.id}`,
        source: sourceIds[0],
        target: targetIds[0],
        label: edge.label,
      })
    }
  }

  // Default namespace
  const namespaces: Namespace[] = []

  // Generate manifests
  const manifests = generateManifests(k8sNodes, k8sEdges, namespaces)

  return { nodes: k8sNodes, edges: k8sEdges, namespaces, manifests }
}

// Alias for backwards-compatibility with ComposeToK8s modal
export const migrateComposeToK8s = composeToK8s

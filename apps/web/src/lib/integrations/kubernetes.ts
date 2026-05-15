/**
 * kubernetes.ts — Kubernetes API client
 * ─────────────────────────────────────────────────────────────────────────────
 * Talks directly to the cluster API server via bearer token.
 *
 * NOTE: Direct browser→K8s API calls are blocked by CORS in most clusters.
 * Set proxyMode = true and expose a lightweight proxy at /api/k8s/* that
 * forwards requests and injects the service-account token server-side.
 * Example proxy: `kubectl proxy --port=8001 --accept-hosts='^localhost$'`
 * then point endpoint to http://localhost:8001
 */

export interface KubeDeployment {
  name: string
  namespace: string
  replicas: number
  readyReplicas: number
  availableReplicas: number
  image: string
  /** ISO-8601 creation timestamp */
  createdAt: string
  status: 'healthy' | 'degraded' | 'down'
  cpuUsage?: string
  memUsage?: string
}

export interface KubePod {
  name: string
  namespace: string
  phase: 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown'
  restarts: number
  node: string
  createdAt: string
  ready: boolean
}

export interface KubeNode {
  name: string
  ready: boolean
  cpu: string
  memory: string
  version: string
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class KubernetesClient {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
    private readonly namespace: string = 'default',
    private readonly proxyMode: boolean = false,
  ) {}

  private async get<T>(path: string): Promise<T> {
    const base = this.proxyMode ? this.endpoint : this.endpoint.replace(/\/$/, '')
    const res = await fetch(`${base}${path}`, {
      headers: this.proxyMode
        ? {}
        : {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
          },
    })
    if (!res.ok) {
      throw new Error(`Kubernetes API ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  async getDeployments(): Promise<KubeDeployment[]> {
    const raw = await this.get<any>(
      `/apis/apps/v1/namespaces/${this.namespace}/deployments`,
    )
    return (raw.items ?? []).map((d: any) => {
      const spec   = d.spec   ?? {}
      const status = d.status ?? {}
      const desired   = spec.replicas          ?? 0
      const ready     = status.readyReplicas   ?? 0
      const available = status.availableReplicas ?? 0

      let deployStatus: KubeDeployment['status'] = 'healthy'
      if (ready === 0)       deployStatus = 'down'
      else if (ready < desired) deployStatus = 'degraded'

      const image = d.spec?.template?.spec?.containers?.[0]?.image ?? ''

      return {
        name:              d.metadata.name,
        namespace:         d.metadata.namespace,
        replicas:          desired,
        readyReplicas:     ready,
        availableReplicas: available,
        image,
        createdAt:         d.metadata.creationTimestamp ?? '',
        status:            deployStatus,
      }
    })
  }

  async getPods(): Promise<KubePod[]> {
    const raw = await this.get<any>(
      `/api/v1/namespaces/${this.namespace}/pods`,
    )
    return (raw.items ?? []).map((p: any) => {
      const containers = p.status?.containerStatuses ?? []
      const restarts   = containers.reduce((sum: number, c: any) => sum + (c.restartCount ?? 0), 0)
      const ready      = containers.every((c: any) => c.ready)
      return {
        name:      p.metadata.name,
        namespace: p.metadata.namespace,
        phase:     p.status?.phase ?? 'Unknown',
        restarts,
        node:      p.spec?.nodeName ?? '',
        createdAt: p.metadata.creationTimestamp ?? '',
        ready,
      }
    })
  }

  async getNodes(): Promise<KubeNode[]> {
    const raw = await this.get<any>('/api/v1/nodes')
    return (raw.items ?? []).map((n: any) => {
      const readyCond = (n.status?.conditions ?? []).find((c: any) => c.type === 'Ready')
      return {
        name:    n.metadata.name,
        ready:   readyCond?.status === 'True',
        cpu:     n.status?.capacity?.cpu     ?? '',
        memory:  n.status?.capacity?.memory  ?? '',
        version: n.status?.nodeInfo?.kubeletVersion ?? '',
      }
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function replicasLabel(ready: number, desired: number): string {
  return `${ready}/${desired}`
}

export function kubeAge(iso: string): string {
  const diff = Date.now() - Date.parse(iso)
  const min  = Math.floor(diff / 60_000)
  if (min < 60)     return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24)      return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

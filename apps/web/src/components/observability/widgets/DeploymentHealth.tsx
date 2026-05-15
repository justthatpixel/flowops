import { Rocket } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useKubeDeployments } from '@/hooks/useKubernetes'
import { replicasLabel, kubeAge } from '@/lib/integrations/kubernetes'
import type { KubeDeployment } from '@/lib/integrations/kubernetes'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: KubeDeployment['status'] }) {
  const color = status === 'healthy' ? '#22C55E' : status === 'degraded' ? '#F59E0B' : '#EF4444'
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
      boxShadow: `0 0 0 2px ${color}30`,
    }} />
  )
}

function MiniBar({ pct }: { pct: number }) {
  const color = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#22C55E'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 44, height: 4, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{
        fontSize: 10, color: pct > 80 ? color : '#6B7280',
        fontFamily: '"DM Sans", sans-serif', fontWeight: pct > 80 ? 600 : 400,
      }}>
        {pct}%
      </span>
    </div>
  )
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK: KubeDeployment[] = [
  { name: 'flowops-api',  namespace: 'default', replicas: 3, readyReplicas: 3, availableReplicas: 3, image: 'ghcr.io/acme/api:main',    createdAt: new Date(Date.now() - 7200_000).toISOString(),  status: 'healthy' },
  { name: 'flowops-web',  namespace: 'default', replicas: 2, readyReplicas: 2, availableReplicas: 2, image: 'ghcr.io/acme/web:main',    createdAt: new Date(Date.now() - 7200_000).toISOString(),  status: 'healthy' },
  { name: 'postgres',     namespace: 'default', replicas: 1, readyReplicas: 1, availableReplicas: 1, image: 'postgres:16-alpine',       createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(), status: 'healthy' },
  { name: 'redis',        namespace: 'default', replicas: 1, readyReplicas: 1, availableReplicas: 1, image: 'redis:7-alpine',           createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(), status: 'healthy' },
  { name: 'worker',       namespace: 'default', replicas: 2, readyReplicas: 1, availableReplicas: 1, image: 'ghcr.io/acme/worker:main', createdAt: new Date(Date.now() - 3600_000).toISOString(),  status: 'degraded' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeploymentHealth({ id }: { id: string }) {
  const { deployments, loading, error, configured } = useKubeDeployments()
  const rows = configured && deployments.length > 0 ? deployments : MOCK

  const degraded = rows.filter((d) => d.status !== 'healthy').length

  return (
    <BaseWidget
      id={id}
      title="Deployment Health"
      icon={Rocket}
      iconColor="#22C55E"
      loading={loading && deployments.length === 0}
      error={error}
      unconfigured={!configured}
      integrationName="Kubernetes"
      headerRight={
        degraded > 0 ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', background: '#FFFBEB', padding: '1px 6px', borderRadius: 99 }}>
            {degraded} degraded
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#22C55E', background: '#F0FDF4', padding: '1px 6px', borderRadius: 99 }}>
            All healthy
          </span>
        )
      }
    >
      <div>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 52px 52px 36px',
          gap: 4, padding: '4px 12px',
          fontSize: 9, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          fontFamily: '"DM Sans", sans-serif', borderBottom: '1px solid #F3F4F6',
        }}>
          <span>Service</span>
          <span>Pods</span>
          <span>Age</span>
          <span></span>
        </div>

        {rows.map((d) => {
          // Fake CPU/mem% based on readyReplicas ratio for mock; real K8s needs metrics-server
          const utilization = Math.round((1 - d.readyReplicas / Math.max(d.replicas, 1)) * 100 + 20)
          return (
            <div
              key={d.name}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 52px 52px 36px',
                gap: 4, padding: '7px 12px', borderBottom: '1px solid #F3F4F6',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: '"DM Sans", sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.name}
              </span>
              <span style={{
                fontSize: 11, color: d.readyReplicas < d.replicas ? '#F59E0B' : '#6B7280',
                fontFamily: '"JetBrains Mono", monospace', fontWeight: d.readyReplicas < d.replicas ? 600 : 400,
              }}>
                {replicasLabel(d.readyReplicas, d.replicas)}
              </span>
              <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                {d.createdAt ? kubeAge(d.createdAt) : '—'}
              </span>
              <StatusDot status={d.status} />
            </div>
          )
        })}
      </div>
    </BaseWidget>
  )
}

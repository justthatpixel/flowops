/**
 * ResourceCalculator.tsx — Bottom stats bar showing CPU, Memory, Pods, Cluster Fit
 */

import { useContainerStore } from '@/store/containerStore'

function parseCpu(val: string | undefined): number {
  if (!val) return 0
  if (typeof val === 'number') return val as number
  const s = String(val)
  if (s.endsWith('m')) return parseFloat(s) / 1000
  return parseFloat(s) || 0
}

function parseMemory(val: string | undefined): number {
  // Returns value in Mi
  if (!val) return 0
  const s = String(val)
  if (s.endsWith('Gi')) return parseFloat(s) * 1024
  if (s.endsWith('Mi')) return parseFloat(s)
  if (s.endsWith('m')) return parseFloat(s) // docker style "512m" → 512
  return parseFloat(s) || 0
}

function formatMemory(mi: number): string {
  if (mi >= 1024) return `${(mi / 1024).toFixed(1)} GB`
  return `${Math.round(mi)} MB`
}

export default function ResourceCalculator() {
  const { nodes } = useContainerStore()

  const deploymentLike = nodes.filter(
    (n) => n.type === 'deployment' || n.type === 'statefulset' || n.type === 'daemonset'
  )

  if (deploymentLike.length === 0) return null

  let totalCpu = 0
  let totalMemMi = 0
  let totalPods = 0

  for (const node of deploymentLike) {
    const replicas = (node.config.replicas as number) || 1
    const cpu = parseCpu(node.config.cpuRequest as string)
    const mem = parseMemory(node.config.memRequest as string)
    totalCpu += cpu * replicas
    totalMemMi += mem * replicas
    totalPods += replicas
  }

  const cpuLabel = totalCpu >= 1 ? `${totalCpu.toFixed(1)} vCPU` : `${Math.round(totalCpu * 1000)}m`
  const memLabel = formatMemory(totalMemMi)

  // Simple cluster fit estimate (t3.large = 2 vCPU, 8 GB)
  const t3LargeNodes = Math.ceil(totalCpu / 1.8) // leave ~10% headroom per node
  const headroomCpu = (t3LargeNodes * 2 - totalCpu) / (t3LargeNodes * 2)
  const headroomLabel = totalCpu > 0 ? `✓ ~${t3LargeNodes} t3.lg · ${Math.round(headroomCpu * 100)}% headroom` : '—'

  const CARD_STYLE: React.CSSProperties = {
    flex: 1,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: '8px 12px',
    minWidth: 0,
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'rgba(247, 247, 245, 0.92)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #E5E7EB',
        padding: '8px 12px',
        display: 'flex',
        gap: 8,
        alignItems: 'stretch',
        zIndex: 5,
      }}
    >
      {/* CPU */}
      <div style={CARD_STYLE}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: '"DM Sans", sans-serif' }}>
          Total CPU
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', fontFamily: '"DM Sans", sans-serif' }}>
          {cpuLabel}
        </div>
      </div>

      {/* Memory */}
      <div style={CARD_STYLE}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: '"DM Sans", sans-serif' }}>
          Total Memory
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', fontFamily: '"DM Sans", sans-serif' }}>
          {memLabel}
        </div>
      </div>

      {/* Pods */}
      <div style={CARD_STYLE}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: '"DM Sans", sans-serif' }}>
          Pods
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', fontFamily: '"DM Sans", sans-serif' }}>
          {totalPods}
        </div>
      </div>

      {/* Cluster Fit */}
      <div style={{ ...CARD_STYLE, flex: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: '"DM Sans", sans-serif' }}>
          Cluster Fit
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: totalCpu > 0 ? '#22C55E' : '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
          {headroomLabel}
        </div>
      </div>
    </div>
  )
}

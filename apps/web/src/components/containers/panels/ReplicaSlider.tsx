/**
 * ReplicaSlider.tsx — Absolute positioned replica slider (top-right of canvas)
 */

import { useContainerStore } from '@/store/containerStore'

export default function ReplicaSlider() {
  const { nodes, selectedNodeId, updateNodeConfig } = useContainerStore()

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
  const isDeployment = selectedNode?.type === 'deployment' || selectedNode?.type === 'statefulset'

  // Find HPA node targeting current deployment
  const hpaNode = nodes.find((n) => {
    if (n.type !== 'hpa') return false
    const targetDep = (n.config.targetDeployment as string) || ''
    return selectedNode ? targetDep === selectedNode.label : false
  })

  if (!isDeployment && !hpaNode) {
    // Show generic counter for all deployments
    const deployments = nodes.filter((n) => n.type === 'deployment' || n.type === 'statefulset')
    if (deployments.length === 0) return null

    const totalPods = deployments.reduce((sum, n) => sum + ((n.config.replicas as number) || 1), 0)

    return (
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          fontFamily: '"DM Sans", sans-serif',
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Est. Pods
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>
          {totalPods}
        </div>
      </div>
    )
  }

  if (!isDeployment) return null

  const currentReplicas = (selectedNode!.config.replicas as number) || 1

  const handleChange = (val: number) => {
    updateNodeConfig(selectedNode!.id, { replicas: val })
  }

  const hpaMin = hpaNode ? (hpaNode.config.minReplicas as number) || 2 : null
  const hpaMax = hpaNode ? (hpaNode.config.maxReplicas as number) || 10 : null

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontFamily: '"DM Sans", sans-serif',
        zIndex: 10,
        minWidth: 180,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Replicas
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#3B82F6' }}>
          {currentReplicas}
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={20}
        value={currentReplicas}
        onChange={(e) => handleChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: '#D1D5DB', fontFamily: '"DM Sans", sans-serif' }}>1</span>
        <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
          Est. pods: {currentReplicas}
        </span>
        <span style={{ fontSize: 9, color: '#D1D5DB', fontFamily: '"DM Sans", sans-serif' }}>20</span>
      </div>

      {hpaNode && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #F3F4F6',
            fontSize: 10,
            color: '#14B8A6',
            fontWeight: 600,
          }}
        >
          HPA: min {hpaMin} / max {hpaMax}
        </div>
      )}
    </div>
  )
}

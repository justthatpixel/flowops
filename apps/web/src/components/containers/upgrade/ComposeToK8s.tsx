/**
 * ComposeToK8s.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal that appears when "↑ Upgrade to Kubernetes" is clicked in Compose mode.
 * Shows a preview of what will be migrated, then executes the migration.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Check } from 'lucide-react'
import { useContainerStore } from '@/store/containerStore'
import { migrateComposeToK8s } from '@/lib/generators/composeToK8s'

interface Props {
  onClose: () => void
}

export default function ComposeToK8s({ onClose }: Props) {
  const { nodes, edges, setMode, setNodes, setEdges, setNamespaces } = useContainerStore()

  const services  = nodes.filter((n) => n.type === 'service')
  const databases = nodes.filter((n) => n.type === 'database')
  const volumes   = nodes.filter((n) => n.type === 'volume')
  const networks  = nodes.filter((n) => n.type === 'network')

  const migrationPlan = [
    services.length  > 0 && `${services.length} service${services.length > 1 ? 's' : ''}  →  ${services.length} Deployment${services.length > 1 ? 's' : ''} + ${services.length} Service${services.length > 1 ? 's' : ''}`,
    databases.length > 0 && `${databases.length} database${databases.length > 1 ? 's' : ''} →  ${databases.length} StatefulSet${databases.length > 1 ? 's' : ''} + ${databases.length} PVC${databases.length > 1 ? 's' : ''}`,
    volumes.length   > 0 && `${volumes.length} volume${volumes.length > 1 ? 's' : ''}   →  ${volumes.length} PersistentVolumeClaim${volumes.length > 1 ? 's' : ''}`,
    networks.length  > 0 && `${networks.length} network${networks.length > 1 ? 's' : ''}  →  (replaced by NetworkPolicy)`,
  ].filter(Boolean) as string[]

  const handleMigrate = () => {
    const result = migrateComposeToK8s(nodes, edges)
    setNodes(result.nodes)
    setEdges(result.edges)
    setNamespaces(result.namespaces)
    setMode('kubernetes')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="compose-to-k8s-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            width: 460,
            fontFamily: '"DM Sans", sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                Upgrade to Kubernetes
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 1.5 }}>
                Your Docker Compose stack will be converted to production-ready Kubernetes manifests.
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={13} color="#6B7280" />
            </button>
          </div>

          {/* Migration plan */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Migration Plan
            </div>

            {migrationPlan.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9CA3AF', padding: '12px 0' }}>
                No nodes to migrate. Add some services first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {migrationPlan.map((line, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 7, border: '1px solid #E5E7EB' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#16A34A" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 12, color: '#374151', fontFamily: '"JetBrains Mono", monospace' }}>
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14, padding: '10px 12px', background: '#FFF9F0', border: '1px solid #FDE68A', borderRadius: 7, fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
              💡 All nodes will be placed in a <strong>default</strong> namespace. You can add additional namespace boxes afterwards.
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              padding: '12px 20px 18px',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              borderTop: '1px solid #F3F4F6',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 7, border: '1px solid #E5E7EB',
                background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                color: '#374151', fontFamily: '"DM Sans", sans-serif', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Cancel
            </button>
            <button
              onClick={handleMigrate}
              disabled={migrationPlan.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                borderRadius: 7, border: 'none',
                background: migrationPlan.length === 0 ? '#E5E7EB' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                color: migrationPlan.length === 0 ? '#9CA3AF' : '#fff',
                cursor: migrationPlan.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: '"DM Sans", sans-serif',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (migrationPlan.length > 0) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Migrate to Kubernetes
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

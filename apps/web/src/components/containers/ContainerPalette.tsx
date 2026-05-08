/**
 * ContainerPalette.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 64px left icon rail for the Container Designer.  Content changes based on
 * the active mode (compose / kubernetes / managed).
 *
 * Drag a tile → canvas fires onDrop → addNode().
 */

import {
  Server, Database, HardDrive, Network, Layers, Box,
  Globe, ArrowRightLeft, FileText, Lock, TrendingUp,
  Shield, UserCheck, Cloud, Key, Cpu, Layers2,
  type LucideIcon,
} from 'lucide-react'
import { useContainerStore } from '@/store/containerStore'
import type { ContainerNodeType, ContainerMode, CloudProvider } from '@/types/containers'

// ─── Tile definitions ─────────────────────────────────────────────────────────

interface TileDef {
  type: ContainerNodeType
  label: string
  color: string
  icon: LucideIcon
}

const COMPOSE_TILES: TileDef[] = [
  { type: 'service',  label: 'Service',  color: '#3B82F6', icon: Server   },
  { type: 'database', label: 'Database', color: '#22C55E', icon: Database },
  { type: 'volume',   label: 'Volume',   color: '#6B7280', icon: HardDrive},
  { type: 'network',  label: 'Network',  color: '#EC4899', icon: Network  },
]

const K8S_TILES: TileDef[] = [
  { type: 'deployment',    label: 'Deployment',    color: '#3B82F6', icon: Layers      },
  { type: 'statefulset',   label: 'StatefulSet',   color: '#8B5CF6', icon: Database    },
  { type: 'daemonset',     label: 'DaemonSet',     color: '#F97316', icon: Server      },
  { type: 'k8s_service',   label: 'Service',       color: '#22C55E', icon: Globe       },
  { type: 'ingress',       label: 'Ingress',       color: '#EC4899', icon: ArrowRightLeft },
  { type: 'configmap',     label: 'ConfigMap',     color: '#F59E0B', icon: FileText    },
  { type: 'secret',        label: 'Secret',        color: '#EF4444', icon: Lock        },
  { type: 'pvc',           label: 'PVC',           color: '#6B7280', icon: HardDrive   },
  { type: 'hpa',           label: 'HPA',           color: '#14B8A6', icon: TrendingUp  },
  { type: 'networkpolicy', label: 'NetPolicy',     color: '#64748B', icon: Shield      },
  { type: 'serviceaccount',label: 'SvcAccount',    color: '#A855F7', icon: UserCheck   },
]

const EKS_TILES: TileDef[] = [
  { type: 'nodegroup',      label: 'Node Group',     color: '#F97316', icon: Cpu   },
  { type: 'fargateprofile', label: 'Fargate',        color: '#3B82F6', icon: Cloud },
  { type: 'irsa',           label: 'IRSA',           color: '#F59E0B', icon: Key   },
]

const GKE_TILES: TileDef[] = [
  { type: 'gke_nodepool',           label: 'Node Pool',  color: '#4285F4', icon: Cpu   },
  { type: 'gke_workload_identity',  label: 'WI',         color: '#F59E0B', icon: Key   },
]

const AKS_TILES: TileDef[] = [
  { type: 'aks_nodepool',        label: 'Node Pool',      color: '#0078D4', icon: Cpu },
  { type: 'aks_managed_identity',label: 'Managed ID',     color: '#F59E0B', icon: Key },
]

function cloudTiles(provider: CloudProvider): TileDef[] {
  if (provider === 'eks') return EKS_TILES
  if (provider === 'gke') return GKE_TILES
  return AKS_TILES
}

// ─── Single tile ──────────────────────────────────────────────────────────────

function PaletteTile({ tile }: { tile: TileDef }) {
  const Icon = tile.icon

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/container-node', tile.type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={tile.label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        background: tile.color + '18',
        border: `1px solid ${tile.color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        flexShrink: 0,
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'scale(1.08)'
        el.style.boxShadow = `0 2px 8px ${tile.color}40`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'scale(1)'
        el.style.boxShadow = 'none'
      }}
    >
      <Icon size={19} color={tile.color} strokeWidth={1.8} />
    </div>
  )
}

function Divider() {
  return <div style={{ width: 32, height: 1, background: '#E5E7EB', margin: '4px 0' }} />
}

function SectionLabel({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: '#9CA3AF',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        fontFamily: '"DM Sans", sans-serif',
        userSelect: 'none',
      }}
    >
      {label}
    </span>
  )
}

// ─── Namespace / group add button ─────────────────────────────────────────────

function AddNamespaceButton() {
  const addNamespace = useContainerStore((s) => s.addNamespace)

  return (
    <div
      onClick={() => addNamespace('production', { x: 80, y: 80 })}
      title="Add Namespace box"
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        border: '1.5px dashed #94A3B8',
        background: 'rgba(241,245,249,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(241,245,249,0.95)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(241,245,249,0.6)')}
    >
      <Layers2 size={13} color="#94A3B8" strokeWidth={2} />
      <span style={{ fontSize: 7, fontWeight: 700, color: '#94A3B8', fontFamily: '"DM Sans", sans-serif', letterSpacing: '0.05em' }}>
        NS
      </span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContainerPalette() {
  const mode = useContainerStore((s) => s.mode)
  const cloudProvider = useContainerStore((s) => s.cloudProvider)

  const tiles = (mode: ContainerMode): TileDef[] => {
    if (mode === 'compose') return COMPOSE_TILES
    if (mode === 'kubernetes') return K8S_TILES
    return [...K8S_TILES, ...cloudTiles(cloudProvider)]
  }

  const sections = mode ? tiles(mode) : []
  const isManagedOrK8s = mode === 'kubernetes' || mode === 'managed'

  return (
    <div
      style={{
        width: 64,
        height: '100%',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 14,
        gap: 7,
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {mode === 'compose' ? (
        <>
          <SectionLabel label="Compose" />
          {COMPOSE_TILES.map((t) => <PaletteTile key={t.type} tile={t} />)}
        </>
      ) : mode === 'kubernetes' ? (
        <>
          <SectionLabel label="K8s" />
          {K8S_TILES.map((t) => <PaletteTile key={t.type} tile={t} />)}
          <Divider />
          <AddNamespaceButton />
        </>
      ) : (
        <>
          <SectionLabel label="K8s" />
          {K8S_TILES.map((t) => <PaletteTile key={t.type} tile={t} />)}
          <Divider />
          <SectionLabel label={cloudProvider.toUpperCase()} />
          {cloudTiles(cloudProvider).map((t) => <PaletteTile key={t.type} tile={t} />)}
          <Divider />
          <AddNamespaceButton />
        </>
      )}

      {/* Bottom drag hint */}
      {isManagedOrK8s && (
        <>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 8,
              color: '#9CA3AF',
              fontWeight: 500,
              letterSpacing: '0.5px',
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
              fontFamily: '"DM Sans", sans-serif',
              userSelect: 'none',
              paddingBottom: 4,
            }}
          >
            DRAG TO ADD
          </span>
        </>
      )}
    </div>
  )
}

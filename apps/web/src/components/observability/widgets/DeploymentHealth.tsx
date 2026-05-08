import { Rocket } from 'lucide-react'
import BaseWidget from './BaseWidget'

const SERVICES = [
  { name: 'flowops-api',    replicas: '3/3', cpu: '34%',  mem: '48%',  status: 'healthy', age: '2h'  },
  { name: 'flowops-web',    replicas: '2/2', cpu: '12%',  mem: '22%',  status: 'healthy', age: '2h'  },
  { name: 'postgres',       replicas: '1/1', cpu: '8%',   mem: '61%',  status: 'healthy', age: '5d'  },
  { name: 'redis',          replicas: '1/1', cpu: '2%',   mem: '18%',  status: 'healthy', age: '5d'  },
  { name: 'worker',         replicas: '1/2', cpu: '88%',  mem: '74%',  status: 'degraded', age: '1h' },
]

function StatusDot({ status }: { status: string }) {
  const color = status === 'healthy' ? '#22C55E' : status === 'degraded' ? '#F59E0B' : '#EF4444'
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 0 2px ${color}30`,
      }}
    />
  )
}

function MiniBar({ pct, warn }: { pct: number; warn?: boolean }) {
  const color = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#22C55E'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 44, height: 4, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: warn ? color : '#6B7280', fontFamily: '"DM Sans", sans-serif', fontWeight: warn ? 600 : 400 }}>
        {pct}%
      </span>
    </div>
  )
}

export default function DeploymentHealth({ id }: { id: string }) {
  const degraded = SERVICES.filter((s) => s.status !== 'healthy').length

  return (
    <BaseWidget
      id={id}
      title="Deployment Health"
      icon={Rocket}
      iconColor="#22C55E"
      width={380}
      height={240}
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 56px 1fr 1fr 36px',
            gap: 4,
            padding: '4px 12px',
            fontSize: 9,
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: '"DM Sans", sans-serif',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <span>Service</span>
          <span>Pods</span>
          <span>CPU</span>
          <span>Mem</span>
          <span></span>
        </div>
        {SERVICES.map((s) => {
          const cpuPct = parseInt(s.cpu)
          const memPct = parseInt(s.mem)
          return (
            <div
              key={s.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 56px 1fr 1fr 36px',
                gap: 4,
                padding: '7px 12px',
                borderBottom: '1px solid #F3F4F6',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
                {s.name}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"JetBrains Mono", monospace' }}>
                {s.replicas}
              </span>
              <MiniBar pct={cpuPct} warn={cpuPct > 80} />
              <MiniBar pct={memPct} warn={memPct > 75} />
              <StatusDot status={s.status} />
            </div>
          )
        })}
      </div>
    </BaseWidget>
  )
}

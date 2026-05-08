import { Box } from 'lucide-react'
import BaseWidget from './BaseWidget'

const BUILDS = [
  { tag: 'a3f9c12', size: '182 MB', duration: '4m 11s', status: 'pushed',  registry: 'ghcr',   time: '42m ago' },
  { tag: 'b8e21aa', size: '181 MB', duration: '3m 58s', status: 'pushed',  registry: 'ghcr',   time: '3h ago'  },
  { tag: 'c4d05fb', size: '184 MB', duration: '4m 22s', status: 'failed',  registry: '—',      time: '5h ago'  },
  { tag: 'd2b3911', size: '180 MB', duration: '4m 05s', status: 'pushed',  registry: 'ecr',    time: '1d ago'  },
  { tag: 'e9a0c3d', size: '179 MB', duration: '3m 51s', status: 'pushed',  registry: 'ecr',    time: '2d ago'  },
]

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pushed: { color: '#22C55E', bg: '#F0FDF4' },
  failed: { color: '#EF4444', bg: '#FEF2F2' },
  building:{ color: '#3B82F6', bg: '#EFF6FF' },
}

export default function DockerBuildStatus({ id }: { id: string }) {
  return (
    <BaseWidget
      id={id}
      title="Docker Builds"
      icon={Box}
      iconColor="#0EA5E9"
      width={360}
      height={240}
    >
      <div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '72px 64px 68px 1fr 80px',
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
          <span>Tag</span>
          <span>Size</span>
          <span>Duration</span>
          <span>Registry</span>
          <span>When</span>
        </div>
        {BUILDS.map((b) => {
          const style = STATUS_STYLE[b.status]
          return (
            <div
              key={b.tag}
              style={{
                display: 'grid',
                gridTemplateColumns: '72px 64px 68px 1fr 80px',
                gap: 4,
                padding: '7px 12px',
                borderBottom: '1px solid #F3F4F6',
                alignItems: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              <span style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#374151', fontWeight: 600 }}>
                {b.tag}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
                {b.size}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280', fontFamily: '"JetBrains Mono", monospace' }}>
                {b.duration}
              </span>
              <span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: style.color,
                    background: style.bg,
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {b.status === 'pushed' ? `↑ ${b.registry}` : b.status}
                </span>
              </span>
              <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                {b.time}
              </span>
            </div>
          )
        })}
      </div>
    </BaseWidget>
  )
}

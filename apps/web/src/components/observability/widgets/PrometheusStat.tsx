import { Activity } from 'lucide-react'
import BaseWidget from './BaseWidget'

const METRICS = [
  { name: 'http_requests_total',     value: '2.4M',  label: 'last 1h',   color: '#3B82F6' },
  { name: 'http_request_duration_p99', value: '142ms', label: 'p99',      color: '#F59E0B' },
  { name: 'error_rate',              value: '0.12%', label: 'last 5m',   color: '#22C55E' },
  { name: 'active_connections',      value: '284',   label: 'current',   color: '#8B5CF6' },
  { name: 'cpu_usage_avg',           value: '34%',   label: 'all pods',  color: '#06B6D4' },
  { name: 'memory_usage_avg',        value: '1.2 GB', label: 'all pods', color: '#EC4899' },
]

export default function PrometheusStat({ id }: { id: string }) {
  return (
    <BaseWidget
      id={id}
      title="Prometheus Metrics"
      icon={Activity}
      iconColor="#EF4444"
      width={300}
      height={264}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {METRICS.map((m) => (
          <div
            key={m.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: m.color,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#374151',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {m.name}
              </div>
              <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                {m.label}
              </div>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: m.color,
                fontFamily: '"DM Sans", sans-serif',
                flexShrink: 0,
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </BaseWidget>
  )
}

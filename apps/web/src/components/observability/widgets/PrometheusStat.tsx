import { Activity } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { usePrometheusStats } from '@/hooks/usePrometheus'

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_STATS = [
  { label: 'http_requests_total',       value: '2.4M',  color: '#3B82F6', sub: 'last 1h'  },
  { label: 'http_request_duration_p99', value: '142ms', color: '#F59E0B', sub: 'p99'      },
  { label: 'error_rate',                value: '0.12%', color: '#22C55E', sub: 'last 5m'  },
  { label: 'active_connections',        value: '284',   color: '#8B5CF6', sub: 'current'  },
  { label: 'cpu_usage_avg',             value: '34%',   color: '#06B6D4', sub: 'all pods' },
]

const METRIC_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#06B6D4', '#EC4899']

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrometheusStat({ id }: { id: string }) {
  const { stats, loading, error, configured } = usePrometheusStats()

  const rows = configured && stats.length > 0
    ? stats.map((s, i) => ({ label: s.label, value: s.value, color: METRIC_COLORS[i % METRIC_COLORS.length], sub: '' }))
    : MOCK_STATS

  return (
    <BaseWidget
      id={id}
      title="Prometheus Metrics"
      icon={Activity}
      iconColor="#EF4444"
      loading={loading && stats.length === 0}
      error={error}
      unconfigured={!configured}
      integrationName="Prometheus"
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((m) => (
          <div
            key={m.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px', borderBottom: '1px solid #F3F4F6',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#374151',
                fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {m.label}
              </div>
              {m.sub && (
                <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                  {m.sub}
                </div>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: '"DM Sans", sans-serif', flexShrink: 0 }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </BaseWidget>
  )
}

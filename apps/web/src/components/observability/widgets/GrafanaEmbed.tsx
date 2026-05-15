import { BarChart3 } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useRequestRateSeries } from '@/hooks/usePrometheus'
import { useSettingsStore, isGrafanaConfigured, isPrometheusConfigured } from '@/store/settingsStore'

// ─── Reusable SVG bar chart ───────────────────────────────────────────────────

function BarChart({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max  = Math.max(...data, 1)
  const W    = 292
  const H    = 72
  const barW = W / data.length - 2

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((v, i) => {
        const barH = Math.max(3, (v / max) * (H - 8))
        const x    = i * (barW + 2)
        return (
          <rect
            key={i}
            x={x} y={H - barH}
            width={barW} height={barH}
            rx={2}
            fill={color}
            fillOpacity={i === data.length - 1 ? 1 : 0.6}
          />
        )
      })}
    </svg>
  )
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_RPM = [142, 158, 171, 189, 203, 198, 212, 224, 218, 231, 219, 208]

// ─── Component ────────────────────────────────────────────────────────────────

export default function GrafanaEmbed({ id }: { id: string }) {
  const grafana    = useSettingsStore((s) => s.grafana)
  const prometheus = useSettingsStore((s) => s.prometheus)

  // Prefer Grafana iframe if configured; else pull from Prometheus; else show mock
  const grafanaReady = isGrafanaConfigured(grafana)
  const promReady    = isPrometheusConfigured(prometheus)

  const { points, loading, error } = useRequestRateSeries(60)

  const liveData  = points.map((p) => p.y)
  const chartData = promReady && liveData.length > 0 ? liveData : MOCK_RPM

  const current = chartData[chartData.length - 1] ?? 0
  const peak    = Math.max(...chartData)
  const avg     = Math.round(chartData.reduce((a, b) => a + b, 0) / (chartData.length || 1))

  // If Grafana is configured: embed iframe panel
  if (grafanaReady) {
    const panelUrl = [
      grafana.endpoint.replace(/\/$/, ''),
      `d-solo/${grafana.dashboardUid}/panel`,
      `?panelId=${grafana.panelId}`,
      `&from=now-1h&to=now`,
      `&theme=light`,
      `&auth_token=${grafana.apiKey}`,
    ].join('')

    return (
      <BaseWidget
        id={id}
        title="Grafana — Requests/min"
        icon={BarChart3}
        iconColor="#F97316"
        loading={false}
        error={null}
      >
        <iframe
          src={panelUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Grafana Panel"
          sandbox="allow-scripts allow-same-origin"
        />
      </BaseWidget>
    )
  }

  return (
    <BaseWidget
      id={id}
      title={promReady ? 'Requests/min (Prometheus)' : 'Grafana — Requests/min'}
      icon={BarChart3}
      iconColor="#F97316"
      loading={loading && liveData.length === 0}
      error={error}
      unconfigured={!grafanaReady && !promReady}
      integrationName="Grafana or Prometheus"
    >
      <div style={{ padding: '10px 14px 6px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
          {[
            { label: 'Now',  val: `${Math.round(current)}`, color: '#F97316' },
            { label: 'Peak', val: `${Math.round(peak)}`,    color: '#9CA3AF' },
            { label: 'Avg',  val: `${Math.round(avg)}`,     color: '#9CA3AF' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Sans", sans-serif' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: '"DM Sans", sans-serif' }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>
        <BarChart data={chartData} color="#F97316" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 3 }}>
          <span>−1h</span>
          <span>now</span>
        </div>
      </div>
    </BaseWidget>
  )
}

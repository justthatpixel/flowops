import { BarChart3 } from 'lucide-react'
import BaseWidget from './BaseWidget'

// Fake bar chart data (requests per minute, 12 bars)
const RPM = [142, 158, 171, 189, 203, 198, 212, 224, 218, 231, 219, 208]
const LABELS = ['9:00','9:05','9:10','9:15','9:20','9:25','9:30','9:35','9:40','9:45','9:50','9:55']

function BarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const W = 292
  const H = 72
  const barW = (W / data.length) - 3

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((v, i) => {
        const barH = (v / max) * (H - 10) + 4
        const x = i * (barW + 3)
        return (
          <g key={i}>
            <rect
              x={x}
              y={H - barH}
              width={barW}
              height={barH}
              rx={2}
              fill={color}
              fillOpacity={i === data.length - 1 ? 1 : 0.65}
            />
          </g>
        )
      })}
    </svg>
  )
}

export default function GrafanaEmbed({ id }: { id: string }) {
  const current = RPM[RPM.length - 1]
  const peak    = Math.max(...RPM)
  const avg     = Math.round(RPM.reduce((a, b) => a + b, 0) / RPM.length)

  return (
    <BaseWidget
      id={id}
      title="Grafana — Requests/min"
      icon={BarChart3}
      iconColor="#F97316"
      width={340}
      height={200}
    >
      <div style={{ padding: '10px 14px 6px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
          {[
            { label: 'Now',  val: `${current}`,     color: '#F97316' },
            { label: 'Peak', val: `${peak}`,         color: '#9CA3AF' },
            { label: 'Avg',  val: `${avg}`,          color: '#9CA3AF' },
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
        <BarChart data={RPM} color="#F97316" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 3 }}>
          <span>{LABELS[0]}</span>
          <span>{LABELS[LABELS.length - 1]}</span>
        </div>
      </div>
    </BaseWidget>
  )
}

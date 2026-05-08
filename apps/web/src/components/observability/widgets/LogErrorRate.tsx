import { AlertTriangle } from 'lucide-react'
import BaseWidget from './BaseWidget'

// Fake 24-point time series (last 24 hours)
const DATA = [
  0.2, 0.1, 0.1, 0.0, 0.3, 0.2, 0.1, 0.0,
  0.1, 0.2, 0.4, 1.8, 0.6, 0.3, 0.2, 0.1,
  0.2, 0.3, 0.1, 0.2, 0.1, 0.3, 0.2, 0.1,
]

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 268
  const H = 48
  const max = Math.max(...data, 0.01)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - (v / max) * H * 0.9 - 4
    return `${x},${y}`
  })
  const path = `M ${pts.join(' L ')}`
  const areaPath = `M ${pts[0]} L ${pts.join(' L ')} L ${W},${H} L 0,${H} Z`

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="err-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#err-grad)" />
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function LogErrorRate({ id }: { id: string }) {
  const current = DATA[DATA.length - 1]
  const peak = Math.max(...DATA)
  const avg = DATA.reduce((a, b) => a + b, 0) / DATA.length

  return (
    <BaseWidget
      id={id}
      title="Log Error Rate"
      icon={AlertTriangle}
      iconColor="#EF4444"
      width={320}
      height={200}
    >
      <div style={{ padding: '10px 14px 8px' }}>
        {/* Summary row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
          {[
            { label: 'Current', val: `${current.toFixed(1)}%`, color: current > 0.5 ? '#EF4444' : '#22C55E' },
            { label: 'Peak 24h', val: `${peak.toFixed(1)}%`,   color: peak > 1 ? '#F59E0B' : '#9CA3AF' },
            { label: 'Avg 24h',  val: `${avg.toFixed(2)}%`,    color: '#9CA3AF' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Sans", sans-serif' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: '"DM Sans", sans-serif' }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>
        {/* Sparkline */}
        <Sparkline data={DATA} color="#EF4444" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 3 }}>
          <span>24h ago</span>
          <span>now</span>
        </div>
      </div>
    </BaseWidget>
  )
}

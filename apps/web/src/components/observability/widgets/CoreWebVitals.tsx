import { Gauge } from 'lucide-react'
import BaseWidget from './BaseWidget'

interface Metric {
  name: string
  abbr: string
  value: string
  score: number
  unit: string
  good: number
  poor: number
}

const METRICS: Metric[] = [
  { name: 'Largest Contentful Paint',  abbr: 'LCP',  value: '1.8',  score: 94, unit: 's',  good: 2.5,  poor: 4   },
  { name: 'First Input Delay',         abbr: 'FID',  value: '8',    score: 98, unit: 'ms', good: 100,  poor: 300 },
  { name: 'Cumulative Layout Shift',   abbr: 'CLS',  value: '0.04', score: 97, unit: '',   good: 0.1,  poor: 0.25 },
  { name: 'First Contentful Paint',    abbr: 'FCP',  value: '0.9',  score: 96, unit: 's',  good: 1.8,  poor: 3   },
  { name: 'Time to First Byte',        abbr: 'TTFB', value: '180',  score: 88, unit: 'ms', good: 800,  poor: 1800 },
]

function scoreColor(score: number) {
  if (score >= 90) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function ScoreRing({ score }: { score: number }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = scoreColor(score)
  return (
    <svg width={36} height={36} style={{ flexShrink: 0 }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="#F3F4F6" strokeWidth={3} />
      <circle
        cx={18} cy={18} r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x={18} y={22} textAnchor="middle" fontSize={9} fontWeight={700} fill={color} fontFamily='"DM Sans", sans-serif'>
        {score}
      </text>
    </svg>
  )
}

export default function CoreWebVitals({ id }: { id: string }) {
  const avgScore = Math.round(METRICS.reduce((s, m) => s + m.score, 0) / METRICS.length)

  return (
    <BaseWidget
      id={id}
      title="Core Web Vitals"
      icon={Gauge}
      iconColor="#06B6D4"
      headerRight={
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: scoreColor(avgScore),
            background: scoreColor(avgScore) + '18',
            padding: '2px 7px',
            borderRadius: 6,
          }}
        >
          {avgScore}
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {METRICS.map((m) => (
          <div
            key={m.abbr}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            <ScoreRing score={m.score} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
                {m.abbr}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                {m.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: scoreColor(m.score),
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {m.value}{m.unit}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BaseWidget>
  )
}

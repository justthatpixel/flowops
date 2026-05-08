import { TestTube2 } from 'lucide-react'
import BaseWidget from './BaseWidget'

const RESULTS = [
  { name: 'auth.spec.ts',        passed: 12, failed: 1,  browser: 'firefox' },
  { name: 'dashboard.spec.ts',   passed: 24, failed: 0,  browser: 'chromium' },
  { name: 'pipeline.spec.ts',    passed: 18, failed: 0,  browser: 'chromium' },
  { name: 'infra.spec.ts',       passed: 15, failed: 2,  browser: 'webkit'   },
  { name: 'terminal.spec.ts',    passed: 9,  failed: 0,  browser: 'chromium' },
]

export default function PlaywrightResults({ id }: { id: string }) {
  const total  = RESULTS.reduce((s, r) => s + r.passed + r.failed, 0)
  const passed = RESULTS.reduce((s, r) => s + r.passed, 0)
  const failed = RESULTS.reduce((s, r) => s + r.failed, 0)

  return (
    <BaseWidget
      id={id}
      title="Playwright"
      icon={TestTube2}
      iconColor="#22C55E"
      width={320}
      height={240}
      headerRight={
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: failed > 0 ? '#EF4444' : '#22C55E',
            background: failed > 0 ? '#FEF2F2' : '#F0FDF4',
            padding: '1px 6px',
            borderRadius: 99,
          }}
        >
          {passed}/{total}
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {RESULTS.map((r) => {
          const pct = Math.round((r.passed / (r.passed + r.failed)) * 100)
          return (
            <div
              key={r.name}
              style={{ padding: '6px 12px', borderBottom: '1px solid #F3F4F6' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
                  {r.name}
                </span>
                <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                  {r.browser}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: '#F3F4F6',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: r.failed > 0 ? '#F59E0B' : '#22C55E',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: r.failed > 0 ? '#EF4444' : '#22C55E', fontFamily: '"DM Sans", sans-serif', flexShrink: 0 }}>
                  {r.failed > 0 ? `${r.failed} fail` : '✓'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </BaseWidget>
  )
}

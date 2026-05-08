import { CheckCircle2, XCircle, Clock, Loader2, Hammer } from 'lucide-react'
import BaseWidget from './BaseWidget'

const JOBS = [
  { name: 'lint',              status: 'success', duration: '28s'  },
  { name: 'type-check',        status: 'success', duration: '44s'  },
  { name: 'build',             status: 'success', duration: '8m 43s' },
  { name: 'test:unit',         status: 'success', duration: '1m 58s' },
  { name: 'test:e2e',          status: 'failed',  duration: '3m 28s' },
  { name: 'docker:build',      status: 'success', duration: '4m 11s' },
  { name: 'trivy:scan',        status: 'success', duration: '14s'  },
  { name: 'deploy:staging',    status: 'running', duration: '—'     },
]

const STATUS_ICON: Record<string, JSX.Element> = {
  success: <CheckCircle2 size={12} strokeWidth={2} color="#22C55E" />,
  failed:  <XCircle     size={12} strokeWidth={2} color="#EF4444" />,
  skipped: <Clock       size={12} strokeWidth={2} color="#9CA3AF" />,
  running: <Loader2     size={12} strokeWidth={2} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />,
}

const STATUS_COLOR: Record<string, string> = {
  success: '#22C55E',
  failed:  '#EF4444',
  skipped: '#9CA3AF',
  running: '#3B82F6',
}

export default function CIStatus({ id }: { id: string }) {
  const passed  = JOBS.filter((j) => j.status === 'success').length
  const failed  = JOBS.filter((j) => j.status === 'failed').length
  const running = JOBS.filter((j) => j.status === 'running').length

  return (
    <BaseWidget
      id={id}
      title="CI Status"
      icon={Hammer}
      iconColor="#F59E0B"
      width={300}
      height={280}
      headerRight={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {failed > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', padding: '1px 6px', borderRadius: 99 }}>
              {failed} failed
            </span>
          )}
          {running > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', padding: '1px 6px', borderRadius: 99 }}>
              running
            </span>
          )}
          {failed === 0 && running === 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#22C55E', background: '#F0FDF4', padding: '1px 6px', borderRadius: 99 }}>
              {passed}/{JOBS.length} passed
            </span>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {JOBS.map((job) => (
          <div
            key={job.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderBottom: '1px solid #F3F4F6',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
          >
            <div style={{ flexShrink: 0 }}>{STATUS_ICON[job.status]}</div>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
              {job.name}
            </span>
            <span
              style={{
                fontSize: 10,
                color: STATUS_COLOR[job.status],
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 500,
              }}
            >
              {job.duration}
            </span>
          </div>
        ))}
      </div>
    </BaseWidget>
  )
}

import { Box } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useGitHubDockerRuns } from '@/hooks/useGitHub'
import { fmtDuration, fmtRelative } from '@/lib/integrations/github'
import type { GHWorkflowRun } from '@/lib/integrations/github'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type BuildStatus = 'pushed' | 'failed' | 'building'

function runToStatus(run: GHWorkflowRun): BuildStatus {
  if (run.status !== 'completed') return 'building'
  return run.conclusion === 'success' ? 'pushed' : 'failed'
}

const STATUS_STYLE: Record<BuildStatus, { color: string; bg: string }> = {
  pushed:   { color: '#22C55E', bg: '#F0FDF4' },
  failed:   { color: '#EF4444', bg: '#FEF2F2' },
  building: { color: '#3B82F6', bg: '#EFF6FF' },
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK: GHWorkflowRun[] = [
  { id: 1, workflowName: 'Docker Build & Push', status: 'completed', conclusion: 'success', durationSec: 251, branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: new Date(Date.now() - 42 * 60_000).toISOString(),  actor: 'alice', actorAvatar: '' },
  { id: 2, workflowName: 'Docker Build & Push', status: 'completed', conclusion: 'success', durationSec: 238, branch: 'main', shortSha: 'b8e21aa', url: '#', createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(), actor: 'bob',   actorAvatar: '' },
  { id: 3, workflowName: 'Docker Build & Push', status: 'completed', conclusion: 'failure', durationSec: 262, branch: 'fix/deps', shortSha: 'c4d05fb', url: '#', createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(), actor: 'alice', actorAvatar: '' },
  { id: 4, workflowName: 'Docker Build & Push', status: 'completed', conclusion: 'success', durationSec: 245, branch: 'main', shortSha: 'd2b3911', url: '#', createdAt: new Date(Date.now() - 86400_000).toISOString(),     actor: 'carol', actorAvatar: '' },
  { id: 5, workflowName: 'Docker Build & Push', status: 'completed', conclusion: 'success', durationSec: 231, branch: 'main', shortSha: 'e9a0c3d', url: '#', createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(), actor: 'bob',   actorAvatar: '' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DockerBuildStatus({ id }: { id: string }) {
  const { runs, loading, error, configured } = useGitHubDockerRuns()
  const rows: GHWorkflowRun[] = configured && runs.length > 0 ? runs : MOCK

  return (
    <BaseWidget
      id={id}
      title="Docker Builds"
      icon={Box}
      iconColor="#0EA5E9"
      loading={loading && runs.length === 0}
      error={error}
      unconfigured={!configured}
      integrationName="GitHub"
    >
      <div>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '64px 1fr 72px 72px',
          gap: 4, padding: '4px 12px',
          fontSize: 9, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          fontFamily: '"DM Sans", sans-serif', borderBottom: '1px solid #F3F4F6',
        }}>
          <span>SHA</span>
          <span>Branch</span>
          <span>Duration</span>
          <span>When</span>
        </div>

        {rows.map((run) => {
          const status = runToStatus(run)
          const style  = STATUS_STYLE[status]
          return (
            <a
              key={run.id}
              href={run.url !== '#' ? run.url : undefined}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '64px 1fr 72px 72px',
                  gap: 4, padding: '7px 12px', borderBottom: '1px solid #F3F4F6',
                  alignItems: 'center', transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
              >
                <span style={{
                  fontSize: 10, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600,
                  color: style.color,
                }}>
                  {run.shortSha}
                </span>
                <span style={{
                  fontSize: 11, color: '#374151', fontFamily: '"DM Sans", sans-serif',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: style.color, background: style.bg,
                    padding: '1px 5px', borderRadius: 4, marginRight: 5,
                  }}>
                    {status === 'pushed' ? '↑' : status === 'building' ? '…' : '✗'}
                  </span>
                  {run.branch}
                </span>
                <span style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#6B7280' }}>
                  {run.durationSec !== null ? fmtDuration(run.durationSec) : '—'}
                </span>
                <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif' }}>
                  {run.createdAt ? fmtRelative(run.createdAt) : '—'}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </BaseWidget>
  )
}

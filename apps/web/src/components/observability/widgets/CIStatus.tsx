import { CheckCircle2, XCircle, Clock, Loader2, Hammer, ExternalLink } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useGitHubWorkflowRuns } from '@/hooks/useGitHub'
import { fmtDuration, fmtRelative } from '@/lib/integrations/github'
import type { GHWorkflowRun } from '@/lib/integrations/github'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DisplayStatus = 'success' | 'failed' | 'running' | 'skipped'

function getDisplayStatus(run: GHWorkflowRun): DisplayStatus {
  if (run.status !== 'completed') return 'running'
  if (run.conclusion === 'success')  return 'success'
  if (run.conclusion === 'skipped')  return 'skipped'
  return 'failed'
}

const STATUS_ICON: Record<DisplayStatus, JSX.Element> = {
  success: <CheckCircle2 size={12} strokeWidth={2} color="#22C55E" />,
  failed:  <XCircle      size={12} strokeWidth={2} color="#EF4444" />,
  skipped: <Clock        size={12} strokeWidth={2} color="#9CA3AF" />,
  running: <Loader2      size={12} strokeWidth={2} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />,
}

const STATUS_COLOR: Record<DisplayStatus, string> = {
  success: '#22C55E',
  failed:  '#EF4444',
  skipped: '#9CA3AF',
  running: '#3B82F6',
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_RUNS: GHWorkflowRun[] = [
  { id: 1, workflowName: 'lint',          status: 'completed', conclusion: 'success', durationSec: 28,   branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 2, workflowName: 'type-check',    status: 'completed', conclusion: 'success', durationSec: 44,   branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 3, workflowName: 'build',         status: 'completed', conclusion: 'success', durationSec: 523,  branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 4, workflowName: 'test:unit',     status: 'completed', conclusion: 'success', durationSec: 118,  branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 5, workflowName: 'test:e2e',      status: 'completed', conclusion: 'failure', durationSec: 208,  branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 6, workflowName: 'docker:build',  status: 'completed', conclusion: 'success', durationSec: 251,  branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 7, workflowName: 'trivy:scan',    status: 'completed', conclusion: 'success', durationSec: 14,   branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
  { id: 8, workflowName: 'deploy:staging',status: 'in_progress', conclusion: null,    durationSec: null, branch: 'main', shortSha: 'a3f9c12', url: '#', createdAt: '', actor: '', actorAvatar: '' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function CIStatus({ id }: { id: string }) {
  const { runs, loading, error, configured } = useGitHubWorkflowRuns()

  // Deduplicate: keep only the latest run per workflow name
  const deduped = (() => {
    const seen = new Map<string, GHWorkflowRun>()
    for (const r of runs) {
      if (!seen.has(r.workflowName)) seen.set(r.workflowName, r)
    }
    return Array.from(seen.values()).slice(0, 10)
  })()

  const rows = configured && deduped.length > 0 ? deduped : MOCK_RUNS

  const failed  = rows.filter((r) => getDisplayStatus(r) === 'failed').length
  const running = rows.filter((r) => getDisplayStatus(r) === 'running').length
  const passed  = rows.filter((r) => getDisplayStatus(r) === 'success').length

  return (
    <BaseWidget
      id={id}
      title="CI Status"
      icon={Hammer}
      iconColor="#F59E0B"
      loading={loading && runs.length === 0}
      error={error}
      unconfigured={!configured}
      integrationName="GitHub"
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
          {failed === 0 && running === 0 && rows.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#22C55E', background: '#F0FDF4', padding: '1px 6px', borderRadius: 99 }}>
              {passed}/{rows.length} passed
            </span>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((run) => {
          const ds = getDisplayStatus(run)
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
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderBottom: '1px solid #F3F4F6',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
              >
                <div style={{ flexShrink: 0 }}>{STATUS_ICON[ds]}</div>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: '"DM Sans", sans-serif', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.workflowName}
                </span>
                {configured && run.branch && (
                  <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', flexShrink: 0 }}>
                    {run.branch}
                  </span>
                )}
                <span style={{
                  fontSize: 10, color: STATUS_COLOR[ds],
                  fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, flexShrink: 0,
                }}>
                  {run.durationSec !== null ? fmtDuration(run.durationSec) : '—'}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </BaseWidget>
  )
}

import { GitCommit } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useGitHubCommits } from '@/hooks/useGitHub'
import { fmtRelative } from '@/lib/integrations/github'

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK = [
  { shortSha: 'a3f9c12', message: 'feat: add observability dashboard (Epic 4)', author: 'alice', timestamp: new Date(Date.now() - 42 * 60_000).toISOString(), branch: 'main', url: '#', sha: '', avatarUrl: '' },
  { shortSha: 'b8e21aa', message: 'feat: infra sidebar 38-type rewrite',        author: 'bob',   timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(),  branch: 'main', url: '#', sha: '', avatarUrl: '' },
  { shortSha: 'c4d05fb', message: 'fix: black flash bug on node selection',      author: 'alice', timestamp: new Date(Date.now() - 5 * 3600_000).toISOString(),  branch: 'main', url: '#', sha: '', avatarUrl: '' },
  { shortSha: 'd2b3911', message: 'feat: InfraDesigner Phase 1 canvas',          author: 'carol', timestamp: new Date(Date.now() - 86400_000).toISOString(),      branch: 'main', url: '#', sha: '', avatarUrl: '' },
  { shortSha: 'e9a0c3d', message: 'chore: upgrade @xyflow/react to v12',         author: 'bob',   timestamp: new Date(Date.now() - 2 * 86400_000).toISOString(), branch: 'main', url: '#', sha: '', avatarUrl: '' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommitFeed({ id }: { id: string }) {
  const { commits, loading, error, configured } = useGitHubCommits()
  const rows = configured && commits.length > 0 ? commits : MOCK

  return (
    <BaseWidget
      id={id}
      title="Commit Feed"
      icon={GitCommit}
      iconColor="#8B5CF6"
      loading={loading && commits.length === 0}
      error={error}
      unconfigured={!configured}
      integrationName="GitHub"
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((c) => (
          <a
            key={c.shortSha + c.timestamp}
            href={c.url !== '#' ? c.url : undefined}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '7px 12px', borderBottom: '1px solid #F3F4F6',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              <span style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#8B5CF6',
                fontWeight: 600, background: '#F5F3FF', padding: '1px 5px',
                borderRadius: 4, flexShrink: 0, marginTop: 1,
              }}>
                {c.shortSha}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 500, color: '#374151',
                  fontFamily: '"DM Sans", sans-serif',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.message}
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 1 }}>
                  {c.author} · {fmtRelative(c.timestamp)} · {c.branch}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </BaseWidget>
  )
}

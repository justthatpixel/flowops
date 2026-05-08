import { GitCommit } from 'lucide-react'
import BaseWidget from './BaseWidget'

const COMMITS = [
  { sha: 'a3f9c12', msg: 'feat: add observability dashboard (Epic 4)', author: 'alice', time: '42m ago', branch: 'main' },
  { sha: 'b8e21aa', msg: 'feat: infra sidebar 38-type rewrite', author: 'bob', time: '3h ago', branch: 'main' },
  { sha: 'c4d05fb', msg: 'fix: black flash bug on node selection', author: 'alice', time: '5h ago', branch: 'main' },
  { sha: 'd2b3911', msg: 'feat: InfraDesigner Phase 1 canvas', author: 'carol', time: '1d ago', branch: 'main' },
  { sha: 'e9a0c3d', msg: 'chore: upgrade @xyflow/react to v12', author: 'bob', time: '2d ago', branch: 'main' },
  { sha: 'f1e8b72', msg: 'docs: update README with setup steps', author: 'alice', time: '3d ago', branch: 'docs' },
]

export default function CommitFeed({ id }: { id: string }) {
  return (
    <BaseWidget id={id} title="Commit Feed" icon={GitCommit} iconColor="#8B5CF6" width={340} height={260}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {COMMITS.map((c) => (
          <div
            key={c.sha}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '7px 12px',
              borderBottom: '1px solid #F3F4F6',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
          >
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: '#8B5CF6',
                fontWeight: 600,
                background: '#F5F3FF',
                padding: '1px 5px',
                borderRadius: 4,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {c.sha}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#374151',
                  fontFamily: '"DM Sans", sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.msg}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 1 }}>
                {c.author} · {c.time} · {c.branch}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BaseWidget>
  )
}

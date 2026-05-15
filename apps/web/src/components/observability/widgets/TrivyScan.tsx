import { Shield } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { useGitHubDependabotAlerts } from '@/hooks/useGitHub'
import type { GHDependabotAlert } from '@/lib/integrations/github'

// ─── Styling helpers ──────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#6B7280', unknown: '#9CA3AF',
}
const SEV_BG: Record<string, string> = {
  critical: '#FEF2F2', high: '#FFF7ED', medium: '#FFFBEB', low: '#F3F4F6', unknown: '#F3F4F6',
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK: GHDependabotAlert[] = [
  { number: 1, state: 'open', severity: 'high',   summary: 'Path traversal in node HTTP parser',  packageName: 'node',    packageVersion: '20.11.0', fixedIn: '20.12.0', cve: 'CVE-2024-27982', url: '#' },
  { number: 2, state: 'open', severity: 'high',   summary: 'ReDoS vulnerability in tar',          packageName: 'tar',     packageVersion: '6.2.0',   fixedIn: '6.2.1',   cve: 'CVE-2024-28863', url: '#' },
  { number: 3, state: 'open', severity: 'medium', summary: 'Regular expression DoS in braces',    packageName: 'braces',  packageVersion: '3.0.2',   fixedIn: '3.0.3',   cve: 'CVE-2023-46234', url: '#' },
  { number: 4, state: 'open', severity: 'medium', summary: 'Open redirect in Express',            packageName: 'express', packageVersion: '4.18.3',  fixedIn: '4.19.2',  cve: 'CVE-2024-29041', url: '#' },
  { number: 5, state: 'open', severity: 'low',    summary: 'Prototype pollution in semver',       packageName: 'semver',  packageVersion: '7.5.4',   fixedIn: '7.6.0',   cve: 'CVE-2024-38990', url: '#' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrivyScan({ id }: { id: string }) {
  const { alerts, loading, error, configured } = useGitHubDependabotAlerts()
  const rows: GHDependabotAlert[] = configured && alerts.length > 0 ? alerts : MOCK

  const counts = rows.reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] ?? 0) + 1
    return acc
  }, {})

  const sevOrder = ['critical', 'high', 'medium', 'low']
  const sortedRows = [...rows].sort((a, b) =>
    sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity),
  )

  return (
    <BaseWidget
      id={id}
      title={configured ? 'Dependabot Alerts' : 'Trivy Scan'}
      icon={Shield}
      iconColor="#3B82F6"
      loading={loading && alerts.length === 0}
      error={error}
      unconfigured={!configured}
      integrationName="GitHub"
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          {sevOrder.filter((s) => counts[s]).map((sev) => (
            <span
              key={sev}
              style={{
                fontSize: 10, fontWeight: 600,
                color: SEV_COLOR[sev], background: SEV_BG[sev],
                padding: '1px 5px', borderRadius: 4,
              }}
            >
              {counts[sev]} {sev}
            </span>
          ))}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sortedRows.map((a) => (
          <a
            key={a.number}
            href={a.url !== '#' ? a.url : undefined}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 88px',
                gap: 8, padding: '7px 12px', borderBottom: '1px solid #F3F4F6', alignItems: 'start',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#F9FAFB')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: SEV_COLOR[a.severity], background: SEV_BG[a.severity],
                    padding: '1px 5px', borderRadius: 4,
                  }}>
                    {a.severity.toUpperCase()}
                  </span>
                  {a.cve && (
                    <span style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#374151', fontWeight: 600 }}>
                      {a.cve}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif', lineHeight: 1.3 }}>
                  {a.packageName}{' '}
                  {a.fixedIn && (
                    <span style={{ color: '#22C55E', fontWeight: 500 }}>→ {a.fixedIn}</span>
                  )}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </BaseWidget>
  )
}

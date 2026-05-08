import { Shield } from 'lucide-react'
import BaseWidget from './BaseWidget'

const VULNS = [
  { cve: 'CVE-2024-27982', pkg: 'node',    version: '20.11.0', fix: '20.12.0', sev: 'HIGH'   },
  { cve: 'CVE-2024-28863', pkg: 'tar',     version: '6.2.0',   fix: '6.2.1',   sev: 'HIGH'   },
  { cve: 'CVE-2023-46234', pkg: 'braces',  version: '3.0.2',   fix: '3.0.3',   sev: 'MEDIUM' },
  { cve: 'CVE-2024-29041', pkg: 'express', version: '4.18.3',  fix: '4.19.2',  sev: 'MEDIUM' },
  { cve: 'CVE-2024-38990', pkg: 'semver',  version: '7.5.4',   fix: '7.6.0',   sev: 'LOW'    },
]

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  MEDIUM:   '#F59E0B',
  LOW:      '#6B7280',
}

const SEV_BG: Record<string, string> = {
  CRITICAL: '#FEF2F2',
  HIGH:     '#FFF7ED',
  MEDIUM:   '#FFFBEB',
  LOW:      '#F3F4F6',
}

export default function TrivyScan({ id }: { id: string }) {
  const counts = VULNS.reduce<Record<string, number>>((acc, v) => {
    acc[v.sev] = (acc[v.sev] ?? 0) + 1
    return acc
  }, {})

  return (
    <BaseWidget
      id={id}
      title="Trivy Scan"
      icon={Shield}
      iconColor="#3B82F6"
      width={360}
      height={260}
      headerRight={
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(counts).map(([sev, n]) => (
            <span
              key={sev}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: SEV_COLOR[sev],
                background: SEV_BG[sev],
                padding: '1px 5px',
                borderRadius: 4,
              }}
            >
              {n} {sev.toLowerCase()}
            </span>
          ))}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {VULNS.map((v) => (
          <div
            key={v.cve}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 88px',
              gap: 8,
              padding: '7px 12px',
              borderBottom: '1px solid #F3F4F6',
              alignItems: 'start',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: SEV_COLOR[v.sev],
                    background: SEV_BG[v.sev],
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {v.sev}
                </span>
                <span style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#374151', fontWeight: 600 }}>
                  {v.cve}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
                {v.pkg} <span style={{ color: '#EF4444' }}>{v.version}</span>
                {' → '}
                <span style={{ color: '#22C55E' }}>{v.fix}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BaseWidget>
  )
}

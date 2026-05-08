import type { TriggerConfig } from '@/types/pipeline'
import { Field, Input, Select, Checkbox } from './formControls'
import { Github, GitlabIcon } from 'lucide-react'

interface Props {
  config: TriggerConfig
  onChange: (c: TriggerConfig) => void
}

export default function TriggerConfigForm({ config, onChange }: Props) {
  const set = (patch: Partial<TriggerConfig>) => onChange({ ...config, ...patch })

  const isGitHub = config.provider === 'github'
  const isGitLab = config.provider === 'gitlab'
  const hasRepo = config.provider !== 'manual'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Provider ────────────────────────────────────────────────────── */}
      <Field label="Provider">
        <Select
          value={config.provider}
          onChange={(v) => set({ provider: v as TriggerConfig['provider'] })}
          options={[
            { value: 'github', label: '  GitHub' },
            { value: 'gitlab', label: '  GitLab' },
            { value: 'manual', label: '  Manual' },
          ]}
        />
      </Field>

      {/* ── Repository ──────────────────────────────────────────────────── */}
      {hasRepo && (
        <Field label="Repository">
          <Input
            value={config.repo ?? ''}
            placeholder="owner/repo"
            onChange={(v) => set({ repo: v })}
          />
        </Field>
      )}

      {/* ── Branch ──────────────────────────────────────────────────────── */}
      <Field label="Branch">
        <Input
          value={config.branch ?? ''}
          placeholder="main"
          onChange={(v) => set({ branch: v })}
        />
      </Field>

      {/* ── Event ───────────────────────────────────────────────────────── */}
      <Field label="Trigger Event">
        <Select
          value={config.event}
          onChange={(v) => set({ event: v as TriggerConfig['event'] })}
          options={[
            { value: 'push',   label: 'Push to branch' },
            { value: 'pr',     label: 'Pull Request' },
            { value: 'tag',    label: 'Tag push (v*)' },
            { value: 'manual', label: 'Manual (workflow_dispatch)' },
          ]}
        />
      </Field>

      {/* ── GitHub Actions extras ────────────────────────────────────────── */}
      {isGitHub && (
        <>
          <SectionDivider label="GitHub Actions" />

          <Field label="Workflow Name">
            <Input
              value={config.workflowName ?? ''}
              placeholder="CI/CD Pipeline"
              onChange={(v) => set({ workflowName: v })}
            />
          </Field>

          <Field label="Path Filter (comma-separated)">
            <Input
              value={config.pathsFilter ?? ''}
              placeholder="src/**,package.json"
              onChange={(v) => set({ pathsFilter: v || undefined })}
              mono
            />
          </Field>

          <Field label="Ignore Paths (comma-separated)">
            <Input
              value={config.ignorePaths ?? ''}
              placeholder="docs/**,*.md"
              onChange={(v) => set({ ignorePaths: v || undefined })}
              mono
            />
          </Field>

          <Field label="Environment">
            <Input
              value={config.environment ?? ''}
              placeholder="production (for deployment gates)"
              onChange={(v) => set({ environment: v || undefined })}
            />
          </Field>

          <Checkbox
            label="Cancel in-progress runs"
            checked={config.enableConcurrencyCancel !== false}
            onChange={(v) => set({ enableConcurrencyCancel: v })}
          />
        </>
      )}

      {/* ── GitLab CI extras ─────────────────────────────────────────────── */}
      {isGitLab && (
        <>
          <SectionDivider label="GitLab CI" />
          <InfoBox>
            GitLab CI generates a <code>.gitlab-ci.yml</code> with stages for
            build, test, and Docker push via GitLab Container Registry.
          </InfoBox>
        </>
      )}
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '4px 0 2px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: '#F0F0F0' }} />
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#9CA3AF',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: '"DM Sans", sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#F0F0F0' }} />
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: '#6B7280',
        background: '#F9FAFB',
        border: '1px solid #F0F0F0',
        borderRadius: 5,
        padding: '8px 10px',
        lineHeight: 1.5,
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {children}
    </div>
  )
}

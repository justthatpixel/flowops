import type { DockerConfig } from '@/types/pipeline'
import { Field, Input, Select, Checkbox, Textarea } from './formControls'

interface Props {
  config: DockerConfig
  onChange: (c: DockerConfig) => void
}

export default function DockerConfigForm({ config, onChange }: Props) {
  const set = (patch: Partial<DockerConfig>) => onChange({ ...config, ...patch })
  const registry = config.registry ?? 'ghcr'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Registry ────────────────────────────────────────────────────── */}
      <Field label="Container Registry">
        <Select
          value={registry}
          onChange={(v) => set({ registry: v as DockerConfig['registry'] })}
          options={[
            { value: 'ghcr',      label: 'GitHub GHCR (recommended)' },
            { value: 'ecr',       label: 'AWS ECR' },
            { value: 'gcr',       label: 'Google GCR' },
            { value: 'acr',       label: 'Azure ACR' },
            { value: 'dockerhub', label: 'Docker Hub' },
          ]}
        />
      </Field>

      {/* ── Registry-specific fields ─────────────────────────────────────── */}
      {registry === 'ecr' && (
        <>
          <Field label="AWS Region">
            <Input
              value={config.ecrRegion ?? ''}
              placeholder="us-east-1"
              onChange={(v) => set({ ecrRegion: v || undefined })}
              mono
            />
          </Field>
          <Field label="AWS Account ID">
            <Input
              value={config.ecrAccountId ?? ''}
              placeholder="123456789012"
              onChange={(v) => set({ ecrAccountId: v || undefined })}
              mono
            />
          </Field>
          <SecretsHint secrets={['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']} />
        </>
      )}

      {registry === 'gcr' && (
        <>
          <Field label="GCP Project ID">
            <Input
              value={config.gcrProject ?? ''}
              placeholder="my-gcp-project"
              onChange={(v) => set({ gcrProject: v || undefined })}
              mono
            />
          </Field>
          <SecretsHint secrets={['GCP_SA_KEY']} />
        </>
      )}

      {registry === 'acr' && (
        <>
          <Field label="ACR Registry URL">
            <Input
              value={config.acrRegistry ?? ''}
              placeholder="myregistry.azurecr.io"
              onChange={(v) => set({ acrRegistry: v || undefined })}
              mono
            />
          </Field>
          <SecretsHint secrets={['ACR_USERNAME', 'ACR_PASSWORD']} />
        </>
      )}

      {registry === 'dockerhub' && (
        <SecretsHint secrets={['DOCKERHUB_USERNAME', 'DOCKERHUB_TOKEN']} />
      )}

      {registry === 'ghcr' && (
        <SecretsHint secrets={['GITHUB_TOKEN (auto-provided)']} color="#22C55E" />
      )}

      {/* ── Image ───────────────────────────────────────────────────────── */}
      <Field label="Image Name">
        <Input
          value={config.imageName ?? ''}
          placeholder="my-app"
          onChange={(v) => set({ imageName: v })}
          mono
        />
      </Field>

      {/* ── Push branch ─────────────────────────────────────────────────── */}
      <Field label="Push on Branch">
        <Input
          value={config.pushOnBranch ?? ''}
          placeholder="main"
          onChange={(v) => set({ pushOnBranch: v || undefined })}
          mono
        />
      </Field>

      {/* ── Dockerfile ──────────────────────────────────────────────────── */}
      <Field label="Dockerfile Path">
        <Input
          value={config.dockerfilePath ?? ''}
          placeholder="Dockerfile"
          onChange={(v) => set({ dockerfilePath: v || undefined })}
          mono
        />
      </Field>

      <Field label="Build Context">
        <Input
          value={config.contextPath ?? ''}
          placeholder=". (repo root)"
          onChange={(v) => set({ contextPath: v || undefined })}
          mono
        />
      </Field>

      {/* ── Platforms ───────────────────────────────────────────────────── */}
      <Field label="Target Platforms">
        <Select
          value={config.platforms ?? 'amd64'}
          onChange={(v) => set({ platforms: v as DockerConfig['platforms'] })}
          options={[
            { value: 'amd64', label: 'linux/amd64 (default)' },
            { value: 'arm64', label: 'linux/arm64 (Apple Silicon)' },
            { value: 'multi', label: 'Multi-platform (amd64 + arm64)' },
          ]}
        />
      </Field>

      {/* ── Build args ──────────────────────────────────────────────────── */}
      <Field label="Build Args (KEY=VALUE, one per line)">
        <Textarea
          value={config.buildArgs ?? ''}
          placeholder={'APP_VERSION=1.0.0\nNODE_ENV=production'}
          onChange={(v) => set({ buildArgs: v || undefined })}
          rows={3}
        />
      </Field>

      {/* ── Multi-stage target ──────────────────────────────────────────── */}
      <Field label="Build Target (multi-stage)">
        <Input
          value={config.target ?? ''}
          placeholder="runner"
          onChange={(v) => set({ target: v || undefined })}
          mono
        />
      </Field>

      {/* ── Trivy scan ──────────────────────────────────────────────────── */}
      <Checkbox
        label="Scan image with Trivy after push"
        checked={config.scanAfterPush === true}
        onChange={(v) => set({ scanAfterPush: v || undefined })}
      />
    </div>
  )
}

// ─── Secrets hint ─────────────────────────────────────────────────────────────

function SecretsHint({
  secrets,
  color = '#F59E0B',
}: {
  secrets: string[]
  color?: string
}) {
  return (
    <div
      style={{
        fontSize: 10,
        color: '#6B7280',
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: 5,
        padding: '6px 8px',
        fontFamily: '"DM Sans", sans-serif',
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontWeight: 700, color }}>Required secrets: </span>
      {secrets.map((s, i) => (
        <span key={s}>
          <code
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              background: `${color}18`,
              borderRadius: 3,
              padding: '1px 4px',
            }}
          >
            {s}
          </code>
          {i < secrets.length - 1 ? ', ' : ''}
        </span>
      ))}
    </div>
  )
}

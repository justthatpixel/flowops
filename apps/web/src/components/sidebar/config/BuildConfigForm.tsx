import type { BuildConfig } from '@/types/pipeline'
import { Field, Input, Select, Checkbox } from './formControls'

const PM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  node:   [{ value: 'npm', label: 'npm' }, { value: 'pnpm', label: 'pnpm' }, { value: 'yarn', label: 'yarn' }],
  python: [{ value: 'pip', label: 'pip' }, { value: 'poetry', label: 'Poetry' }],
  go:     [],
  rust:   [{ value: 'cargo', label: 'Cargo' }],
  java:   [{ value: 'maven', label: 'Maven' }, { value: 'gradle', label: 'Gradle' }],
}

const DEFAULT_CMD: Record<string, string> = {
  node:   'pnpm run build',
  python: 'python -m build',
  go:     'go build ./...',
  rust:   'cargo build --release',
  java:   'mvn package -q',
}

const DEFAULT_LINT: Record<string, string> = {
  node:   'pnpm lint',
  python: 'ruff check . && mypy .',
  go:     'golangci-lint run',
  rust:   'cargo clippy -- -D warnings',
  java:   'mvn checkstyle:check -q',
}

const VERSION_PLACEHOLDER: Record<string, string> = {
  node:   '20',
  python: '3.12',
  go:     '1.22',
  java:   '21',
}

const VERSION_LABEL: Record<string, string> = {
  node:   'Node.js Version',
  python: 'Python Version',
  go:     'Go Version',
  java:   'Java Version (LTS)',
}

const VERSION_FIELD: Record<string, keyof BuildConfig> = {
  node:   'nodeVersion',
  python: 'pythonVersion',
  go:     'goVersion',
  java:   'javaVersion',
}

interface Props {
  config: BuildConfig
  onChange: (c: BuildConfig) => void
}

export default function BuildConfigForm({ config, onChange }: Props) {
  const set = (patch: Partial<BuildConfig>) => onChange({ ...config, ...patch })
  const pmOptions = PM_OPTIONS[config.runtime] ?? []

  const handleRuntimeChange = (runtime: string) => {
    const newPmOptions = PM_OPTIONS[runtime] ?? []
    set({
      runtime: runtime as BuildConfig['runtime'],
      packageManager: newPmOptions[0]?.value as BuildConfig['packageManager'] | undefined,
      buildCommand: DEFAULT_CMD[runtime] ?? '',
      lintCommand: '',
    })
  }

  const versionKey = VERSION_FIELD[config.runtime]
  const versionValue = versionKey ? (config[versionKey] as string | undefined) ?? '' : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <Field label="CI Provider">
        <Select
          value={config.ciProvider}
          onChange={(v) => set({ ciProvider: v as BuildConfig['ciProvider'] })}
          options={[
            { value: 'github_actions', label: 'GitHub Actions' },
            { value: 'jenkins',        label: 'Jenkins' },
            { value: 'none',           label: 'None (Makefile only)' },
          ]}
        />
      </Field>

      <Field label="Runtime">
        <Select
          value={config.runtime}
          onChange={handleRuntimeChange}
          options={[
            { value: 'node',   label: 'Node.js' },
            { value: 'python', label: 'Python' },
            { value: 'go',     label: 'Go' },
            { value: 'rust',   label: 'Rust' },
            { value: 'java',   label: 'Java' },
          ]}
        />
      </Field>

      {versionKey && (
        <Field label={VERSION_LABEL[config.runtime] ?? 'Version'}>
          <Input
            value={versionValue}
            placeholder={VERSION_PLACEHOLDER[config.runtime] ?? ''}
            onChange={(v) => set({ [versionKey]: v || undefined } as Partial<BuildConfig>)}
            mono
          />
        </Field>
      )}

      {pmOptions.length > 0 && (
        <Field label="Package Manager">
          <Select
            value={config.packageManager ?? ''}
            onChange={(v) => set({ packageManager: v as BuildConfig['packageManager'] })}
            options={pmOptions}
          />
        </Field>
      )}

      <Field label="Build Command">
        <Input
          value={config.buildCommand ?? ''}
          placeholder={DEFAULT_CMD[config.runtime] ?? 'build command'}
          onChange={(v) => set({ buildCommand: v })}
          mono
        />
      </Field>

      <Field label="Lint Command (optional)">
        <Input
          value={config.lintCommand ?? ''}
          placeholder={DEFAULT_LINT[config.runtime] ?? 'lint command'}
          onChange={(v) => set({ lintCommand: v || undefined })}
          mono
        />
      </Field>

      <Field label="Working Directory (monorepo)">
        <Input
          value={config.workingDirectory ?? ''}
          placeholder="e.g. apps/web"
          onChange={(v) => set({ workingDirectory: v || undefined })}
          mono
        />
      </Field>

      <Checkbox
        label="Enable dependency caching"
        checked={config.cacheEnabled !== false}
        onChange={(v) => set({ cacheEnabled: v })}
      />
    </div>
  )
}

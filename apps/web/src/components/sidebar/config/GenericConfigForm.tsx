import type { TestConfig, ClaudeTaskConfig, NotifyConfig, NodeType } from '@/types/pipeline'
import { Field, Select, Checkbox, Textarea } from './formControls'

interface Props {
  nodeType: NodeType
  config: TestConfig | ClaudeTaskConfig | NotifyConfig | undefined
  onChange: (c: TestConfig | ClaudeTaskConfig | NotifyConfig) => void
}

export default function GenericConfigForm({ nodeType, config, onChange }: Props) {
  if (nodeType === 'test') {
    const cfg = (config ?? { runner: 'vitest', coverage: false }) as TestConfig
    const set = (patch: Partial<TestConfig>) => onChange({ ...cfg, ...patch })
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Test Runner">
          <Select
            value={cfg.runner ?? 'vitest'}
            onChange={(v) => set({ runner: v as TestConfig['runner'] })}
            options={[
              { value: 'vitest', label: 'Vitest' },
              { value: 'jest', label: 'Jest' },
              { value: 'pytest', label: 'pytest' },
              { value: 'go_test', label: 'go test' },
              { value: 'cargo_test', label: 'cargo test' },
            ]}
          />
        </Field>
        <Checkbox
          label="Collect coverage"
          checked={cfg.coverage ?? false}
          onChange={(v) => set({ coverage: v })}
        />
      </div>
    )
  }

  if (nodeType === 'claude_task') {
    const cfg = (config ?? { prompt: '' }) as ClaudeTaskConfig
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Prompt">
          <Textarea
            value={cfg.prompt}
            placeholder="Describe what Claude should do for this step…"
            onChange={(v) => onChange({ prompt: v })}
            rows={6}
          />
        </Field>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
          Claude will generate config files and commands based on this prompt in Phase 6.
        </p>
      </div>
    )
  }

  if (nodeType === 'notify') {
    const cfg = (config ?? { channel: 'slack', onSuccess: true, onFailure: true }) as NotifyConfig
    const set = (patch: Partial<NotifyConfig>) => onChange({ ...cfg, ...patch })
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Channel">
          <Select
            value={cfg.channel ?? 'slack'}
            onChange={(v) => set({ channel: v as NotifyConfig['channel'] })}
            options={[
              { value: 'slack', label: 'Slack' },
              { value: 'email', label: 'Email' },
              { value: 'webhook', label: 'Webhook' },
            ]}
          />
        </Field>
        <Checkbox
          label="Notify on success"
          checked={cfg.onSuccess ?? true}
          onChange={(v) => set({ onSuccess: v })}
        />
        <Checkbox
          label="Notify on failure"
          checked={cfg.onFailure ?? true}
          onChange={(v) => set({ onFailure: v })}
        />
      </div>
    )
  }

  return (
    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>No configuration needed.</p>
  )
}

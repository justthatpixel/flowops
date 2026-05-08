import { Server } from 'lucide-react'
import type { DeployConfig } from '@/types/pipeline'
import { Field, Input, Select } from './formControls'
import { useInfraStore } from '@/store/infraStore'
import { usePipelineStore } from '@/store/pipelineStore'
import InfraSummaryCard from './InfraSummaryCard'

const SERVICE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  aws:    [{ value: 'ECS Fargate', label: 'ECS Fargate' }, { value: 'Lambda', label: 'Lambda' }, { value: 'Elastic Beanstalk', label: 'Elastic Beanstalk' }],
  azure:  [{ value: 'Container Apps', label: 'Container Apps' }, { value: 'App Service', label: 'App Service' }, { value: 'AKS', label: 'AKS' }],
  gcp:    [{ value: 'Cloud Run', label: 'Cloud Run' }, { value: 'GKE', label: 'GKE' }, { value: 'App Engine', label: 'App Engine' }],
  fly:    [{ value: 'Fly Machines', label: 'Fly Machines' }],
  vercel: [{ value: 'Serverless', label: 'Serverless' }],
  render: [{ value: 'Web Service', label: 'Web Service' }],
}

const DEFAULT_REGION: Record<string, string> = {
  aws: 'us-east-1', azure: 'eastus', gcp: 'us-central1', fly: 'iad', vercel: '', render: '',
}

const SHOW_REGION = new Set(['aws', 'azure', 'gcp', 'fly'])

interface Props {
  config: DeployConfig
  onChange: (c: DeployConfig) => void
}

export default function DeployConfigForm({ config, onChange }: Props) {
  const set = (patch: Partial<DeployConfig>) => onChange({ ...config, ...patch })
  const { openDesigner, infraSnapshots } = useInfraStore()
  const { selectedNodeId } = usePipelineStore()

  const serviceOptions = SERVICE_OPTIONS[config.provider] ?? []
  // Phase 7: check if this node already has a saved infra snapshot
  const infraSnapshot = selectedNodeId ? infraSnapshots[selectedNodeId] : undefined

  const handleProviderChange = (provider: string) => {
    const services = SERVICE_OPTIONS[provider] ?? []
    set({
      provider: provider as DeployConfig['provider'],
      service: services[0]?.value ?? '',
      region: DEFAULT_REGION[provider] ?? '',
    })
  }

  return (
    <>
      {/* Phase 7: show infra summary card if this node has a configured design */}
      {infraSnapshot && selectedNodeId && (
        <InfraSummaryCard nodeId={selectedNodeId} snapshot={infraSnapshot} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Cloud Provider">
          <Select
            value={config.provider}
            onChange={handleProviderChange}
            options={[
              { value: 'aws', label: 'AWS' },
              { value: 'azure', label: 'Azure' },
              { value: 'gcp', label: 'GCP' },
              { value: 'fly', label: 'Fly.io' },
              { value: 'vercel', label: 'Vercel' },
              { value: 'render', label: 'Render' },
            ]}
          />
        </Field>

        {serviceOptions.length > 1 && (
          <Field label="Service">
            <Select
              value={config.service ?? ''}
              onChange={(v) => set({ service: v })}
              options={serviceOptions}
            />
          </Field>
        )}

        {SHOW_REGION.has(config.provider) && (
          <Field label="Region">
            <Input
              value={config.region ?? ''}
              placeholder={DEFAULT_REGION[config.provider] ?? 'region'}
              onChange={(v) => set({ region: v })}
              mono
            />
          </Field>
        )}
      </div>

      {/* Infrastructure Designer entry point — only shown for AWS */}
      {config.provider === 'aws' && (
        <button
          onClick={() => selectedNodeId && openDesigner(selectedNodeId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            width: '100%',
            padding: '9px 0',
            marginTop: 6,
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            border: 'none',
            borderRadius: 7,
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"DM Sans", sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.9')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
        >
          <Server size={13} strokeWidth={2} />
          Design Infrastructure
        </button>
      )}
    </>
  )
}

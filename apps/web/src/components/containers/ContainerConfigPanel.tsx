/**
 * ContainerConfigPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 300px right config panel for the Container Designer.  Slides in (spring)
 * when a node is selected.  Shows different form fields per node type.
 * Follows the same pattern as InfraConfigPanel / NodeConfigPanel.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useContainerStore } from '@/store/containerStore'
import type { ContainerNodeType } from '@/types/containers'

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: '"DM Sans", sans-serif',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 32,
  border: '1px solid #E5E5E5',
  borderRadius: 5,
  fontSize: 12,
  fontFamily: '"DM Sans", sans-serif',
  color: '#111827',
  padding: '0 8px',
  outline: 'none',
  background: '#FAFAFA',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
  paddingRight: 28,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

function FormInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={INPUT_STYLE}
      onFocus={(e) => { e.target.style.borderColor = '#3B82F6' }}
      onBlur={(e) => { e.target.style.borderColor = '#E5E5E5' }}
    />
  )
}

function FormSelect({
  value, onChange, children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={SELECT_STYLE}
    >
      {children}
    </select>
  )
}

function FormTextarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%',
        border: '1px solid #E5E5E5',
        borderRadius: 5,
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
        color: '#111827',
        padding: '6px 8px',
        outline: 'none',
        background: '#FAFAFA',
        boxSizing: 'border-box',
        resize: 'vertical',
        lineHeight: 1.5,
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => { e.target.style.borderColor = '#3B82F6' }}
      onBlur={(e) => { e.target.style.borderColor = '#E5E5E5' }}
    />
  )
}

function Hint({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 3 }}>
      {text}
    </div>
  )
}

// ─── Per-type forms ───────────────────────────────────────────────────────────

function ServiceForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Image">
        <FormInput value={c.image ?? ''} onChange={(v) => onChange('image', v)} placeholder="nginx:alpine" />
      </FormRow>
      <FormRow label="Ports">
        <FormInput value={c.ports ?? ''} onChange={(v) => onChange('ports', v)} placeholder="80:3000" />
        <Hint text="HOST:CONTAINER format" />
      </FormRow>
      <FormRow label="Environment Variables">
        <FormTextarea value={c.envVars ?? ''} onChange={(v) => onChange('envVars', v)} placeholder="NODE_ENV=production&#10;PORT=3000" rows={4} />
        <Hint text="One KEY=value per line" />
      </FormRow>
      <FormRow label="Restart Policy">
        <FormSelect value={c.restart ?? 'unless-stopped'} onChange={(v) => onChange('restart', v)}>
          <option value="unless-stopped">unless-stopped</option>
          <option value="always">always</option>
          <option value="on-failure">on-failure</option>
          <option value="no">no</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Replicas">
        <FormInput type="number" value={c.replicas ?? '1'} onChange={(v) => onChange('replicas', Number(v))} />
      </FormRow>
      <FormRow label="Memory Limit">
        <FormInput value={c.memLimit ?? '512m'} onChange={(v) => onChange('memLimit', v)} placeholder="512m" />
      </FormRow>
      <FormRow label="CPU Limit">
        <FormInput value={c.cpuLimit ?? '0.5'} onChange={(v) => onChange('cpuLimit', v)} placeholder="0.5" />
      </FormRow>
      <FormRow label="Health Check Path">
        <FormInput value={c.healthCheckPath ?? '/health'} onChange={(v) => onChange('healthCheckPath', v)} placeholder="/health" />
      </FormRow>
      <FormRow label="Networks">
        <FormInput value={c.networks ?? 'default'} onChange={(v) => onChange('networks', v)} placeholder="app-network" />
      </FormRow>
    </>
  )
}

function DatabaseForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Database Type">
        <FormSelect value={c.dbType ?? 'postgres'} onChange={(v) => onChange('dbType', v)}>
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="redis">Redis</option>
          <option value="mongo">MongoDB</option>
          <option value="mariadb">MariaDB</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Version">
        <FormInput value={c.version ?? '15-alpine'} onChange={(v) => onChange('version', v)} placeholder="15-alpine" />
      </FormRow>
      <FormRow label="Port">
        <FormInput type="number" value={c.port ?? '5432'} onChange={(v) => onChange('port', Number(v))} />
      </FormRow>
      <FormRow label="Database Name">
        <FormInput value={c.dbName ?? 'appdb'} onChange={(v) => onChange('dbName', v)} placeholder="appdb" />
      </FormRow>
      <FormRow label="User">
        <FormInput value={c.user ?? 'postgres'} onChange={(v) => onChange('user', v)} placeholder="postgres" />
      </FormRow>
      <FormRow label="Password">
        <div style={{ padding: '6px 10px', background: '#FFF9F0', border: '1px solid #FDE68A', borderRadius: 5, fontSize: 11, color: '#92400E', fontFamily: '"DM Sans", sans-serif' }}>
          🔐 Stored in <code style={{ fontFamily: '"JetBrains Mono", monospace' }}>.env</code> as <code style={{ fontFamily: '"JetBrains Mono", monospace' }}>${`{DB_PASSWORD}`}</code>
        </div>
      </FormRow>
      <FormRow label="Volume Mount Path">
        <FormInput value={c.volumeMountPath ?? '/var/lib/postgresql/data'} onChange={(v) => onChange('volumeMountPath', v)} />
      </FormRow>
    </>
  )
}

function VolumeForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Driver">
        <FormSelect value={c.driver ?? 'local'} onChange={(v) => onChange('driver', v)}>
          <option value="local">local</option>
          <option value="nfs">nfs</option>
          <option value="overlay">overlay</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Mount Path">
        <FormInput value={c.mountPath ?? '/data'} onChange={(v) => onChange('mountPath', v)} />
      </FormRow>
    </>
  )
}

function NetworkForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Driver">
        <FormSelect value={c.driver ?? 'bridge'} onChange={(v) => onChange('driver', v)}>
          <option value="bridge">bridge</option>
          <option value="overlay">overlay</option>
          <option value="host">host</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Subnet">
        <FormInput value={c.subnet ?? '172.20.0.0/16'} onChange={(v) => onChange('subnet', v)} placeholder="172.20.0.0/16" />
      </FormRow>
    </>
  )
}

function DeploymentForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Image">
        <FormInput value={c.image ?? ''} onChange={(v) => onChange('image', v)} placeholder="your-app:latest" />
      </FormRow>
      <FormRow label="Registry">
        <FormSelect value={c.registry ?? 'dockerhub'} onChange={(v) => onChange('registry', v)}>
          <option value="dockerhub">Docker Hub</option>
          <option value="ecr">AWS ECR</option>
          <option value="gcr">Google GCR</option>
          <option value="ghcr">GitHub GHCR</option>
          <option value="acr">Azure ACR</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Replicas">
        <FormInput type="number" value={c.replicas ?? '3'} onChange={(v) => onChange('replicas', Number(v))} />
      </FormRow>
      <FormRow label="Strategy">
        <FormSelect value={c.strategy ?? 'RollingUpdate'} onChange={(v) => onChange('strategy', v)}>
          <option value="RollingUpdate">RollingUpdate</option>
          <option value="Recreate">Recreate</option>
        </FormSelect>
      </FormRow>
      <FormRow label="CPU Request / Limit">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormInput value={c.cpuRequest ?? '250m'} onChange={(v) => onChange('cpuRequest', v)} placeholder="250m" />
          <FormInput value={c.cpuLimit ?? '500m'} onChange={(v) => onChange('cpuLimit', v)} placeholder="500m" />
        </div>
      </FormRow>
      <FormRow label="Memory Request / Limit">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormInput value={c.memRequest ?? '256Mi'} onChange={(v) => onChange('memRequest', v)} placeholder="256Mi" />
          <FormInput value={c.memLimit ?? '512Mi'} onChange={(v) => onChange('memLimit', v)} placeholder="512Mi" />
        </div>
      </FormRow>
      <FormRow label="Container Port">
        <FormInput type="number" value={c.port ?? '3000'} onChange={(v) => onChange('port', Number(v))} />
      </FormRow>
      <FormRow label="Liveness Probe Path">
        <FormInput value={c.livenessPath ?? '/health'} onChange={(v) => onChange('livenessPath', v)} />
      </FormRow>
      <FormRow label="Readiness Probe Path">
        <FormInput value={c.readinessPath ?? '/ready'} onChange={(v) => onChange('readinessPath', v)} />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
      <FormRow label="Image Pull Policy">
        <FormSelect value={c.imagePullPolicy ?? 'IfNotPresent'} onChange={(v) => onChange('imagePullPolicy', v)}>
          <option value="IfNotPresent">IfNotPresent</option>
          <option value="Always">Always</option>
          <option value="Never">Never</option>
        </FormSelect>
      </FormRow>
    </>
  )
}

function K8sServiceForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Service Type">
        <FormSelect value={c.serviceType ?? 'ClusterIP'} onChange={(v) => onChange('serviceType', v)}>
          <option value="ClusterIP">ClusterIP</option>
          <option value="NodePort">NodePort</option>
          <option value="LoadBalancer">LoadBalancer</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Port">
        <FormInput type="number" value={c.port ?? '80'} onChange={(v) => onChange('port', Number(v))} />
      </FormRow>
      <FormRow label="Target Port">
        <FormInput type="number" value={c.targetPort ?? '3000'} onChange={(v) => onChange('targetPort', Number(v))} />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function IngressForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string | boolean>
  return (
    <>
      <FormRow label="Ingress Class">
        <FormSelect value={String(c.ingressClass ?? 'nginx')} onChange={(v) => onChange('ingressClass', v)}>
          <option value="nginx">nginx</option>
          <option value="traefik">traefik</option>
          <option value="alb">AWS ALB</option>
          <option value="gce">GCE</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Host">
        <FormInput value={String(c.host ?? 'app.example.com')} onChange={(v) => onChange('host', v)} placeholder="app.example.com" />
      </FormRow>
      <FormRow label="TLS">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: '#374151' }}>
          <input type="checkbox" checked={Boolean(c.tls)} onChange={(e) => onChange('tls', e.target.checked)} />
          Enable TLS / HTTPS
        </label>
      </FormRow>
      {c.tls && (
        <FormRow label="Cert Manager">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: '#374151' }}>
            <input type="checkbox" checked={Boolean(c.certManager)} onChange={(e) => onChange('certManager', e.target.checked)} />
            Use cert-manager
          </label>
        </FormRow>
      )}
      <FormRow label="Namespace">
        <FormInput value={String(c.namespace ?? 'default')} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function ConfigMapForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Data (KEY=value)">
        <FormTextarea value={c.data ?? ''} onChange={(v) => onChange('data', v)} placeholder={'APP_ENV=production\nLOG_LEVEL=info'} rows={5} />
        <Hint text="One KEY=value per line" />
      </FormRow>
      <FormRow label="Mount As">
        <FormSelect value={c.mountAs ?? 'env'} onChange={(v) => onChange('mountAs', v)}>
          <option value="env">Environment Variables</option>
          <option value="volume">Volume Mount</option>
        </FormSelect>
      </FormRow>
      {c.mountAs === 'volume' && (
        <FormRow label="Mount Path">
          <FormInput value={c.mountPath ?? '/app/config'} onChange={(v) => onChange('mountPath', v)} />
        </FormRow>
      )}
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function SecretForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string | boolean>
  return (
    <>
      <FormRow label="Secret Type">
        <FormSelect value={String(c.secretType ?? 'Opaque')} onChange={(v) => onChange('secretType', v)}>
          <option value="Opaque">Opaque</option>
          <option value="kubernetes.io/tls">kubernetes.io/tls</option>
          <option value="kubernetes.io/dockerconfigjson">dockerconfigjson</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Data (KEY=value, will be base64 encoded)">
        <FormTextarea value={String(c.data ?? '')} onChange={(v) => onChange('data', v)} placeholder={'DB_PASSWORD=changeme\nAPI_KEY=changeme'} rows={4} />
        <Hint text="Values are base64-encoded in the manifest" />
      </FormRow>
      <FormRow label="Sealed Secrets">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: '#374151' }}>
          <input type="checkbox" checked={Boolean(c.sealedSecrets)} onChange={(e) => onChange('sealedSecrets', e.target.checked)} />
          Generate SealedSecret
        </label>
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={String(c.namespace ?? 'default')} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function StatefulSetForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Image">
        <FormInput value={c.image ?? 'postgres:15-alpine'} onChange={(v) => onChange('image', v)} />
      </FormRow>
      <FormRow label="Replicas">
        <FormInput type="number" value={c.replicas ?? '1'} onChange={(v) => onChange('replicas', Number(v))} />
      </FormRow>
      <FormRow label="Storage Size">
        <FormInput value={c.storageSize ?? '10Gi'} onChange={(v) => onChange('storageSize', v)} placeholder="10Gi" />
      </FormRow>
      <FormRow label="Storage Class">
        <FormInput value={c.storageClass ?? 'standard'} onChange={(v) => onChange('storageClass', v)} placeholder="standard" />
      </FormRow>
      <FormRow label="CPU Request / Limit">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormInput value={c.cpuRequest ?? '250m'} onChange={(v) => onChange('cpuRequest', v)} />
          <FormInput value={c.cpuLimit ?? '500m'} onChange={(v) => onChange('cpuLimit', v)} />
        </div>
      </FormRow>
      <FormRow label="Memory Request / Limit">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormInput value={c.memRequest ?? '256Mi'} onChange={(v) => onChange('memRequest', v)} />
          <FormInput value={c.memLimit ?? '512Mi'} onChange={(v) => onChange('memLimit', v)} />
        </div>
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function PvcForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Storage">
        <FormInput value={c.storage ?? '20Gi'} onChange={(v) => onChange('storage', v)} placeholder="20Gi" />
      </FormRow>
      <FormRow label="Access Mode">
        <FormSelect value={c.accessMode ?? 'ReadWriteOnce'} onChange={(v) => onChange('accessMode', v)}>
          <option value="ReadWriteOnce">ReadWriteOnce</option>
          <option value="ReadOnlyMany">ReadOnlyMany</option>
          <option value="ReadWriteMany">ReadWriteMany</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Storage Class">
        <FormInput value={c.storageClass ?? 'standard'} onChange={(v) => onChange('storageClass', v)} placeholder="standard / gp3" />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function HpaForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Target Deployment">
        <FormInput value={c.targetDeployment ?? ''} onChange={(v) => onChange('targetDeployment', v)} placeholder="web" />
      </FormRow>
      <FormRow label="Min Replicas">
        <FormInput type="number" value={c.minReplicas ?? '2'} onChange={(v) => onChange('minReplicas', Number(v))} />
      </FormRow>
      <FormRow label="Max Replicas">
        <FormInput type="number" value={c.maxReplicas ?? '10'} onChange={(v) => onChange('maxReplicas', Number(v))} />
      </FormRow>
      <FormRow label="CPU Target %">
        <FormInput type="number" value={c.cpuTargetPercent ?? '70'} onChange={(v) => onChange('cpuTargetPercent', Number(v))} />
      </FormRow>
      <FormRow label="Memory Target %">
        <FormInput type="number" value={c.memTargetPercent ?? '80'} onChange={(v) => onChange('memTargetPercent', Number(v))} />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function NetworkPolicyForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Pod Selector">
        <FormInput value={c.podSelector ?? 'app=web'} onChange={(v) => onChange('podSelector', v)} placeholder="app=web" />
      </FormRow>
      <FormRow label="Allow Ingress From Namespace">
        <FormInput value={c.ingressNamespace ?? 'default'} onChange={(v) => onChange('ingressNamespace', v)} />
      </FormRow>
      <FormRow label="Allow Ingress From Pod">
        <FormInput value={c.ingressPod ?? ''} onChange={(v) => onChange('ingressPod', v)} placeholder="app=ingress" />
      </FormRow>
      <FormRow label="Ingress Port">
        <FormInput type="number" value={c.ingressPort ?? '80'} onChange={(v) => onChange('ingressPort', Number(v))} />
      </FormRow>
      <FormRow label="Egress Port">
        <FormInput type="number" value={c.egressPort ?? '443'} onChange={(v) => onChange('egressPort', Number(v))} />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function ServiceAccountForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
      <FormRow label="Annotations">
        <FormTextarea value={c.annotations ?? ''} onChange={(v) => onChange('annotations', v)} placeholder={'eks.amazonaws.com/role-arn: arn:aws:iam::...'} rows={3} />
      </FormRow>
    </>
  )
}

function DaemonSetForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Image">
        <FormInput value={c.image ?? 'fluentd:latest'} onChange={(v) => onChange('image', v)} />
      </FormRow>
      <FormRow label="CPU Request / Limit">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormInput value={c.cpuRequest ?? '100m'} onChange={(v) => onChange('cpuRequest', v)} />
          <FormInput value={c.cpuLimit ?? '200m'} onChange={(v) => onChange('cpuLimit', v)} />
        </div>
      </FormRow>
      <FormRow label="Memory Request / Limit">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormInput value={c.memRequest ?? '128Mi'} onChange={(v) => onChange('memRequest', v)} />
          <FormInput value={c.memLimit ?? '256Mi'} onChange={(v) => onChange('memLimit', v)} />
        </div>
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'kube-system'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

function NodeGroupForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Instance Type">
        <FormSelect value={c.instanceType ?? 't3.medium'} onChange={(v) => onChange('instanceType', v)}>
          <option value="t3.small">t3.small</option>
          <option value="t3.medium">t3.medium</option>
          <option value="t3.large">t3.large</option>
          <option value="m5.large">m5.large</option>
          <option value="m5.xlarge">m5.xlarge</option>
          <option value="c5.large">c5.large</option>
          <option value="r5.large">r5.large</option>
        </FormSelect>
      </FormRow>
      <FormRow label="Min / Desired / Max">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <FormInput type="number" value={c.minSize ?? '1'} onChange={(v) => onChange('minSize', Number(v))} />
          <FormInput type="number" value={c.desiredSize ?? '2'} onChange={(v) => onChange('desiredSize', Number(v))} />
          <FormInput type="number" value={c.maxSize ?? '5'} onChange={(v) => onChange('maxSize', Number(v))} />
        </div>
        <Hint text="Min · Desired · Max" />
      </FormRow>
      <FormRow label="Disk Size (GB)">
        <FormInput type="number" value={c.diskSizeGb ?? '50'} onChange={(v) => onChange('diskSizeGb', Number(v))} />
      </FormRow>
      <FormRow label="Subnet">
        <FormInput value={c.subnet ?? 'private-subnet-1'} onChange={(v) => onChange('subnet', v)} />
      </FormRow>
    </>
  )
}

function FargateProfileForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
      <FormRow label="Selectors">
        <FormInput value={c.selectors ?? 'app=web'} onChange={(v) => onChange('selectors', v)} placeholder="app=web" />
      </FormRow>
      <FormRow label="Subnets">
        <FormInput value={c.subnets ?? 'subnet-1, subnet-2'} onChange={(v) => onChange('subnets', v)} placeholder="subnet-1, subnet-2" />
      </FormRow>
    </>
  )
}

function IrsaForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Service Account Name">
        <FormInput value={c.serviceAccountName ?? 'app-sa'} onChange={(v) => onChange('serviceAccountName', v)} />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
      <FormRow label="IAM Policy">
        <FormSelect value={c.iamPolicy ?? 'AmazonS3ReadOnlyAccess'} onChange={(v) => onChange('iamPolicy', v)}>
          <option value="AmazonS3ReadOnlyAccess">AmazonS3ReadOnlyAccess</option>
          <option value="AmazonS3FullAccess">AmazonS3FullAccess</option>
          <option value="AmazonDynamoDBReadOnlyAccess">AmazonDynamoDBReadOnlyAccess</option>
          <option value="AmazonSQSFullAccess">AmazonSQSFullAccess</option>
          <option value="custom">Custom ARN</option>
        </FormSelect>
      </FormRow>
      {c.iamPolicy === 'custom' && (
        <FormRow label="Custom Policy ARN">
          <FormInput value={c.customArn ?? ''} onChange={(v) => onChange('customArn', v)} placeholder="arn:aws:iam::123:policy/..." />
        </FormRow>
      )}
    </>
  )
}

function GenericCloudForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const c = config as Record<string, string>
  return (
    <>
      <FormRow label="Name">
        <FormInput value={c.name ?? ''} onChange={(v) => onChange('name', v)} placeholder="my-pool" />
      </FormRow>
      <FormRow label="Namespace">
        <FormInput value={c.namespace ?? 'default'} onChange={(v) => onChange('namespace', v)} />
      </FormRow>
    </>
  )
}

// ─── Form dispatcher ──────────────────────────────────────────────────────────

function FormContent({
  type, config, onChange,
}: {
  type: ContainerNodeType
  config: Record<string, unknown>
  onChange: (k: string, v: unknown) => void
}) {
  switch (type) {
    case 'service':       return <ServiceForm config={config} onChange={onChange} />
    case 'database':      return <DatabaseForm config={config} onChange={onChange} />
    case 'volume':        return <VolumeForm config={config} onChange={onChange} />
    case 'network':       return <NetworkForm config={config} onChange={onChange} />
    case 'deployment':    return <DeploymentForm config={config} onChange={onChange} />
    case 'statefulset':   return <StatefulSetForm config={config} onChange={onChange} />
    case 'daemonset':     return <DaemonSetForm config={config} onChange={onChange} />
    case 'k8s_service':   return <K8sServiceForm config={config} onChange={onChange} />
    case 'ingress':       return <IngressForm config={config} onChange={onChange} />
    case 'configmap':     return <ConfigMapForm config={config} onChange={onChange} />
    case 'secret':        return <SecretForm config={config} onChange={onChange} />
    case 'pvc':           return <PvcForm config={config} onChange={onChange} />
    case 'hpa':           return <HpaForm config={config} onChange={onChange} />
    case 'networkpolicy': return <NetworkPolicyForm config={config} onChange={onChange} />
    case 'serviceaccount':return <ServiceAccountForm config={config} onChange={onChange} />
    case 'nodegroup':     return <NodeGroupForm config={config} onChange={onChange} />
    case 'fargateprofile':return <FargateProfileForm config={config} onChange={onChange} />
    case 'irsa':          return <IrsaForm config={config} onChange={onChange} />
    default:              return <GenericCloudForm config={config} onChange={onChange} />
  }
}

// ─── Type labels ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Partial<Record<ContainerNodeType, string>> = {
  service: 'Service', database: 'Database', volume: 'Volume', network: 'Network',
  deployment: 'Deployment', statefulset: 'StatefulSet', daemonset: 'DaemonSet',
  k8s_service: 'K8s Service', ingress: 'Ingress', configmap: 'ConfigMap',
  secret: 'Secret', pvc: 'PersistentVolumeClaim', hpa: 'HPA',
  networkpolicy: 'NetworkPolicy', serviceaccount: 'ServiceAccount',
  nodegroup: 'Node Group', fargateprofile: 'Fargate Profile', irsa: 'IRSA',
  gke_nodepool: 'GKE Node Pool', gke_workload_identity: 'Workload Identity',
  aks_nodepool: 'AKS Node Pool', aks_managed_identity: 'Managed Identity',
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContainerConfigPanel() {
  const { nodes, selectedNodeId, selectNode, updateNodeConfig, updateNodeLabel, removeNode } = useContainerStore()
  const [editingLabel, setEditingLabel] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const typeLabel = TYPE_LABELS[node.type] ?? node.type

  const handleFieldChange = (key: string, value: unknown) => {
    updateNodeConfig(node.id, { ...node.config, [key]: value })
  }

  const commitLabel = () => {
    const trimmed = draftLabel.trim()
    if (trimmed) updateNodeLabel(node.id, trimmed)
    setEditingLabel(false)
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        background: '#FFFFFF',
        borderLeft: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 56,
          borderBottom: '1px solid #E5E7EB',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingLabel ? (
            <input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') setEditingLabel(false)
              }}
              style={{
                width: '100%', fontSize: 13, fontWeight: 600, border: 'none',
                borderBottom: '2px solid #3B82F6', outline: 'none',
                background: 'transparent', fontFamily: '"DM Sans", sans-serif',
                color: '#111827', padding: '2px 0',
              }}
            />
          ) : (
            <button
              onClick={() => { setDraftLabel(node.label); setEditingLabel(true) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'text', padding: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: '"DM Sans", sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.label}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500, fontFamily: '"DM Sans", sans-serif', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {typeLabel}
              </div>
            </button>
          )}
        </div>

        <button
          onClick={() => selectNode(null)}
          style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <X size={13} color="#6B7280" />
        </button>
      </div>

      {/* Form content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
        <FormContent type={node.type} config={node.config} onChange={handleFieldChange} />
      </div>

      {/* Delete */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
        <button
          onClick={() => { removeNode(node.id); selectNode(null) }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '7px 0', borderRadius: 7,
            border: '1px solid #FCA5A5', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#EF4444', fontFamily: '"DM Sans", sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF5F5')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <Trash2 size={13} strokeWidth={2} />
          Remove node
        </button>
      </div>
    </motion.div>
  )
}

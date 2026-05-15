/**
 * IntegrationsPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-in panel (from the right) for configuring data source integrations.
 * Tokens are persisted to localStorage via Zustand — never sent to a server.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Github, Server, Cloud, Activity, BarChart2,
  CheckCircle2, AlertCircle, Info, Eye, EyeOff, ExternalLink,
  Shield,
} from 'lucide-react'
import {
  useSettingsStore,
  isGitHubConfigured,
  isKubernetesConfigured,
  isTerraformConfigured,
  isPrometheusConfigured,
  isGrafanaConfigured,
} from '@/store/settingsStore'
import { GitHubClient } from '@/lib/integrations/github'
import { KubernetesClient } from '@/lib/integrations/kubernetes'
import { TerraformClient } from '@/lib/integrations/terraform'
import { PrometheusClient } from '@/lib/integrations/prometheus'

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'password' | 'url' | 'number'
  hint?: string
}) {
  const [show, setShow] = useState(false)
  const isSecret = type === 'password'

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            height: 32,
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            padding: isSecret ? '0 32px 0 10px' : '0 10px',
            fontSize: 12,
            fontFamily: isSecret ? '"JetBrains Mono", monospace' : '"DM Sans", sans-serif',
            color: '#111827',
            outline: 'none',
            background: '#FAFAFA',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.background = '#FFFFFF' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#FAFAFA' }}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((p) => !p)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9CA3AF',
            }}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {hint && (
        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6,
      padding: '8px 10px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <Info size={12} color="#3B82F6" style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: '#1D4ED8', fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5 }}>
        {children}
      </span>
    </div>
  )
}

function TestButton({
  onTest, status,
}: {
  onTest: () => Promise<void>
  status: 'idle' | 'testing' | 'ok' | 'error'
}) {
  return (
    <button
      onClick={onTest}
      disabled={status === 'testing'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 6, border: '1px solid #D1D5DB',
        background: status === 'ok' ? '#F0FDF4' : status === 'error' ? '#FEF2F2' : '#FAFAFA',
        borderColor: status === 'ok' ? '#BBF7D0' : status === 'error' ? '#FECACA' : '#D1D5DB',
        color: status === 'ok' ? '#16A34A' : status === 'error' ? '#DC2626' : '#374151',
        fontSize: 11, fontWeight: 500, cursor: status === 'testing' ? 'default' : 'pointer',
        fontFamily: '"DM Sans", sans-serif', transition: 'all 0.15s',
      }}
    >
      {status === 'testing' && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>}
      {status === 'ok'      && <CheckCircle2 size={12} />}
      {status === 'error'   && <AlertCircle  size={12} />}
      {status === 'testing' ? 'Testing…' : status === 'ok' ? 'Connected' : status === 'error' ? 'Failed' : 'Test Connection'}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em',
      textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
      fontFamily: '"DM Sans", sans-serif',
    }}>
      {children}
    </div>
  )
}

// ─── Tab: GitHub ──────────────────────────────────────────────────────────────

function GitHubTab() {
  const { github, setGitHub } = useSettingsStore()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg]       = useState('')

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMsg('')
    try {
      const client = new GitHubClient(github.token, github.owner, github.repo)
      const commits = await client.getCommits(github.defaultBranch, 1)
      setTestMsg(`✓ Latest commit: ${commits[0]?.shortSha} — ${commits[0]?.message.slice(0, 40)}`)
      setTestStatus('ok')
    } catch (e: any) {
      setTestMsg(e.message ?? 'Connection failed')
      setTestStatus('error')
    }
  }

  return (
    <div>
      <InfoBox>
        Connect your GitHub repository to stream live commits, CI workflow runs,
        and Dependabot security alerts into your dashboard widgets.{' '}
        <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer"
           style={{ color: '#2563EB', fontWeight: 600 }}>
          Create a PAT <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      </InfoBox>

      <SectionLabel>Repository</SectionLabel>
      <Field label="Owner / Organization" value={github.owner} onChange={(v) => setGitHub({ owner: v })} placeholder="acme-corp" />
      <Field label="Repository Name"      value={github.repo}  onChange={(v) => setGitHub({ repo: v })}  placeholder="backend" />
      <Field label="Default Branch"       value={github.defaultBranch} onChange={(v) => setGitHub({ defaultBranch: v })} placeholder="main" />

      <SectionLabel>Authentication</SectionLabel>
      <Field
        label="Personal Access Token"
        value={github.token}
        onChange={(v) => setGitHub({ token: v })}
        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
        type="password"
        hint="Required scopes: repo · workflow · security_events"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <TestButton onTest={handleTest} status={testStatus} />
        {testMsg && (
          <span style={{ fontSize: 11, color: testStatus === 'ok' ? '#16A34A' : '#DC2626', fontFamily: '"DM Sans", sans-serif' }}>
            {testMsg}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Kubernetes ──────────────────────────────────────────────────────────

function KubernetesTab() {
  const { kubernetes, setKubernetes } = useSettingsStore()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg]       = useState('')

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMsg('')
    try {
      const client = new KubernetesClient(
        kubernetes.endpoint, kubernetes.token, kubernetes.namespace, kubernetes.proxyMode,
      )
      const deps = await client.getDeployments()
      setTestMsg(`✓ Found ${deps.length} deployment(s) in ${kubernetes.namespace}`)
      setTestStatus('ok')
    } catch (e: any) {
      setTestMsg(e.message ?? 'Connection failed')
      setTestStatus('error')
    }
  }

  return (
    <div>
      <InfoBox>
        Connect your Kubernetes cluster to show live pod status, replica counts,
        and resource usage. Most clusters require a local proxy due to CORS restrictions.
        Run: <code style={{ background: '#DBEAFE', padding: '0 4px', borderRadius: 3, fontSize: 10 }}>kubectl proxy --port=8001</code>
      </InfoBox>

      <SectionLabel>Cluster</SectionLabel>
      <Field
        label="API Endpoint"
        value={kubernetes.endpoint}
        onChange={(v) => setKubernetes({ endpoint: v })}
        placeholder="http://localhost:8001"
        hint="Use kubectl proxy endpoint or an ingress with CORS headers"
      />
      <Field label="Namespace" value={kubernetes.namespace} onChange={(v) => setKubernetes({ namespace: v })} placeholder="default" />

      <SectionLabel>Authentication</SectionLabel>
      <Field
        label="Service Account Token"
        value={kubernetes.token}
        onChange={(v) => setKubernetes({ token: v })}
        placeholder="eyJhbGciOiJSUzI1NiIsInR..."
        type="password"
        hint="kubectl -n default create token dashboard-viewer"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          type="checkbox"
          id="proxyMode"
          checked={kubernetes.proxyMode}
          onChange={(e) => setKubernetes({ proxyMode: e.target.checked })}
        />
        <label htmlFor="proxyMode" style={{ fontSize: 12, color: '#374151', fontFamily: '"DM Sans", sans-serif' }}>
          Proxy mode (kubectl proxy / no Authorization header)
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <TestButton onTest={handleTest} status={testStatus} />
        {testMsg && (
          <span style={{ fontSize: 11, color: testStatus === 'ok' ? '#16A34A' : '#DC2626', fontFamily: '"DM Sans", sans-serif' }}>
            {testMsg}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Terraform ───────────────────────────────────────────────────────────

function TerraformTab() {
  const { terraform, setTerraform } = useSettingsStore()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg]       = useState('')

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMsg('')
    try {
      const client = new TerraformClient(terraform.token, terraform.organization)
      const ws = await client.getWorkspace(terraform.workspace)
      setTestMsg(`✓ Workspace: ${ws.name} · ${ws.resourceCount} resources`)
      setTestStatus('ok')
    } catch (e: any) {
      setTestMsg(e.message ?? 'Connection failed')
      setTestStatus('error')
    }
  }

  return (
    <div>
      <InfoBox>
        Connect Terraform Cloud to track infrastructure runs, plan/apply status,
        and resource counts across your workspaces.{' '}
        <a href="https://app.terraform.io/app/settings/tokens" target="_blank" rel="noreferrer"
           style={{ color: '#2563EB', fontWeight: 600 }}>
          Create an API token <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      </InfoBox>

      <SectionLabel>Organization</SectionLabel>
      <Field label="Organization"    value={terraform.organization} onChange={(v) => setTerraform({ organization: v })} placeholder="acme-corp" />
      <Field label="Workspace Name"  value={terraform.workspace}    onChange={(v) => setTerraform({ workspace: v })}    placeholder="production" />

      <SectionLabel>Authentication</SectionLabel>
      <Field
        label="API Token"
        value={terraform.token}
        onChange={(v) => setTerraform({ token: v })}
        placeholder="xxxxxxxxxxxx.atlasv1.xxxxxxxxxx"
        type="password"
        hint="User token or Team token with Read access"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <TestButton onTest={handleTest} status={testStatus} />
        {testMsg && (
          <span style={{ fontSize: 11, color: testStatus === 'ok' ? '#16A34A' : '#DC2626', fontFamily: '"DM Sans", sans-serif' }}>
            {testMsg}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Prometheus ──────────────────────────────────────────────────────────

function PrometheusTab() {
  const { prometheus, setPrometheus } = useSettingsStore()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg]       = useState('')

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMsg('')
    try {
      const client = new PrometheusClient(prometheus.endpoint, prometheus.bearerToken || undefined)
      const val = await client.scalar('vector(1)')
      setTestMsg(`✓ Prometheus reachable (probe=${val})`)
      setTestStatus('ok')
    } catch (e: any) {
      setTestMsg(e.message ?? 'Connection failed')
      setTestStatus('error')
    }
  }

  return (
    <div>
      <InfoBox>
        Connect Prometheus for live metrics: request rate, error rate, latency P99,
        and active connections. Requires CORS headers or a reverse proxy.
      </InfoBox>

      <SectionLabel>Server</SectionLabel>
      <Field
        label="Prometheus Endpoint"
        value={prometheus.endpoint}
        onChange={(v) => setPrometheus({ endpoint: v })}
        placeholder="http://localhost:9090"
        hint="Must be reachable from the browser. Add --web.cors.origin flag or use nginx proxy."
      />
      <Field
        label="Bearer Token (optional)"
        value={prometheus.bearerToken}
        onChange={(v) => setPrometheus({ bearerToken: v })}
        placeholder="Leave blank if unauthenticated"
        type="password"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <TestButton onTest={handleTest} status={testStatus} />
        {testMsg && (
          <span style={{ fontSize: 11, color: testStatus === 'ok' ? '#16A34A' : '#DC2626', fontFamily: '"DM Sans", sans-serif' }}>
            {testMsg}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Grafana ─────────────────────────────────────────────────────────────

function GrafanaTab() {
  const { grafana, setGrafana } = useSettingsStore()

  return (
    <div>
      <InfoBox>
        Embed a Grafana panel directly in your dashboard. The Grafana widget renders
        the panel as an iframe using your Service Account token.
      </InfoBox>

      <SectionLabel>Server</SectionLabel>
      <Field label="Grafana URL"  value={grafana.endpoint} onChange={(v) => setGrafana({ endpoint: v })} placeholder="https://grafana.example.com" />

      <SectionLabel>Panel</SectionLabel>
      <Field label="Dashboard UID" value={grafana.dashboardUid} onChange={(v) => setGrafana({ dashboardUid: v })} placeholder="abc123def456" hint="Found in the dashboard URL: /d/{uid}/..." />
      <Field
        label="Panel ID"
        value={String(grafana.panelId)}
        onChange={(v) => setGrafana({ panelId: parseInt(v) || 1 })}
        placeholder="1"
        hint="Right-click panel → Share → Link — panel ID is in the query string"
      />

      <SectionLabel>Authentication</SectionLabel>
      <Field
        label="Service Account Token"
        value={grafana.apiKey}
        onChange={(v) => setGrafana({ apiKey: v })}
        placeholder="glsa_xxxxxxxxxxxxxxxxxxxx"
        type="password"
        hint="Administration → Service Accounts → Add token (Viewer role)"
      />
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'github',     label: 'GitHub',     icon: Github,    cfg: isGitHubConfigured     },
  { id: 'kubernetes', label: 'Kubernetes', icon: Server,    cfg: isKubernetesConfigured },
  { id: 'terraform',  label: 'Terraform',  icon: Cloud,     cfg: isTerraformConfigured  },
  { id: 'prometheus', label: 'Prometheus', icon: Activity,  cfg: isPrometheusConfigured },
  { id: 'grafana',    label: 'Grafana',    icon: BarChart2, cfg: isGrafanaConfigured    },
] as const

type TabId = typeof TABS[number]['id']

export default function IntegrationsPanel() {
  const { integrationsPanelOpen, setIntegrationsPanelOpen, ...settings } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<TabId>('github')

  return (
    <AnimatePresence>
      {integrationsPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIntegrationsPanelOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)',
              zIndex: 800, cursor: 'pointer',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 420, background: '#FFFFFF',
              borderLeft: '1px solid #E5E7EB',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.09)',
              zIndex: 801, display: 'flex', flexDirection: 'column',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {/* Header */}
            <div style={{
              height: 52, borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
              background: '#FAFAFA',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Shield size={13} color="#fff" strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Integrations</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                  Tokens stored locally · never sent to a server
                </div>
              </div>
              <button
                onClick={() => setIntegrationsPanelOpen(false)}
                style={{
                  width: 26, height: 26, borderRadius: 5, border: 'none', background: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#9CA3AF',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <X size={14} />
              </button>
            </div>

            {/* Tab bar */}
            <div style={{
              display: 'flex', borderBottom: '1px solid #E5E7EB',
              padding: '0 8px', gap: 2, flexShrink: 0, background: '#FAFAFA',
            }}>
              {TABS.map(({ id, label, icon: Icon, cfg }) => {
                const cfgObj = settings[id as keyof typeof settings]
                const connected = typeof cfgObj === 'object' && cfgObj !== null
                  ? (cfg as (c: any) => boolean)(cfgObj)
                  : false
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer',
                      borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                      color: isActive ? '#3B82F6' : '#6B7280',
                      position: 'relative', transition: 'color 0.15s',
                    }}
                  >
                    <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span style={{ fontSize: 9.5, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    {connected && (
                      <div style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 6, height: 6, borderRadius: '50%', background: '#22C55E',
                      }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {activeTab === 'github'     && <GitHubTab />}
              {activeTab === 'kubernetes' && <KubernetesTab />}
              {activeTab === 'terraform'  && <TerraformTab />}
              {activeTab === 'prometheus' && <PrometheusTab />}
              {activeTab === 'grafana'    && <GrafanaTab />}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid #E5E7EB', padding: '10px 16px',
              background: '#FAFAFA', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={11} color="#9CA3AF" />
                <span style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.4 }}>
                  All credentials are stored in your browser's localStorage only.
                  FlowOps never transmits tokens to any external server.
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

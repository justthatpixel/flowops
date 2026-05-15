/**
 * settingsStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Persisted integration credentials for all dashboard data sources.
 * Tokens are stored ONLY in localStorage — never sent to any FlowOps server.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Per-integration config shapes ────────────────────────────────────────────

export interface GitHubConfig {
  token: string          // Personal Access Token (repo, workflow, security_events scopes)
  owner: string          // org or username, e.g. "acme-corp"
  repo: string           // repository name, e.g. "backend"
  defaultBranch: string  // "main" | "master" | …
}

export interface KubernetesConfig {
  endpoint: string       // https://your-cluster.example.com  (needs CORS or a proxy)
  token: string          // service account bearer token
  namespace: string      // "default"
  proxyMode: boolean     // if true, hit /api/k8s/* on a local proxy instead
}

export interface TerraformConfig {
  token: string          // Terraform Cloud API token (User token or Team token)
  organization: string   // "acme-corp"
  workspace: string      // workspace name, e.g. "production"
}

export interface PrometheusConfig {
  endpoint: string       // http://localhost:9090  (set up CORS or a proxy)
  bearerToken: string    // optional Bearer token for auth
}

export interface GrafanaConfig {
  endpoint: string       // https://grafana.example.com
  apiKey: string         // Service Account token (Viewer role is enough)
  dashboardUid: string   // UID from the dashboard URL
  panelId: number        // numeric panel ID
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SettingsStore {
  integrationsPanelOpen: boolean
  setIntegrationsPanelOpen: (open: boolean) => void

  github: GitHubConfig
  kubernetes: KubernetesConfig
  terraform: TerraformConfig
  prometheus: PrometheusConfig
  grafana: GrafanaConfig

  setGitHub:     (cfg: Partial<GitHubConfig>)     => void
  setKubernetes: (cfg: Partial<KubernetesConfig>) => void
  setTerraform:  (cfg: Partial<TerraformConfig>)  => void
  setPrometheus: (cfg: Partial<PrometheusConfig>) => void
  setGrafana:    (cfg: Partial<GrafanaConfig>)    => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      integrationsPanelOpen: false,
      setIntegrationsPanelOpen: (open) => set({ integrationsPanelOpen: open }),

      github:     { token: '', owner: '', repo: '', defaultBranch: 'main' },
      kubernetes: { endpoint: '', token: '', namespace: 'default', proxyMode: false },
      terraform:  { token: '', organization: '', workspace: '' },
      prometheus: { endpoint: 'http://localhost:9090', bearerToken: '' },
      grafana:    { endpoint: '', apiKey: '', dashboardUid: '', panelId: 1 },

      setGitHub:     (cfg) => set((s) => ({ github:     { ...s.github,     ...cfg } })),
      setKubernetes: (cfg) => set((s) => ({ kubernetes: { ...s.kubernetes, ...cfg } })),
      setTerraform:  (cfg) => set((s) => ({ terraform:  { ...s.terraform,  ...cfg } })),
      setPrometheus: (cfg) => set((s) => ({ prometheus: { ...s.prometheus, ...cfg } })),
      setGrafana:    (cfg) => set((s) => ({ grafana:    { ...s.grafana,    ...cfg } })),
    }),
    {
      name: 'flowops-integrations',
      // Don't persist the panel open state across reloads
      partialize: (s) => ({
        github: s.github,
        kubernetes: s.kubernetes,
        terraform: s.terraform,
        prometheus: s.prometheus,
        grafana: s.grafana,
      }),
    },
  ),
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isGitHubConfigured(cfg: GitHubConfig) {
  return !!(cfg.token && cfg.owner && cfg.repo)
}

export function isKubernetesConfigured(cfg: KubernetesConfig) {
  return !!(cfg.endpoint && cfg.token)
}

export function isTerraformConfigured(cfg: TerraformConfig) {
  return !!(cfg.token && cfg.organization && cfg.workspace)
}

export function isPrometheusConfigured(cfg: PrometheusConfig) {
  return !!cfg.endpoint
}

export function isGrafanaConfigured(cfg: GrafanaConfig) {
  return !!(cfg.endpoint && cfg.apiKey)
}

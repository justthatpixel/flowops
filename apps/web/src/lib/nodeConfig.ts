import {
  GitBranch,
  Hammer,
  FlaskConical,
  Box,
  Rocket,
  Bot,
  Bell,
  BarChart3,
  Activity,
  Shield,
  ShieldAlert,
  TestTube2,
  Search,
  type LucideIcon,
} from 'lucide-react'
import type { NodeType } from '@/types/pipeline'

interface NodeConfigEntry {
  icon: LucideIcon
  color: string
  label: string
  /** Used by the palette to group obs nodes separately */
  group?: 'core' | 'observability'
}

export const NODE_CONFIG: Record<NodeType, NodeConfigEntry> = {
  // ── Core pipeline nodes ────────────────────────────────────────────────────
  trigger:        { icon: GitBranch,   color: '#8B5CF6', label: 'Trigger',        group: 'core' },
  build:          { icon: Hammer,      color: '#F59E0B', label: 'Build',           group: 'core' },
  test:           { icon: FlaskConical,color: '#3B82F6', label: 'Test',            group: 'core' },
  docker:         { icon: Box,         color: '#0EA5E9', label: 'Docker',          group: 'core' },
  deploy:         { icon: Rocket,      color: '#22C55E', label: 'Deploy',          group: 'core' },
  claude_task:    { icon: Bot,         color: '#EC4899', label: 'Claude Task',     group: 'core' },
  notify:         { icon: Bell,        color: '#A3A3A3', label: 'Notify',          group: 'core' },
  // ── Observability nodes (Epic 4) ───────────────────────────────────────────
  grafana:        { icon: BarChart3,   color: '#F97316', label: 'Grafana',         group: 'observability' },
  prometheus:     { icon: Activity,    color: '#EF4444', label: 'Prometheus',      group: 'observability' },
  trivy:          { icon: Shield,      color: '#3B82F6', label: 'Trivy Scan',      group: 'observability' },
  security_audit: { icon: ShieldAlert, color: '#7C3AED', label: 'Security Audit',  group: 'observability' },
  playwright:     { icon: TestTube2,   color: '#22C55E', label: 'Playwright',      group: 'observability' },
  seo_audit:      { icon: Search,      color: '#06B6D4', label: 'SEO Audit',       group: 'observability' },
}

export const STATUS_COLORS: Record<string, string> = {
  idle:    '#E5E5E5',
  pending: '#E5E5E5',
  running: '#3B82F6',
  success: '#22C55E',
  failed:  '#EF4444',
  skipped: '#A3A3A3',
}

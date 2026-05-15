/**
 * dashboardStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global state for Epic 4 Observability & Dashboard.
 *
 *  activeView         – which top-level view is showing: pipeline / dashboard / logs
 *  nodeDashboardId    – when set, the full-screen NodeDashboard overlay is shown
 *  widgets            – grid-snapped widget instances on the DashboardBoard
 *
 * Widgets are placed on a grid defined in DashboardBoard.tsx.
 * Position stores { x: col, y: row } (0-indexed grid coordinates).
 */

import { create } from 'zustand'

export type AppView = 'pipeline' | 'dashboard' | 'logs'

export type WidgetType =
  | 'commit_feed'
  | 'ci_status'
  | 'core_web_vitals'
  | 'log_error_rate'
  | 'trivy_scan'
  | 'playwright_results'
  | 'grafana_embed'
  | 'prometheus_stat'
  | 'deployment_health'
  | 'docker_build_status'
  | 'terraform_plan'

export interface WidgetInstance {
  id: string
  type: WidgetType
  /** Grid coordinates — x = column index, y = row index (0-based) */
  position: { x: number; y: number }
  config?: Record<string, unknown>
}

interface DashboardStore {
  activeView: AppView
  nodeDashboardId: string | null
  widgets: WidgetInstance[]

  setView: (view: AppView) => void
  openNodeDashboard: (nodeId: string) => void
  closeNodeDashboard: () => void

  addWidget: (type: WidgetType, col: number, row: number) => void
  removeWidget: (id: string) => void
  /** Move a widget to a new grid cell */
  moveWidget: (id: string, col: number, row: number) => void
  /** Legacy compat — position as {x: col, y: row} */
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void
}

let _widgetSeq = 0
function genWidgetId() {
  return `w-${++_widgetSeq}-${Date.now().toString(36)}`
}

/** Find the first free grid cell (left-to-right, top-to-bottom) given COLS */
function findFreeCell(
  widgets: WidgetInstance[],
  cols: number,
): { x: number; y: number } {
  const occupied = new Set(widgets.map((w) => `${w.position.x},${w.position.y}`))
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < cols; col++) {
      if (!occupied.has(`${col},${row}`)) return { x: col, y: row }
    }
  }
  return { x: 0, y: 0 }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  activeView: 'pipeline',
  nodeDashboardId: null,
  widgets: [],

  setView: (view) => set({ activeView: view }),
  openNodeDashboard: (nodeId) => set({ nodeDashboardId: nodeId }),
  closeNodeDashboard: () => set({ nodeDashboardId: null }),

  addWidget: (type, col, row) =>
    set((s) => ({
      widgets: [
        ...s.widgets,
        { id: genWidgetId(), type, position: { x: col, y: row } },
      ],
    })),

  removeWidget: (id) =>
    set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),

  moveWidget: (id, col, row) =>
    set((s) => ({
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, position: { x: col, y: row } } : w,
      ),
    })),

  updateWidgetPosition: (id, position) =>
    set((s) => ({
      widgets: s.widgets.map((w) => (w.id === id ? { ...w, position } : w)),
    })),
}))

/** Helper exported for DashboardBoard — finds next free cell */
export { findFreeCell }

/**
 * DashboardBoard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Apple widget-style grid dashboard.
 *
 * Layout:
 *   • Fixed-size grid cells (CELL_W × CELL_H) with a GAP between them
 *   • Empty cells are always visible as faint ghost placeholders
 *   • Dragging a widget from the library shows a blue-ringed highlight on the
 *     target cell + a ghost preview (icon + name) — before the user drops
 *   • On drop the widget snaps into the cell with a spring animation
 *   • Existing widgets can be repositioned by dragging their header to a new
 *     cell — target cell glows, widget snaps on release
 */

import {
  useRef,
  useCallback,
  useState,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useDashboardStore,
  findFreeCell,
  type WidgetType,
  type WidgetInstance,
} from '@/store/dashboardStore'
import WidgetLibrary, { WIDGET_META } from './WidgetLibrary'
import CommitFeed        from './widgets/CommitFeed'
import CIStatus          from './widgets/CIStatus'
import CoreWebVitals     from './widgets/CoreWebVitals'
import LogErrorRate      from './widgets/LogErrorRate'
import TrivyScan         from './widgets/TrivyScan'
import PlaywrightResults from './widgets/PlaywrightResults'
import GrafanaEmbed      from './widgets/GrafanaEmbed'
import PrometheusStat    from './widgets/PrometheusStat'
import DeploymentHealth  from './widgets/DeploymentHealth'
import DockerBuildStatus from './widgets/DockerBuildStatus'

// ─── Grid constants ───────────────────────────────────────────────────────────

const CELL_W = 360   // widget cell width  (px)
const CELL_H = 288   // widget cell height (px)
const GAP    = 16    // gap between cells  (px)
const PAD    = 24    // board padding      (px)
const COLS   = 3     // fixed column count

// Pixel origin of cell (col, row)
function cellOrigin(col: number, row: number) {
  return {
    x: PAD + col * (CELL_W + GAP),
    y: PAD + row * (CELL_H + GAP),
  }
}

// Convert board-relative pixel coords → grid cell
function pixelToCell(
  bx: number,
  by: number,
): { col: number; row: number } {
  const col = Math.max(0, Math.min(COLS - 1, Math.floor((bx - PAD) / (CELL_W + GAP))))
  const row = Math.max(0, Math.floor((by - PAD) / (CELL_H + GAP)))
  return { col, row }
}

// Shared module ref so WidgetLibrary can tell us what type is being dragged
// (onDragOver can't read dataTransfer for security reasons)
let _activeDragType: WidgetType | null = null
export function setActiveDragType(t: WidgetType | null) {
  _activeDragType = t
}

// ─── Widget renderer ──────────────────────────────────────────────────────────

function renderWidget(w: WidgetInstance) {
  switch (w.type) {
    case 'commit_feed':         return <CommitFeed         id={w.id} />
    case 'ci_status':           return <CIStatus           id={w.id} />
    case 'core_web_vitals':     return <CoreWebVitals      id={w.id} />
    case 'log_error_rate':      return <LogErrorRate       id={w.id} />
    case 'trivy_scan':          return <TrivyScan          id={w.id} />
    case 'playwright_results':  return <PlaywrightResults  id={w.id} />
    case 'grafana_embed':       return <GrafanaEmbed       id={w.id} />
    case 'prometheus_stat':     return <PrometheusStat     id={w.id} />
    case 'deployment_health':   return <DeploymentHealth   id={w.id} />
    case 'docker_build_status': return <DockerBuildStatus  id={w.id} />
    default: return null
  }
}

// ─── Ghost cell component ─────────────────────────────────────────────────────

function GhostCell({
  col,
  row,
  isTarget,
  isOccupied,
  dragType,
}: {
  col: number
  row: number
  isTarget: boolean
  isOccupied: boolean
  dragType: WidgetType | null
}) {
  const { x, y } = cellOrigin(col, row)
  const meta = dragType ? WIDGET_META[dragType] : null
  const Icon = meta?.icon

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CELL_W,
        height: CELL_H,
        borderRadius: 14,
        border: isTarget
          ? '2px solid rgba(59,130,246,0.55)'
          : isOccupied
          ? 'none'
          : '1px dashed rgba(0,0,0,0.08)',
        background: isTarget
          ? 'rgba(59,130,246,0.06)'
          : isOccupied
          ? 'transparent'
          : 'rgba(255,255,255,0.45)',
        backdropFilter: isTarget ? 'none' : 'none',
        transition: 'border 0.15s, background 0.15s',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        boxShadow: isTarget ? '0 0 0 4px rgba(59,130,246,0.12)' : 'none',
      }}
    >
      {/* Ghost preview when dragging a new widget over this cell */}
      {isTarget && meta && Icon && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: meta.color + '18',
              border: `1.5px solid ${meta.color}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={22} color={meta.color} strokeWidth={1.8} />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#3B82F6',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {meta.label}
          </motion.span>
        </div>
      )}

      {/* Reposition drop target — just a pulsing ring, no icon */}
      {isTarget && !meta && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '2px solid rgba(59,130,246,0.45)',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <div
      style={{
        position: 'absolute',
        left: PAD + (COLS * (CELL_W + GAP)) / 2,
        top: PAD + CELL_H / 2,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: '#F0F0EE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
          Your dashboard is empty
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: '"DM Sans", sans-serif', marginTop: 3, lineHeight: 1.5 }}>
          Drag widgets from the left panel<br />into any cell to get started
        </div>
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function DashboardBoard() {
  const { widgets, addWidget, moveWidget } = useDashboardStore()
  const boardRef = useRef<HTMLDivElement>(null)

  // What cell is the user currently hovering over during a drag
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null)
  // Type currently being dragged from the library (for ghost preview)
  const [libraryDragType, setLibraryDragType] = useState<WidgetType | null>(null)
  // Which existing widget is being repositioned
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // ── Board-relative mouse helper ─────────────────────────────────────────────
  const toBoardCoords = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { bx: clientX - rect.left, by: clientY - rect.top }
  }, [])

  // ── Grid dimensions ─────────────────────────────────────────────────────────
  const maxRow = widgets.length === 0
    ? 0
    : Math.max(...widgets.map((w) => w.position.y))
  const totalRows = Math.max(3, maxRow + 2)

  // All cells to render as ghost backgrounds
  const ghostCells: { col: number; row: number }[] = []
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < COLS; c++) {
      ghostCells.push({ col: c, row: r })
    }
  }

  const occupiedSet = new Set(widgets.map((w) => `${w.position.x},${w.position.y}`))

  // ── Drag-from-library handlers ──────────────────────────────────────────────
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setLibraryDragType(_activeDragType)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const coords = toBoardCoords(e.clientX, e.clientY)
    if (!coords) return
    const cell = pixelToCell(coords.bx, coords.by)
    setHoverCell(cell)
    if (!libraryDragType && _activeDragType) {
      setLibraryDragType(_activeDragType)
    }
  }, [toBoardCoords, libraryDragType])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the board entirely
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const { clientX: cx, clientY: cy } = e
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) {
      setHoverCell(null)
      setLibraryDragType(null)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/dashboard-widget') as WidgetType
    if (!type) { setHoverCell(null); setLibraryDragType(null); return }

    const coords = toBoardCoords(e.clientX, e.clientY)
    const cell = coords
      ? pixelToCell(coords.bx, coords.by)
      : (() => { const fc = findFreeCell(widgets, COLS); return { col: fc.x, row: fc.y } })()

    addWidget(type, cell.col, cell.row)
    setHoverCell(null)
    setLibraryDragType(null)
    _activeDragType = null
  }, [toBoardCoords, widgets, addWidget])

  // ── Widget reposition via pointer drag on header ────────────────────────────
  const startWidgetDrag = useCallback((id: string) => {
    setDraggingId(id)

    function onMove(e: PointerEvent) {
      const coords = toBoardCoords(e.clientX, e.clientY)
      if (!coords) return
      setHoverCell(pixelToCell(coords.bx, coords.by))
    }

    function onUp(e: PointerEvent) {
      const coords = toBoardCoords(e.clientX, e.clientY)
      if (coords) {
        const cell = pixelToCell(coords.bx, coords.by)
        moveWidget(id, cell.col, cell.row)
      }
      setDraggingId(null)
      setHoverCell(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [toBoardCoords, moveWidget])

  // Board canvas total size
  const boardW = PAD * 2 + COLS * (CELL_W + GAP) - GAP
  const boardH = PAD * 2 + totalRows * (CELL_H + GAP) - GAP

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <WidgetLibrary />

      {/* ── Scrollable canvas ──────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#F7F7F5',
        }}
      >
        <div
          ref={boardRef}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            position: 'relative',
            width: boardW,
            minHeight: boardH,
            margin: '0 auto',
          }}
        >
          {/* ── Empty hint ─────────────────────────────────────────────────── */}
          {widgets.length === 0 && <EmptyHint />}

          {/* ── Ghost cells (always visible) ───────────────────────────────── */}
          {ghostCells.map(({ col, row }) => {
            const key = `${col},${row}`
            const isOccupied = occupiedSet.has(key)
            const isTarget =
              hoverCell?.col === col && hoverCell?.row === row &&
              (libraryDragType !== null || draggingId !== null)

            return (
              <GhostCell
                key={key}
                col={col}
                row={row}
                isTarget={isTarget}
                isOccupied={isOccupied}
                dragType={libraryDragType}
              />
            )
          })}

          {/* ── Widgets ────────────────────────────────────────────────────── */}
          {widgets.map((w) => {
            const { x: col, y: row } = w.position
            const { x, y } = cellOrigin(col, row)
            const isDragging = draggingId === w.id

            return (
              <motion.div
                key={w.id}
                layout
                layoutId={w.id}
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{
                  scale: isDragging ? 0.96 : 1,
                  opacity: isDragging ? 0.45 : 1,
                  x,
                  y,
                }}
                transition={{
                  layout: { type: 'spring', stiffness: 380, damping: 30 },
                  scale: { duration: 0.15 },
                  opacity: { duration: 0.15 },
                  x: { type: 'spring', stiffness: 380, damping: 30 },
                  y: { type: 'spring', stiffness: 380, damping: 30 },
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: CELL_W,
                  zIndex: isDragging ? 10 : 2,
                  cursor: isDragging ? 'grabbing' : 'default',
                  userSelect: 'none',
                }}
              >
                {/* Drag handle overlay on header */}
                <div
                  onPointerDown={(e) => {
                    // Only trigger from within the top 44px (widget header)
                    const rect = e.currentTarget.getBoundingClientRect()
                    const localY = e.clientY - rect.top
                    if (localY > 44) return
                    e.preventDefault()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    startWidgetDrag(w.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 44,
                    zIndex: 3,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    borderRadius: '10px 10px 0 0',
                  }}
                />
                {renderWidget(w)}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

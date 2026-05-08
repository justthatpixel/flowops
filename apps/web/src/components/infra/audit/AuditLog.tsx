/**
 * AuditLog.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Collapsible bottom strip showing every guardrail check event (Phase 5).
 *
 * STATES
 *   Collapsed (40px): "Audit Log · N events" + last outcome badge + toggle
 *   Expanded (240px): scrollable table of last 20 AuditEntry rows
 *
 * Each row shows:
 *   Time ago  |  Action  |  Cost  |  OPA  |  SCP  |  Outcome badge
 *
 * Positioned as a flex child of InfraDesigner — below the canvas area, above
 * nothing.  Has a top border and a white/light background.
 */

import { useState }              from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, Trash2, ClipboardList } from 'lucide-react'
import { useGuardrailStore, type AuditEntry } from '@/store/guardrailStore'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff <  60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ─── Layer pill ───────────────────────────────────────────────────────────────

function LayerPill({ result }: { result: 'pass' | 'block' | 'skip' }) {
  const color = result === 'pass' ? '#22C55E'
    : result === 'block' ? '#EF4444'
    : '#9CA3AF'
  const bg = color + '18'
  const icon = result === 'pass' ? '✓' : result === 'block' ? '✗' : '–'
  return (
    <span
      style={{
        fontSize:     9,
        fontWeight:   700,
        color,
        background:   bg,
        borderRadius: 3,
        padding:      '1px 5px',
        fontFamily:   '"DM Sans", sans-serif',
        textAlign:    'center',
        minWidth:     16,
        display:      'inline-block',
      }}
    >
      {icon}
    </span>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function AuditRow({ entry, isFirst }: { entry: AuditEntry; isFirst: boolean }) {
  return (
    <div
      style={{
        display:    'grid',
        gridTemplateColumns: '64px 1fr 26px 26px 26px 64px',
        alignItems: 'center',
        gap:        8,
        padding:    '5px 16px',
        borderTop:  isFirst ? 'none' : '1px solid #F3F4F6',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      {/* Time */}
      <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
        {timeAgo(entry.timestamp)}
      </span>

      {/* Action */}
      <span
        style={{
          fontSize:     11,
          color:        '#374151',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}
      >
        {entry.action}
      </span>

      {/* Layer results */}
      <LayerPill result={entry.costResult} />
      <LayerPill result={entry.opaResult}  />
      <LayerPill result={entry.scpResult}  />

      {/* Outcome badge */}
      <span
        style={{
          fontSize:     9,
          fontWeight:   800,
          color:        entry.outcome === 'written' ? '#16A34A' : '#DC2626',
          background:   entry.outcome === 'written' ? '#DCFCE7' : '#FEE2E2',
          borderRadius: 4,
          padding:      '2px 7px',
          textAlign:    'center',
          letterSpacing:'0.04em',
          textTransform:'uppercase',
          whiteSpace:   'nowrap',
        }}
      >
        {entry.outcome === 'written' ? '✓ Written' : '✗ Blocked'}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuditLog() {
  const auditLog    = useGuardrailStore((s) => s.auditLog)
  const clearLog    = useGuardrailStore((s) => s.clearAuditLog)
  const [open, setOpen] = useState(false)

  const recent     = auditLog.slice(0, 20)
  const lastEntry  = auditLog[0] ?? null
  const anyBlocked = lastEntry?.outcome === 'blocked'

  return (
    <div
      style={{
        flexShrink:  0,
        borderTop:   `1px solid ${anyBlocked ? '#FECACA' : '#E5E7EB'}`,
        background:  '#FFFFFF',
        fontFamily:  '"DM Sans", sans-serif',
        transition:  'border-color 0.2s',
        zIndex:      5,
      }}
    >
      {/* ── Collapsed bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          height:      40,
          display:     'flex',
          alignItems:  'center',
          gap:         10,
          paddingLeft: 16,
          paddingRight:16,
          cursor:      'pointer',
          userSelect:  'none',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <ClipboardList
          size={13}
          color="#9CA3AF"
          strokeWidth={2}
        />
        <span
          style={{
            fontSize:   11,
            fontWeight: 600,
            color:      '#374151',
          }}
        >
          Audit Log
        </span>

        {auditLog.length > 0 && (
          <span
            style={{
              fontSize:     9,
              fontWeight:   700,
              color:        '#6B7280',
              background:   '#F3F4F6',
              borderRadius: 10,
              padding:      '1px 6px',
            }}
          >
            {auditLog.length}
          </span>
        )}

        {lastEntry && (
          <>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>
              {timeAgo(lastEntry.timestamp)}
            </span>
            <span
              style={{
                fontSize:     9,
                fontWeight:   800,
                color:        lastEntry.outcome === 'written' ? '#16A34A' : '#DC2626',
                background:   lastEntry.outcome === 'written' ? '#DCFCE7' : '#FEE2E2',
                borderRadius: 4,
                padding:      '1px 6px',
                letterSpacing:'0.04em',
                textTransform:'uppercase',
              }}
            >
              {lastEntry.outcome === 'written' ? '✓ Written' : '✗ Blocked'}
            </span>
          </>
        )}

        {auditLog.length === 0 && (
          <span style={{ fontSize: 11, color: '#D1D5DB' }}>
            No events yet — generate Terraform to record a check
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Clear button */}
        {auditLog.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); clearLog() }}
            title="Clear audit log"
            style={{
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              color:         '#D1D5DB',
              padding:       4,
              borderRadius:  4,
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              transition:    'color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#D1D5DB' }}
          >
            <Trash2 size={11} strokeWidth={2} />
          </button>
        )}

        {/* Chevron */}
        {open
          ? <ChevronDown size={13} color="#9CA3AF" strokeWidth={2} />
          : <ChevronUp   size={13} color="#9CA3AF" strokeWidth={2} />
        }
      </div>

      {/* ── Expanded table ────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="audit-table"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 240, opacity: 1 }}
            exit={{   height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ overflow: 'hidden' }}
          >
            {/* Column headers */}
            <div
              style={{
                display:     'grid',
                gridTemplateColumns: '64px 1fr 26px 26px 26px 64px',
                alignItems:  'center',
                gap:         8,
                padding:     '4px 16px 5px',
                background:  '#F9FAFB',
                borderTop:   '1px solid #F3F4F6',
                borderBottom:'1px solid #F3F4F6',
              }}
            >
              {['Time', 'Action', '$', 'OPA', 'SCP', 'Outcome'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize:      9,
                    fontWeight:    700,
                    color:         '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily:    '"DM Sans", sans-serif',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div
              style={{
                overflowY:  'auto',
                height:     'calc(240px - 33px)',
              }}
            >
              {recent.length === 0 ? (
                <div
                  style={{
                    height:         '100%',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       11,
                    color:          '#D1D5DB',
                    fontFamily:     '"DM Sans", sans-serif',
                  }}
                >
                  No audit entries yet.
                </div>
              ) : (
                recent.map((entry, i) => (
                  <AuditRow key={entry.id} entry={entry} isFirst={i === 0} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * InfraSidebar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Left sidebar for the Infrastructure Designer — searchable, categorised
 * library of AWS services that can be dragged onto the canvas.
 *
 * FEATURES
 *   • Search bar — filters all services by name/label across all categories
 *   • CMD+K / CTRL+K keyboard shortcut to focus the search input
 *   • Category sections — each collapsible with an animated chevron
 *   • First category (Compute) open by default; all others collapsed
 *   • Draggable rows — sets `dataTransfer` so InfraCanvas can pick them up
 *   • Custom ghost image that follows the cursor during drag
 *   • Collapse toggle — narrows to a 48px icon rail to maximise canvas space
 *
 * DRAG PROTOCOL
 *   dragstart → setData('application/infra-service', serviceType)
 *   InfraCanvas onDrop → reads it, calls infraStore.addComponent()
 */

import {
  useState, useMemo, useCallback, useEffect, useRef,
} from 'react'
import {
  Search, ChevronDown, ChevronRight,
  GripVertical, PanelLeftClose, PanelLeftOpen, X, Plus, Globe,
} from 'lucide-react'
import { AWS_NODE_CONFIG }      from '@/lib/awsNodeConfig'
import { useInfraStore }        from '@/store/infraStore'
import type { AwsServiceType }  from '@/types/infra'

// ─── Category definitions ─────────────────────────────────────────────────────

interface Category {
  id:       string
  label:    string
  emoji:    string
  services: AwsServiceType[]
}

const CATEGORIES: Category[] = [
  {
    id: 'compute', label: 'Compute', emoji: '⚙️',
    services: ['ecs', 'ecs_task', 'ec2_asg', 'lambda', 'elastic_beanstalk'],
  },
  {
    id: 'networking', label: 'Networking', emoji: '🔀',
    services: ['vpc', 'public_subnet', 'private_subnet', 'alb', 'nat_gateway', 'route53', 'cloudfront', 'api_gateway'],
  },
  {
    id: 'database', label: 'Database', emoji: '🗄️',
    services: ['rds', 'rds_mysql', 'aurora_serverless', 'aurora_global', 'dynamodb', 'elasticache', 'elasticache_memcached'],
  },
  {
    id: 'storage', label: 'Storage', emoji: '🪣',
    services: ['s3', 'efs', 'ecr'],
  },
  {
    id: 'security', label: 'Security', emoji: '🛡️',
    services: ['iam_role', 'waf', 'shield', 'shield_advanced', 'secrets_manager', 'kms'],
  },
  {
    id: 'messaging', label: 'Messaging', emoji: '📨',
    services: ['sqs', 'sns', 'eventbridge', 'kinesis'],
  },
  {
    id: 'observability', label: 'Observability', emoji: '🔭',
    services: ['cloudwatch_dashboard', 'cloudwatch_alarm', 'xray'],
  },
]

// ─── Draggable service row ────────────────────────────────────────────────────

function ServiceRow({
  type,
  collapsed,
}: {
  type:      AwsServiceType
  collapsed: boolean
}) {
  const cfg = AWS_NODE_CONFIG[type]
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/infra-service', type)
    e.dataTransfer.effectAllowed = 'copy'
    setDragging(true)

    // Ghost drag preview
    const ghost         = document.createElement('div')
    ghost.textContent   = cfg.serviceLabel
    ghost.style.cssText = [
      'position:fixed; top:-9999px; left:-9999px;',
      `padding:5px 12px; background:${cfg.color}22;`,
      `color:${cfg.color}; border:1px solid ${cfg.color}55;`,
      'border-radius:8px; font-size:12px; font-weight:700;',
      'font-family:"DM Sans",sans-serif; pointer-events:none;',
      'box-shadow:0 2px 12px rgba(0,0,0,0.18); display:flex;',
      'align-items:center; gap:6px; white-space:nowrap;',
    ].join('')
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 18)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }, [cfg, type])

  const onDragEnd = useCallback(() => setDragging(false), [])

  if (collapsed) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={cfg.serviceLabel}
        style={{
          width:  40, height: 40,
          margin: '2px auto',
          borderRadius: 8,
          background: hovering ? `${cfg.color}15` : 'transparent',
          border:     hovering ? `1px solid ${cfg.color}44` : '1px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor:    'grab',
          transform: dragging ? 'scale(0.92)' : 'scale(1)',
          opacity:   dragging ? 0.45 : 1,
          transition:'background 0.1s, border-color 0.1s, transform 0.12s',
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <img
          src={cfg.icon}
          alt={cfg.serviceLabel}
          style={{ width: 20, height: 20, objectFit: 'contain' }}
        />
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding:  '5px 10px 5px 8px',
        borderRadius: 6,
        cursor:    'grab',
        background: hovering ? `${cfg.color}0D` : 'transparent',
        border:    hovering ? `1px solid ${cfg.color}2E` : '1px solid transparent',
        transform: dragging ? 'scale(0.97)' : 'scale(1)',
        opacity:   dragging ? 0.5 : 1,
        transition:'background 0.1s, border-color 0.1s, transform 0.12s',
        userSelect:'none',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Drag handle hint */}
      <GripVertical
        size={10}
        color={hovering ? '#9CA3AF' : 'transparent'}
        strokeWidth={2}
        style={{ flexShrink: 0, transition: 'color 0.1s' }}
      />

      {/* Coloured icon chip */}
      <div
        style={{
          width: 26, height: 26,
          borderRadius: 6,
          background: `${cfg.color}18`,
          border:     `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img src={cfg.icon} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 12, fontWeight: 500,
          color:    '#374151',
          fontFamily: '"DM Sans", sans-serif',
          flex: 1, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {cfg.serviceLabel}
      </span>
    </div>
  )
}

// ─── Category accordion section ───────────────────────────────────────────────

function CategorySection({
  category,
  collapsed,
  query,
  defaultOpen,
}: {
  category:    Category
  collapsed:   boolean
  query:       string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  // When search is active, auto-expand if there are matches
  const filtered = useMemo(() => {
    if (!query) return category.services
    const q = query.toLowerCase()
    return category.services.filter((s) =>
      AWS_NODE_CONFIG[s].serviceLabel.toLowerCase().includes(q) ||
      s.toLowerCase().includes(q)
    )
  }, [category.services, query])

  useEffect(() => {
    if (query && filtered.length > 0) setOpen(true)
  }, [query, filtered.length])

  if (filtered.length === 0) return null

  // Collapsed sidebar: just render icon rows without category header
  if (collapsed) {
    return (
      <div style={{ padding: '4px 0', borderBottom: '1px solid #F0F0F0' }}>
        {filtered.map((s) => (
          <ServiceRow key={s} type={s} collapsed />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Accordion header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: '"DM Sans", sans-serif',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>{category.emoji}</span>
        <span
          style={{
            fontSize: 10, fontWeight: 700, color: '#6B7280',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            flex: 1, textAlign: 'left',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {category.label}
        </span>
        <span
          style={{
            fontSize: 9, fontWeight: 600, color: '#D1D5DB',
            fontFamily: '"DM Sans", sans-serif', marginRight: 4,
          }}
        >
          {filtered.length}
        </span>
        {open
          ? <ChevronDown  size={11} color="#9CA3AF" strokeWidth={2.5} />
          : <ChevronRight size={11} color="#9CA3AF" strokeWidth={2.5} />
        }
      </button>

      {/* Items */}
      {open && (
        <div style={{ padding: '2px 6px 6px' }}>
          {filtered.map((s) => (
            <ServiceRow key={s} type={s} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Custom resource dialog ───────────────────────────────────────────────────

function CustomResourceRow({ collapsed }: { collapsed: boolean }) {
  const cfg      = AWS_NODE_CONFIG['custom']
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/infra-service', 'custom')
    e.dataTransfer.effectAllowed = 'copy'
    setDragging(true)
    const ghost = document.createElement('div')
    ghost.textContent = 'Custom Resource'
    ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px;padding:5px 12px;background:#F9FAFB;color:#374151;border:1px solid #D1D5DB;border-radius:8px;font-size:12px;font-weight:700;font-family:"DM Sans",sans-serif;pointer-events:none;'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 18)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }, [])

  const onDragEnd = useCallback(() => setDragging(false), [])

  if (collapsed) {
    return (
      <div
        draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
        title="Custom Resource"
        style={{
          width: 40, height: 40, margin: '2px auto', borderRadius: 8,
          background: hovering ? '#F3F4F6' : 'transparent',
          border: hovering ? '1px solid #D1D5DB' : '1px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab',
          transform: dragging ? 'scale(0.92)' : 'scale(1)', opacity: dragging ? 0.5 : 1,
          transition: 'background 0.1s, border-color 0.1s, transform 0.12s',
        }}
        onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
      >
        <img src={cfg.icon} alt="Custom" style={{ width: 20, height: 20, objectFit: 'contain' }} />
      </div>
    )
  }

  return (
    <div
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 8px', borderRadius: 6, cursor: 'grab',
        background: hovering ? '#F9FAFB' : 'transparent',
        border: hovering ? '1px solid #E5E7EB' : '1px dashed #D1D5DB',
        transform: dragging ? 'scale(0.97)' : 'scale(1)', opacity: dragging ? 0.5 : 1,
        transition: 'background 0.1s, border-color 0.1s, transform 0.12s',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
    >
      <GripVertical size={10} color={hovering ? '#9CA3AF' : 'transparent'} strokeWidth={2} style={{ flexShrink: 0 }} />
      <div
        style={{
          width: 26, height: 26, borderRadius: 6,
          background: '#F3F4F6', border: '1px dashed #D1D5DB',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Plus size={14} color="#6B7280" strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', fontFamily: '"DM Sans", sans-serif', flex: 1, lineHeight: 1.3 }}>
        Custom Resource
      </span>
    </div>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function InfraSidebar() {
  const [query,     setQuery]     = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const { openBrowser } = useInfraStore()

  // CMD+K / CTRL+K shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!collapsed) {
          searchRef.current?.focus()
          searchRef.current?.select()
        } else {
          // Expand sidebar and focus
          setCollapsed(false)
          setTimeout(() => {
            searchRef.current?.focus()
            searchRef.current?.select()
          }, 240) // wait for CSS transition
        }
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [collapsed])

  // Flat search results across all categories
  const searchResults = useMemo<AwsServiceType[]>(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return CATEGORIES.flatMap((c) => c.services).filter((s) =>
      AWS_NODE_CONFIG[s].serviceLabel.toLowerCase().includes(q) ||
      s.toLowerCase().includes(q) ||
      AWS_NODE_CONFIG[s].category.toLowerCase().includes(q)
    )
  }, [query])

  const showSearch = query.trim().length > 0

  return (
    <div
      style={{
        width:         collapsed ? 52 : 280,
        flexShrink:    0,
        borderRight:   '1px solid #E5E7EB',
        background:    '#FAFAFA',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        transition:    'width 0.22s ease',
        userSelect:    'none',
        zIndex:        5,
      }}
    >
      {/* ── Top bar: search + collapse toggle ──────────────────────────────── */}
      <div
        style={{
          height:  44,
          padding: '0 8px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '1px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 6,
              background:   '#FFFFFF',
              border:       '1px solid #E5E7EB',
              borderRadius: 7,
              padding:      '0 8px',
              height:       30,
              transition:   'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#3B82F6'
              ;(e.currentTarget as HTMLElement).style.boxShadow  = '0 0 0 2px #BFDBFE'
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
              ;(e.currentTarget as HTMLElement).style.boxShadow  = 'none'
            }}
          >
            <Search size={11} color="#9CA3AF" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources…"
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 11, color: '#374151',
                fontFamily: '"DM Sans", sans-serif',
                width: '100%',
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus() }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 0,
                  color: '#9CA3AF', flexShrink: 0,
                }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? `Expand sidebar (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K)` : 'Collapse sidebar'}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'none', border: '1px solid #E5E7EB',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#9CA3AF',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none';    e.currentTarget.style.color = '#9CA3AF' }}
        >
          {collapsed
            ? <PanelLeftOpen  size={13} strokeWidth={2} />
            : <PanelLeftClose size={13} strokeWidth={2} />
          }
        </button>
      </div>

      {/* ── Hint text ──────────────────────────────────────────────────────── */}
      {!collapsed && !showSearch && (
        <div
          style={{
            padding:    '6px 12px 4px',
            fontSize:   10,
            color:      '#9CA3AF',
            fontFamily: '"DM Sans", sans-serif',
            lineHeight: 1.5, flexShrink: 0,
          }}
        >
          Drag a resource onto the canvas · <span style={{ opacity: 0.7 }}>{navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'} to search</span>
        </div>
      )}

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>

        {/* ── Search results ────────────────────────────────────────────── */}
        {showSearch && !collapsed && (
          <div style={{ padding: '6px 6px 12px' }}>
            <div
              style={{
                fontSize: 9, fontWeight: 700, color: '#9CA3AF',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                padding: '4px 6px 6px',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                : 'No results'
              }
            </div>
            {searchResults.length === 0 ? (
              <div
                style={{
                  padding: '10px 6px', fontSize: 11, color: '#D1D5DB',
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                No resources match "{query}"
              </div>
            ) : (
              searchResults.map((s) => (
                <ServiceRow key={s} type={s} collapsed={false} />
              ))
            )}
          </div>
        )}

        {/* ── Categorised list ─────────────────────────────────────────── */}
        {(!showSearch || collapsed) && (
          <div style={{ paddingTop: 4 }}>
            {CATEGORIES.map((cat, i) => (
              <CategorySection
                key={cat.id}
                category={cat}
                collapsed={collapsed}
                query={collapsed ? '' : query}
                defaultOpen={i === 0}  // Compute open by default
              />
            ))}

            {/* Custom resource section */}
            {!collapsed ? (
              <div>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>🔌</span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, color: '#6B7280',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      flex: 1, fontFamily: '"DM Sans", sans-serif',
                    }}
                  >
                    Custom
                  </span>
                </div>
                <div style={{ padding: '2px 6px 6px' }}>
                  <CustomResourceRow collapsed={false} />
                </div>
              </div>
            ) : (
              <div style={{ padding: '4px 0', borderTop: '1px solid #F0F0F0' }}>
                <CustomResourceRow collapsed />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Browser button (pinned to bottom) ──────────────────────────────── */}
      <div style={{
        padding:    collapsed ? '8px 6px' : '8px 10px',
        borderTop:  '1px solid #E5E7EB',
        flexShrink: 0,
      }}>
        {collapsed ? (
          <button
            onClick={() => openBrowser()}
            title="Open Source Browser"
            style={{
              width: 40, height: 40, margin: '0 auto', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid #E5E7EB', cursor: 'pointer',
              color: '#9CA3AF', transition: 'background 0.1s, color 0.1s, border-color 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background  = 'linear-gradient(135deg, #EFF6FF, #EEF2FF)'
              e.currentTarget.style.color       = '#6366F1'
              e.currentTarget.style.borderColor = '#C7D2FE'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background  = 'none'
              e.currentTarget.style.color       = '#9CA3AF'
              e.currentTarget.style.borderColor = '#E5E7EB'
            }}
          >
            <Globe size={16} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={() => openBrowser()}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'linear-gradient(135deg, #EFF6FF, #EEF2FF)',
              border: '1px solid #C7D2FE',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background  = 'linear-gradient(135deg, #DBEAFE, #E0E7FF)'
              e.currentTarget.style.borderColor = '#6366F1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background  = 'linear-gradient(135deg, #EFF6FF, #EEF2FF)'
              e.currentTarget.style.borderColor = '#C7D2FE'
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 6, flexShrink: 0,
              background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Globe size={14} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF', fontFamily: '"DM Sans", sans-serif' }}>
                Source Browser
              </div>
              <div style={{ fontSize: 10, color: '#6B7280', fontFamily: '"DM Sans", sans-serif' }}>
                Prometheus · Grafana · Jenkins…
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 5,
  fontFamily: '"DM Sans", sans-serif',
}

const BASE_INPUT: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  border: '1px solid #E5E7EB',
  borderRadius: 4,
  fontSize: 12,
  color: '#111827',
  background: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
  fontFamily: '"DM Sans", sans-serif',
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  )
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...BASE_INPUT,
        cursor: 'pointer',
        borderColor: focused ? '#3B82F6' : '#E5E7EB',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        paddingRight: 26,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Input({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...BASE_INPUT,
        borderColor: focused ? '#3B82F6' : '#E5E7EB',
        fontFamily: mono ? '"JetBrains Mono", monospace' : '"DM Sans", sans-serif',
      }}
    />
  )
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '8px',
        border: `1px solid ${focused ? '#3B82F6' : '#E5E7EB'}`,
        borderRadius: 4,
        fontSize: 12,
        color: '#111827',
        background: '#FFFFFF',
        outline: 'none',
        resize: 'vertical',
        boxSizing: 'border-box',
        fontFamily: '"DM Sans", sans-serif',
        lineHeight: 1.5,
        transition: 'border-color 0.15s',
      }}
    />
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontSize: 12,
        color: '#374151',
        fontFamily: '"DM Sans", sans-serif',
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 14, height: 14, accentColor: '#3B82F6', cursor: 'pointer' }}
      />
      {label}
    </label>
  )
}

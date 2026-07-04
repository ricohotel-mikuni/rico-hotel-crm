import { BADGE_STYLES, C } from '../lib/constants'

// ── Button ─────────────────────────────────────────────────
export function Btn({ onClick, icon, label, color, outline, sm, disabled, full, type = 'button' }) {
  const bg = outline ? 'transparent' : color || C.navy
  const fc = outline ? color || C.navy : '#fff'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 5, padding: sm ? '5px 11px' : '8px 15px',
        background: bg, color: fc,
        border: outline ? `1px solid ${color || C.navy}` : '1px solid transparent',
        borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: sm ? 12 : 13, fontWeight: 500, fontFamily: 'inherit',
        whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : 'auto',
        boxShadow: outline ? 'none' : '0 1px 3px rgba(0,0,0,.1)',
        transition: 'opacity .15s, transform .1s',
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'none')}
    >
      {icon && <i className={`ti ${icon}`} style={{ fontSize: sm ? 13 : 15 }} />}
      {label}
    </button>
  )
}

// ── Badge ──────────────────────────────────────────────────
export function Badge({ status }) {
  const s = BADGE_STYLES[status] || { bg: '#F5F5F5', c: '#757575' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 12,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.c,
      whiteSpace: 'nowrap',
    }}>
      {status || '—'}
    </span>
  )
}

// ── Form: Label + Input ─────────────────────────────────────
export function FI({ label, value, onChange, type = 'text', placeholder = '', required, readOnly }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}{required && ' *'}
      </label>
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        style={{
          width: '100%', padding: '8px 10px',
          border: '1px solid #E0E0E0', borderRadius: 5,
          fontSize: 13, background: readOnly ? '#F5F5F5' : '#FFFDE7',
          boxSizing: 'border-box', outline: 'none',
          transition: 'border-color .15s',
          cursor: readOnly ? 'default' : 'text',
        }}
        onFocus={e => !readOnly && (e.target.style.borderColor = C.navy)}
        onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
      />
    </div>
  )
}

// ── Form: Label + Textarea ─────────────────────────────────
export function FT({ label, value, onChange, rows = 3 }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{
          width: '100%', padding: '8px 10px',
          border: '1px solid #E0E0E0', borderRadius: 5,
          fontSize: 13, background: '#FFFDE7',
          boxSizing: 'border-box', resize: 'vertical', outline: 'none',
        }}
        onFocus={e => (e.target.style.borderColor = C.navy)}
        onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
      />
    </div>
  )
}

// ── Form: Label + Select ───────────────────────────────────
export function FS({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px',
          border: '1px solid #E0E0E0', borderRadius: 5,
          fontSize: 13, background: '#FFFDE7',
          fontFamily: 'inherit', outline: 'none',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ── Field Display (read-only styled) ──────────────────────
export function FV({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#90A4AE', marginBottom: 2, fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, padding: '7px 10px', borderRadius: 4,
        background: highlight ? '#E3F2FD' : '#F8F9FA',
        border: `1px solid ${highlight ? '#BBDEFB' : '#ECEFF1'}`,
        minHeight: 32, color: '#1A2332', lineHeight: 1.4,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

// ── 2-column grid ─────────────────────────────────────────
export function G2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>{children}</div>
}

// ── Divider ───────────────────────────────────────────────
export function Dvd() {
  return <div style={{ height: 1, background: '#ECEFF1', margin: '10px 0' }} />
}

// ── Loading Spinner ────────────────────────────────────────
export function Spinner({ size = 24, color = C.navy }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}20`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Page Loading Screen ───────────────────────────────────
export function PageLoader({ message = '読み込み中…' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, minHeight: '60vh',
    }}>
      <Spinner size={36} />
      <div style={{ fontSize: 14, color: '#90A4AE' }}>{message}</div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export function Empty({ icon, title, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#BDBDBD' }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 44, display: 'block', marginBottom: 12 }} />}
      <div style={{ fontSize: 14, marginBottom: action ? 16 : 0 }}>{title}</div>
      {action}
    </div>
  )
}

// ── Toast Notification ─────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  const colors = { success: C.green, error: C.red, info: C.navy }
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      background: colors[type], color: '#fff',
      padding: '10px 16px', borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,.2)',
      fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fadeIn .2s ease-out',
    }}>
      <i className={`ti ${type === 'success' ? 'ti-check' : type === 'error' ? 'ti-x' : 'ti-info-circle'}`} />
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 6, fontSize: 14, lineHeight: 1 }}>×</button>
    </div>
  )
}

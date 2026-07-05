import { useEffect, useRef, useState } from 'react'
import { BADGE_STYLES, C } from '../lib/constants'
import { downloadFile, fileNameFromUrl } from '../lib/storage'

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

// ── File Upload: Image (drag & drop + preview) ─────────────
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp']
const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp'
const extOf = (name) => (name.split('.').pop() || '').toLowerCase()

export function ImageUpload({ label, icon, color, value, file, onFile }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState(null)
  const tint = color || C.navy

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const displayUrl = preview || value

  const handleFiles = (files) => {
    const f = files?.[0]
    if (!f) return
    if (!IMAGE_EXT.includes(extOf(f.name))) { setErr('対応していない形式です（JPG / PNG / WEBP）'); return }
    setErr(null)
    onFile(f)
  }

  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1.5px dashed ${dragOver ? tint : '#E0E0E0'}`,
          borderRadius: 7, padding: 8, cursor: 'pointer',
          background: dragOver ? `${tint}0D` : '#FAFAFA',
          transition: 'border-color .15s, background .15s',
        }}
      >
        {displayUrl
          ? <img src={displayUrl} alt={label} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#fff', border: '1px solid #ECEFF1' }} />
          : <div style={{ width: 48, height: 48, borderRadius: 6, background: `${tint}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${icon || 'ti-photo'}`} style={{ fontSize: 20, color: tint }} />
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.navyLight, fontWeight: 600 }}>
            {file ? '選択済み（保存で反映）' : displayUrl ? '画像を変更' : 'ファイルを選択'}
          </div>
          <div style={{ fontSize: 10, color: '#90A4AE', marginTop: 2 }}>クリックまたはドラッグ＆ドロップ（JPG/PNG/WEBP）</div>
        </div>
      </div>
      {err && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{err}</div>}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        style={{ display: 'none' }}
      />
    </div>
  )
}

// ── File Upload: Document (drag & drop + name/open/download) ─
const DOC_EXT = ['pdf', 'doc', 'docx', 'xlsx']
const DOC_ACCEPT = '.pdf,.doc,.docx,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function DocUpload({ label, icon, color, value, file, onFile }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState(null)
  const tint = color || C.navy

  const fileName = file ? file.name : value ? fileNameFromUrl(value) : null

  const handleFiles = (files) => {
    const f = files?.[0]
    if (!f) return
    if (!DOC_EXT.includes(extOf(f.name))) { setErr('対応していない形式です（PDF / DOC / DOCX / XLSX）'); return }
    setErr(null)
    onFile(f)
  }

  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1.5px dashed ${dragOver ? tint : '#E0E0E0'}`,
          borderRadius: 7, padding: 8, cursor: 'pointer',
          background: dragOver ? `${tint}0D` : '#FAFAFA',
          transition: 'border-color .15s, background .15s',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 6, background: `${tint}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icon || 'ti-file'}`} style={{ fontSize: 20, color: tint }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.navyLight, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName || 'ファイルを選択'}
          </div>
          <div style={{ fontSize: 10, color: '#90A4AE', marginTop: 2 }}>クリックまたはドラッグ＆ドロップ（PDF/DOC/DOCX/XLSX）</div>
        </div>
        {value && !file && (
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <a href={value} target="_blank" rel="noopener noreferrer" title="開く" style={{ width: 28, height: 28, borderRadius: 5, background: '#fff', border: '1px solid #ECEFF1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy }}>
              <i className="ti ti-external-link" style={{ fontSize: 13 }} />
            </a>
            <button type="button" onClick={() => downloadFile(value, fileName)} title="ダウンロード" style={{ width: 28, height: 28, borderRadius: 5, background: '#fff', border: '1px solid #ECEFF1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy }}>
              <i className="ti ti-download" style={{ fontSize: 13 }} />
            </button>
          </div>
        )}
      </div>
      {err && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{err}</div>}
      <input
        ref={inputRef}
        type="file"
        accept={DOC_ACCEPT}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        style={{ display: 'none' }}
      />
    </div>
  )
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

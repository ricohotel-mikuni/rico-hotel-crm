import { DASH } from '../lib/designSystem'

// ── Button ─────────────────────────────────────────────────
export function Btn({ onClick, icon, label, color, outline, sm, disabled, full, type = 'button' }) {
  const bg = outline ? 'transparent' : color || DASH.brandNavy
  const fc = outline ? color || DASH.brandNavy : '#fff'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 5, padding: sm ? '5px 11px' : '8px 15px',
        background: bg, color: fc,
        border: outline ? `1px solid ${color || DASH.brandNavy}` : '1px solid transparent',
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
// カテゴリ→DASHトークンのマッピング(Foundation v1.0是正: 以前は
// BADGE_STYLESという固定hexの配列で、ダークモードに一切追従しな
// かった)。背景は低アルファのrgba(ライト/ダーク双方の地色に対して
// 「色味を足す」だけなので両テーマで破綻しない、既存のResultBadge等
// と同じ手法)、文字色はDASHトークン(テーマ反応)を使う。
const BADGE_CATEGORY = {
  '成約': 'success', '契約締結': 'success', '本予約': 'success', '確認済': 'success', 'あり': 'success',
  '承認済み': 'success', '在籍中': 'success', '営業担当': 'success',
  '見積提出': 'warning', '未確認': 'warning', '承認待ち': 'warning', 'B': 'warning',
  '検討中': 'pending', '仮予約': 'pending',
  '継続商談中': 'info', '提案中': 'info', 'マネージャー': 'info', '管理者': 'info',
  '初回訪問済': 'early', '営業中': 'early',
  '未訪問': 'neutral', '未着手': 'neutral', 'なし': 'neutral', '閲覧のみ': 'neutral', '取消': 'neutral', '退職済み': 'neutral', 'C': 'neutral',
  'キャンセル': 'danger', '失注': 'danger', '却下': 'danger', 'A': 'danger',
}
const BADGE_TINT = {
  success: 'rgba(22,163,74,.12)', warning: 'rgba(217,119,6,.12)', pending: 'rgba(212,175,55,.14)',
  info: 'rgba(58,109,255,.12)', early: 'rgba(147,51,234,.12)', neutral: 'rgba(107,114,128,.12)', danger: 'rgba(220,38,38,.12)',
}
const BADGE_COLOR = {
  success: DASH.green, warning: DASH.orange, pending: DASH.gold,
  info: DASH.blue, early: DASH.purple, neutral: DASH.textFaint, danger: DASH.alert,
}
export function Badge({ status }) {
  const cat = BADGE_CATEGORY[status] || 'neutral'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 12,
      fontSize: 11, fontWeight: 700, background: BADGE_TINT[cat], color: BADGE_COLOR[cat],
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
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>
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
          border: `1px solid ${DASH.border}`, borderRadius: 5,
          fontSize: 13, background: readOnly ? DASH.surface1 : DASH.inputBg, color: DASH.textMain,
          boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
          transition: 'border-color .15s',
          cursor: readOnly ? 'default' : 'text',
        }}
        onFocus={e => !readOnly && (e.target.style.borderColor = DASH.gold)}
        onBlur={e => (e.target.style.borderColor = DASH.border)}
      />
    </div>
  )
}

// ── Form: Label + Textarea ─────────────────────────────────
export function FT({ label, value, onChange, rows = 3 }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{
          width: '100%', padding: '8px 10px',
          border: `1px solid ${DASH.border}`, borderRadius: 5,
          fontSize: 13, background: DASH.inputBg, color: DASH.textMain,
          boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
        }}
        onFocus={e => (e.target.style.borderColor = DASH.gold)}
        onBlur={e => (e.target.style.borderColor = DASH.border)}
      />
    </div>
  )
}

// ── Form: Label + Select ───────────────────────────────────
export function FS({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px',
          border: `1px solid ${DASH.border}`, borderRadius: 5,
          fontSize: 13, background: DASH.inputBg, color: DASH.textMain,
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
      <div style={{ fontSize: 10, color: DASH.textFaint, marginBottom: 2, fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, padding: '7px 10px', borderRadius: 4,
        background: highlight ? 'rgba(212,175,55,.1)' : DASH.surface1,
        border: `1px solid ${highlight ? DASH.gold : DASH.border}`,
        minHeight: 32, color: DASH.textSub, lineHeight: 1.4,
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
  return <div style={{ height: 1, background: DASH.border, margin: '10px 0' }} />
}

// ── Loading Spinner ────────────────────────────────────────
export function Spinner({ size = 24, color = DASH.brandNavy, trackColor = 'rgba(31,56,100,.15)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${trackColor}`,
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
      <div style={{ fontSize: 14, color: DASH.textFaint }}>{message}</div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export function Empty({ icon, title, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: DASH.textFaint }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 44, display: 'block', marginBottom: 12 }} />}
      <div style={{ fontSize: 14, marginBottom: action ? 16 : 0 }}>{title}</div>
      {action}
    </div>
  )
}

// ── Error State (data load failure, with retry) ────────────
// `compact` shrinks the min-height for use *inside* a page that already
// has its own always-visible title/actions above it (see AsyncBoundary
// below) — the default (tall) sizing is for whole-page usage.
export function ErrorState({ message, onRetry, compact }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, minHeight: compact ? 200 : '50vh', padding: '20px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: 'rgba(220,38,38,.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-wifi-off" style={{ fontSize: 26, color: DASH.alert }} />
      </div>
      <div style={{ fontSize: 14, color: DASH.textSub, lineHeight: 1.7 }}>
        データの読み込みに失敗しました。<br />
        通信環境をご確認のうえ、もう一度お試しください。
      </div>
      {message && (
        <div style={{ fontSize: 11, color: DASH.textFaint, maxWidth: 320, wordBreak: 'break-word' }}>
          {message}
        </div>
      )}
      {onRetry && <Btn onClick={onRetry} icon="ti-refresh" label="再読み込み" color={DASH.brandNavy} />}
    </div>
  )
}

// ── Async Boundary — separates a screen's always-visible chrome
// (title, action buttons) from its data-fetch state. Wrap ONLY the
// data-dependent region with this; page title/buttons must render
// outside it so a slow or failing fetch never blanks the whole screen.
//   {loading && <TableSkeleton/>} / {error && <ErrorState .../>} in one
//   place, reused everywhere instead of each screen re-deriving it.
export function AsyncBoundary({ loading, error, onRetry, skeleton, children }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} compact />
  if (loading) return skeleton || <PageLoader />
  return children
}

// ── Table Skeleton — default loading placeholder for AsyncBoundary
// when the wrapped content is a data table (shimmering rows instead of
// a blank spinner, closer to what the final content will look like).
export function TableSkeleton({ rows = 5, columns = 5, avatar }) {
  return (
    <div style={{ background: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '13px 16px',
          borderBottom: r < rows - 1 ? `1px solid ${DASH.border}` : 'none',
        }}>
          {avatar && <div className="skeleton-bar" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />}
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="skeleton-bar" style={{ height: 12, borderRadius: 4, flex: 1, maxWidth: c === 0 ? 140 : 100 }} />
          ))}
        </div>
      ))}
      <style>{`
        .skeleton-bar {
          background: linear-gradient(90deg, ${DASH.surface2} 25%, ${DASH.surface3} 37%, ${DASH.surface2} 63%);
          background-size: 400% 100%;
          animation: skeleton-shimmer 1.4s ease infinite;
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  )
}

// ── Toast Notification ─────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  const colors = { success: DASH.green, error: DASH.alert, info: DASH.brandNavy }
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

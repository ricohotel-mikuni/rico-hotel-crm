import { useEffect, useRef, useState } from 'react'
import { DASH } from '../lib/designSystem'
import Dai from '../ai/Dai'
import { downloadFile, fileNameFromUrl } from '../lib/storage'

// 拠点ダッシュボード(リコホテル三国「NEO TODAY」完成版)を唯一の
// テンプレートとして、全画面がこの完成版から literally 同じ部品を
// 呼び出す(承認済み「Design System v1.0 認識合わせ」の指示: 画面ごとに
// 似たマークアップを書き直すのではなく、同じコンポーネントを使い回す)。
// PropertyHub.jsx / Portal.jsx / 営業管理Home.jsxは、いずれもここに
// あるコンポーネントを直接importして組み立てる — 独自にdiv+インライン
// スタイルで「それっぽい」カードを再実装しない。

// ── 「○○ TODAY」ヒーローカードの外枠(ui-design-system.md §2.1) ──
export function TodayCard({ children, style }) {
  return (
    <div className="ds-today-card" style={style}>
      {children}
      <style>{`
        .ds-today-card {
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 24px; box-shadow: ${DASH.cardShadow};
          display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 24px;
        }
      `}</style>
    </div>
  )
}

// ── NEO+タイトルの組(ヒーローカード左上、全画面共通の型) ──
export function TodayCardTitle({ title, daiExpr = 'talk', daiSize = 78 }) {
  return (
    <div className="ds-today-head">
      <Dai expr={daiExpr} size={daiSize} />
      <div className="ds-today-title">{title}</div>
      <style>{`
        .ds-today-head { display: flex; align-items: center; gap: 14px; }
        .ds-today-title { font-size: 16px; color: ${DASH.gold}; font-weight: 700; }
      `}</style>
    </div>
  )
}

// ── 「データを分析しています」トランジション(ui-design-system.md §2.1) ──
export function AnalyzingCard({ message = 'NEOがデータを分析しています' }) {
  return (
    <div className="ds-analyzing">
      <Dai expr="normal" size={44} />
      <span>
        {message}
        <span className="ds-analyzing-dots"><span /><span /><span /></span>
      </span>
      <style>{`
        .ds-analyzing {
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 24px 26px; box-shadow: ${DASH.cardShadow};
          margin-bottom: 24px; display: flex; align-items: center; gap: 14px; color: ${DASH.textMain}; fontSize: 13px;
        }
        .ds-analyzing-dots { display: inline-flex; gap: 4px; margin-left: 8px; }
        .ds-analyzing-dots span { width: 6px; height: 6px; border-radius: 50%; background: ${DASH.gold}; display: inline-block; animation: dsDotPulse 1.1s ease-in-out infinite; }
        .ds-analyzing-dots span:nth-child(2) { animation-delay: .15s; }
        .ds-analyzing-dots span:nth-child(3) { animation-delay: .3s; }
        @keyframes dsDotPulse { 0%,80%,100% { opacity: .25; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.15); } }
        @media (prefers-reduced-motion: reduce) { .ds-analyzing-dots span { animation: none; } }
      `}</style>
    </div>
  )
}

// ── KPIグリッド(ui-design-system.md §2.2) — PC4/タブレット2/スマホ1列 ──
export function KpiGrid({ children }) {
  return (
    <div className="ds-kpi-grid">
      {children}
      <style>{`
        .ds-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        @media (max-width: 1180px) and (min-width: 760px) { .ds-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 759px) { .ds-kpi-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}

export function KpiCell({ icon, color, label, value, unit, sub, dummy, onClick }) {
  return (
    <div
      className={`ds-kpi-cell${onClick ? ' ds-kpi-cell-clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {dummy && <span className="ds-kpi-dummy">ダミー</span>}
      <i className={`ti ${icon}`} style={{ fontSize: 22, color }} />
      <div className="ds-kpi-lbl">{label}</div>
      <div className="ds-kpi-val">{value}{unit && <small>{unit}</small>}</div>
      <div className="ds-kpi-sub">{sub || ''}</div>
      <style>{`
        .ds-kpi-cell { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 14px; padding: 14px; box-shadow: ${DASH.cardShadow}; display: flex; flex-direction: column; height: 100%; position: relative; transition: border-color .15s; }
        .ds-kpi-cell-clickable:active { transform: scale(.98); }
        @media (hover: hover) and (pointer: fine) { .ds-kpi-cell-clickable:hover { border-color: ${DASH.gold}; } }
        .ds-kpi-dummy { position: absolute; top: 10px; right: 12px; font-size: 9px; color: ${DASH.textFaint}; font-weight: 700; }
        .ds-kpi-lbl { font-size: 10.5px; color: ${DASH.textFaint}; margin: 8px 0 2px; min-height: 28px; line-height: 1.35; }
        .ds-kpi-val { font-size: 18px; font-weight: 700; color: ${DASH.textMain}; }
        .ds-kpi-val small { font-size: 10px; font-weight: 500; color: ${DASH.textFaint}; margin-left: 2px; }
        .ds-kpi-sub { font-size: 10.5px; color: ${DASH.gold}; font-weight: 700; margin-top: 2px; min-height: 15px; }
      `}</style>
    </div>
  )
}

// ── 二分割/汎用パネル(ui-design-system.md §2.3) ──
export function DarkPanel({ title, action, children }) {
  return (
    <div className="ds-panel">
      <div className="ds-panel-head">
        <div className="ds-panel-title">{title}</div>
        {action && <div className="ds-more">{action}</div>}
      </div>
      {children}
      <style>{`
        .ds-panel { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 22px; box-shadow: ${DASH.cardShadow}; }
        .ds-panel-head { display: flex; align-items: center; margin-bottom: 14px; }
        .ds-panel-title { font-size: 13px; font-weight: 700; color: ${DASH.textMain}; display: flex; align-items: center; gap: 7px; }
        .ds-more { margin-left: auto; font-size: 11.5px; color: ${DASH.gold}; font-weight: 600; cursor: pointer; flex-shrink: 0; }
      `}</style>
    </div>
  )
}

// ── ページ全体の濃紺の地(ui-design-system.md §1) — SidebarShell/HubShell
// はスクリーン共有のため明るい背景のままにし、画面側でこれを1枚だけ
// 上から重ねる(承認済みPropertyHub.jsx/Portal.jsxで確立したパターン)。
export function DarkPage({ children, maxWidth = 1180 }) {
  return (
    <div style={{ background: DASH.bg, minHeight: '100%' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '24px 20px 56px' }}>
        {children}
      </div>
    </div>
  )
}

// ── ダーク版フォーム部品(ui-design-system.md、承認済み提案書
// 「Design System v1.0 最終統一提案」Item C) — src/ui/index.jsx の
// FI/FS/FT/ImageUpload/DocUploadは案件管理・契約管理・承認センター・
// 社員登録など他複数画面で共有されているため直接ダーク化せず、ここに
// 同じprops形状の別コンポーネントとして追加する。Modal(dark)を使う
// 画面だけがこちらを選んでimportする — 既存の共有フォーム部品や、
// それらを使う他画面には一切影響しない。
const darkFieldBoxStyle = {
  width: '100%', padding: '8px 10px',
  border: `1px solid ${DASH.border}`, borderRadius: 7,
  fontSize: 13, background: DASH.inputBg, color: DASH.textMain,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}

export function DarkField({ label, value, onChange, type = 'text', placeholder = '', required, readOnly }) {
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
        className="ds-dark-input"
        style={{ ...darkFieldBoxStyle, opacity: readOnly ? .6 : 1, cursor: readOnly ? 'default' : 'text' }}
      />
      <style>{`.ds-dark-input::placeholder { color: ${DASH.textFaint}; }`}</style>
    </div>
  )
}

export function DarkTextarea({ label, value, onChange, rows = 3 }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="ds-dark-input"
        style={{ ...darkFieldBoxStyle, resize: 'vertical' }}
      />
    </div>
  )
}

export function DarkSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>
        {label}
      </label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={darkFieldBoxStyle}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function DarkFieldView({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: DASH.textFaint, marginBottom: 2, fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, padding: '7px 10px', borderRadius: 7,
        background: highlight ? 'rgba(212,175,55,.1)' : DASH.surface1,
        border: `1px solid ${highlight ? DASH.gold : DASH.border}`,
        minHeight: 32, color: DASH.textSub, lineHeight: 1.4,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

export function DarkDivider() {
  return <div style={{ height: 1, background: DASH.border, margin: '10px 0' }} />
}

const UPLOAD_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp']
const UPLOAD_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp'
const UPLOAD_DOC_EXT = ['pdf', 'doc', 'docx', 'xlsx']
const UPLOAD_DOC_ACCEPT = '.pdf,.doc,.docx,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const extOfUpload = (name) => (name.split('.').pop() || '').toLowerCase()

export function DarkImageUpload({ label, icon, value, file, onFile }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState(null)

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
    if (!UPLOAD_IMAGE_EXT.includes(extOfUpload(f.name))) { setErr('対応していない形式です(JPG / PNG / WEBP)'); return }
    setErr(null)
    onFile(f)
  }

  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1.5px dashed ${dragOver ? DASH.gold : DASH.border}`,
          borderRadius: 7, padding: 8, cursor: 'pointer',
          background: dragOver ? 'rgba(212,175,55,.06)' : DASH.inputBg,
          transition: 'border-color .15s, background .15s',
        }}
      >
        {displayUrl
          ? <img src={displayUrl} alt={label} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: `1px solid ${DASH.border}` }} />
          : <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(212,175,55,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${icon || 'ti-photo'}`} style={{ fontSize: 20, color: DASH.gold }} />
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: DASH.textMain, fontWeight: 600 }}>
            {file ? '選択済み(保存で反映)' : displayUrl ? '画像を変更' : 'ファイルを選択'}
          </div>
          <div style={{ fontSize: 10, color: DASH.textFaint, marginTop: 2 }}>クリックまたはドラッグ＆ドロップ(JPG/PNG/WEBP)</div>
        </div>
      </div>
      {err && <div style={{ fontSize: 11, color: DASH.alert, marginTop: 4 }}>{err}</div>}
      <input ref={inputRef} type="file" accept={UPLOAD_IMAGE_ACCEPT} onChange={e => { handleFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
    </div>
  )
}

export function DarkDocUpload({ label, icon, value, file, onFile }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState(null)

  const fileName = file ? file.name : value ? fileNameFromUrl(value) : null

  const handleFiles = (files) => {
    const f = files?.[0]
    if (!f) return
    if (!UPLOAD_DOC_EXT.includes(extOfUpload(f.name))) { setErr('対応していない形式です(PDF / DOC / DOCX / XLSX)'); return }
    setErr(null)
    onFile(f)
  }

  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1.5px dashed ${dragOver ? DASH.gold : DASH.border}`,
          borderRadius: 7, padding: 8, cursor: 'pointer',
          background: dragOver ? 'rgba(212,175,55,.06)' : DASH.inputBg,
          transition: 'border-color .15s, background .15s',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(212,175,55,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icon || 'ti-file'}`} style={{ fontSize: 20, color: DASH.gold }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: DASH.textMain, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName || 'ファイルを選択'}
          </div>
          <div style={{ fontSize: 10, color: DASH.textFaint, marginTop: 2 }}>クリックまたはドラッグ＆ドロップ(PDF/DOC/DOCX/XLSX)</div>
        </div>
        {value && !file && (
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <a href={value} target="_blank" rel="noopener noreferrer" title="開く" style={{ width: 28, height: 28, borderRadius: 6, background: DASH.card, border: `1px solid ${DASH.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DASH.gold }}>
              <i className="ti ti-external-link" style={{ fontSize: 13 }} />
            </a>
            <button type="button" onClick={() => downloadFile(value, fileName)} title="ダウンロード" style={{ width: 28, height: 28, borderRadius: 6, background: DASH.card, border: `1px solid ${DASH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DASH.gold }}>
              <i className="ti ti-download" style={{ fontSize: 13 }} />
            </button>
          </div>
        )}
      </div>
      {err && <div style={{ fontSize: 11, color: DASH.alert, marginTop: 4 }}>{err}</div>}
      <input ref={inputRef} type="file" accept={UPLOAD_DOC_ACCEPT} onChange={e => { handleFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
    </div>
  )
}

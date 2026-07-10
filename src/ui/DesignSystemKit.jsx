import { DASH } from '../lib/designSystem'
import Dai from '../ai/Dai'

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
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 24px;
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
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 24px 26px;
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
        .ds-kpi-cell { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; height: 100%; position: relative; transition: border-color .15s; }
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
        .ds-panel { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 22px; }
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

// Compact icon+label launcher grid — distinct from ModuleGrid (the
// larger card-with-description tile used by the company Portal).
// PropertyHub uses this one for its bottom "クイックメニュー" row
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.6〜Ver.9」): denser,
// icon-first, colored per module.color. Styled dark to match Design
// System v1.0 (src/lib/designSystem.js) — the single token source, so
// this no longer keeps its own separately-hardcoded copy of the palette.
import { DASH } from '../lib/designSystem'

export default function ModuleLauncher({ modules, unreadCounts = {}, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 12 }}>
      {modules.map(m => {
        const soon = m.status !== 'active'
        const count = m.notifiable ? (unreadCounts[m.id] || 0) : 0
        const color = m.color || DASH.textSub
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m)}
            className="launcher-tile"
          >
            {count > 0 && <span className="launcher-tile-badge">{count > 99 ? '99+' : count}</span>}
            <i className={`ti ${m.icon}`} style={{ fontSize: 22, color, marginBottom: 6 }} />
            <span>{m.label}</span>
            {soon && <span className="launcher-tile-soon">準備中</span>}
          </button>
        )
      })}

      <style>{`
        .launcher-tile {
          position: relative; display: flex; flex-direction: column; align-items: center;
          background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 14px;
          padding: 16px 8px 12px; cursor: pointer; font-family: inherit;
          font-size: 11px; color: ${DASH.textSub}; transition: background .15s, border-color .15s;
        }
        .launcher-tile:active { transform: scale(.96); }
        @media (hover: hover) and (pointer: fine) {
          .launcher-tile:hover { background: rgba(255,255,255,.06); border-color: #D4AF37; }
        }
        .launcher-tile-soon {
          font-size: 8.5px; color: ${DASH.textFaint}; margin-top: 3px;
        }
        .launcher-tile-badge {
          position: absolute; top: -6px; right: -6px;
          min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
          background: #E53935; color: #fff; font-size: 9.5px; font-weight: 700;
          line-height: 17px; text-align: center; border: 2px solid ${DASH.card};
        }
      `}</style>
    </div>
  )
}

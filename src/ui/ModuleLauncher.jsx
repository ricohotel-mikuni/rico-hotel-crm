import { C } from '../lib/constants'

// Compact icon+label launcher grid — distinct from ModuleGrid (the
// larger card-with-description tile used by the company Portal).
// PropertyHub uses this one for its bottom "業務メニュー" row
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.6」⑤⑧): denser,
// icon-first, colored per module.color so the row reads as a quick
// launcher rather than another content section competing with NEO
// TODAY for attention.
export default function ModuleLauncher({ modules, unreadCounts = {}, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
      {modules.map(m => {
        const soon = m.status !== 'active'
        const count = m.notifiable ? (unreadCounts[m.id] || 0) : 0
        const color = m.color || C.navy
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
          background: #fff; border: 1px solid #ECEFF1; border-radius: 12px;
          padding: 14px 8px 12px; cursor: pointer; font-family: inherit;
          font-size: 11px; color: #37474F; transition: transform .15s, box-shadow .15s, border-color .15s;
        }
        .launcher-tile:active { transform: scale(.96); }
        @media (hover: hover) and (pointer: fine) {
          .launcher-tile:hover { box-shadow: 0 6px 16px rgba(31,56,100,.12); border-color: ${C.gold}; }
        }
        .launcher-tile-soon {
          font-size: 8.5px; color: #B0BEC5; margin-top: 3px;
        }
        .launcher-tile-badge {
          position: absolute; top: -6px; right: -6px;
          min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
          background: #E53935; color: #fff; font-size: 9.5px; font-weight: 700;
          line-height: 17px; text-align: center; border: 2px solid #fff;
        }
      `}</style>
    </div>
  )
}

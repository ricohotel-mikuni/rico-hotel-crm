import { DASH } from '../lib/designSystem'

// Shared tile grid — now only used by AdminCenter.jsx (Portal.jsx and
// PropertyHub.jsx built their own dark-tile markup during the Design
// System v1.0 rollout). Design System v1.0(承認済み提案書「Design
// System v1.0 仕様変更」)。
function ModuleTile({ module, count, onClick }) {
  const soon = module.status !== 'active'

  return (
    <div className="module-tile" onClick={onClick} style={{ borderColor: soon ? DASH.border : 'rgba(212,175,55,.4)' }}>
      {soon && <span className="module-tile-soon">準備中</span>}

      <div className="module-tile-icon-wrap">
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: soon ? DASH.surface2 : 'rgba(212,175,55,.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${module.icon}`} style={{ fontSize: 21, color: soon ? DASH.textFaint : DASH.gold }} />
        </div>
        {count > 0 && (
          <span className="module-tile-badge" aria-label={`未読 ${count} 件`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: DASH.textMain, marginBottom: 4 }}>
          {module.label}
        </div>
        <div style={{ fontSize: 12, color: DASH.textFaint, lineHeight: 1.5 }}>
          {module.desc}
        </div>
      </div>
    </div>
  )
}

export default function ModuleGrid({ modules, unreadCounts = {}, onSelect }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 16,
      }}
    >
      {modules.map(m => (
        <ModuleTile
          key={m.id}
          module={m}
          count={m.notifiable ? (unreadCounts[m.id] || 0) : 0}
          onClick={() => onSelect(m)}
        />
      ))}

      <style>{`
        .module-tile {
          background: ${DASH.card}; border-radius: 14px; padding: 22px 20px;
          border: 1px solid ${DASH.border}; box-shadow: ${DASH.cardShadow};
          cursor: pointer; position: relative;
          display: flex; flex-direction: column; gap: 14px;
          transition: transform .18s ease, border-color .18s ease;
        }
        .module-tile:active { transform: scale(.98); }
        @media (hover: hover) and (pointer: fine) {
          .module-tile:hover {
            transform: translateY(-3px);
            border-color: ${DASH.gold};
          }
        }
        .module-tile-soon {
          position: absolute; top: 14px; right: 14px;
          font-size: 10px; font-weight: 700; letter-spacing: .5px;
          color: ${DASH.textFaint}; background: ${DASH.surface2};
          padding: 3px 9px; border-radius: 20px;
        }
        .module-tile-icon-wrap { position: relative; width: 46px; }
        .module-tile-badge {
          position: absolute; top: -7px; right: -9px;
          min-width: 20px; height: 20px; padding: 0 5px;
          border-radius: 999px; background: ${DASH.alert}; color: #fff;
          font-size: 11px; font-weight: 700; line-height: 20px;
          text-align: center; border: 2px solid ${DASH.card};
          box-shadow: 0 1px 3px rgba(0,0,0,.25);
        }
      `}</style>
    </div>
  )
}

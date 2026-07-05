import { C } from '../lib/constants'

// Shared tile grid used by every "hub"-shaped screen (the company
// Portal and each property's PropertyHub) so the card/badge markup
// and CSS live in exactly one place.
function ModuleTile({ module, count, onClick }) {
  const soon = module.status !== 'active'

  return (
    <div className="module-tile" onClick={onClick} style={{ borderColor: soon ? '#ECEFF1' : 'rgba(201,168,76,.4)' }}>
      {soon && <span className="module-tile-soon">準備中</span>}

      <div className="module-tile-icon-wrap">
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: soon ? '#ECEFF1' : `${C.gold}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${module.icon}`} style={{ fontSize: 21, color: soon ? '#90A4AE' : '#B4933D' }} />
        </div>
        {count > 0 && (
          <span className="module-tile-badge" aria-label={`未読 ${count} 件`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
          {module.label}
        </div>
        <div style={{ fontSize: 12, color: '#90A4AE', lineHeight: 1.5 }}>
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
          background: #fff; border-radius: 14px; padding: 22px 20px;
          border: 1px solid #ECEFF1;
          box-shadow: 0 2px 10px rgba(0,0,0,.05);
          cursor: pointer; position: relative;
          display: flex; flex-direction: column; gap: 14px;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .module-tile:active { transform: scale(.98); }
        @media (hover: hover) and (pointer: fine) {
          .module-tile:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 28px rgba(31,56,100,.14);
            border-color: ${C.gold};
          }
        }
        .module-tile-soon {
          position: absolute; top: 14px; right: 14px;
          font-size: 10px; font-weight: 700; letter-spacing: .5px;
          color: #9E9E9E; background: #F5F5F5;
          padding: 3px 9px; border-radius: 20px;
        }
        .module-tile-icon-wrap { position: relative; width: 46px; }
        .module-tile-badge {
          position: absolute; top: -7px; right: -9px;
          min-width: 20px; height: 20px; padding: 0 5px;
          border-radius: 999px; background: #E53935; color: #fff;
          font-size: 11px; font-weight: 700; line-height: 20px;
          text-align: center; border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.25);
        }
      `}</style>
    </div>
  )
}

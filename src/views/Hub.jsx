import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUnreadCounts } from '../hooks/useNotifications'
import HubShell from '../layout/HubShell'
import { MODULES } from '../modules/registry'
import { C, today } from '../lib/constants'

function ModuleTile({ module, count, onClick }) {
  const soon = module.status !== 'active'

  return (
    <div className="hub-tile" onClick={onClick} style={{ borderColor: soon ? '#ECEFF1' : 'rgba(201,168,76,.4)' }}>
      {soon && <span className="hub-tile-soon">準備中</span>}

      <div className="hub-tile-icon-wrap">
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: soon ? '#ECEFF1' : `${C.gold}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${module.icon}`} style={{ fontSize: 21, color: soon ? '#90A4AE' : '#B4933D' }} />
        </div>
        {count > 0 && (
          <span className="hub-tile-badge" aria-label={`未読 ${count} 件`}>
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

export default function Hub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const unread = useUnreadCounts()

  return (
    <HubShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
            WELCOME
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
            こんにちは、{profile?.full_name || '—'} さん
          </h1>
          <div style={{ fontSize: 13, color: '#90A4AE' }}>
            ご利用になる管理メニューを選択してください — {today()}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 16,
          }}
        >
          {MODULES.map(m => (
            <ModuleTile
              key={m.id}
              module={m}
              count={m.notifiable ? (unread[m.id] || 0) : 0}
              onClick={() => navigate(m.path)}
            />
          ))}
        </div>
      </div>

      <style>{`
        .hub-tile {
          background: #fff; border-radius: 14px; padding: 22px 20px;
          border: 1px solid #ECEFF1;
          box-shadow: 0 2px 10px rgba(0,0,0,.05);
          cursor: pointer; position: relative;
          display: flex; flex-direction: column; gap: 14px;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .hub-tile:active { transform: scale(.98); }
        @media (hover: hover) and (pointer: fine) {
          .hub-tile:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 28px rgba(31,56,100,.14);
            border-color: ${C.gold};
          }
        }
        .hub-tile-soon {
          position: absolute; top: 14px; right: 14px;
          font-size: 10px; font-weight: 700; letter-spacing: .5px;
          color: #9E9E9E; background: #F5F5F5;
          padding: 3px 9px; border-radius: 20px;
        }
        .hub-tile-icon-wrap { position: relative; width: 46px; }
        .hub-tile-badge {
          position: absolute; top: -7px; right: -9px;
          min-width: 20px; height: 20px; padding: 0 5px;
          border-radius: 999px; background: #E53935; color: #fff;
          font-size: 11px; font-weight: 700; line-height: 20px;
          text-align: center; border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.25);
        }
      `}</style>
    </HubShell>
  )
}

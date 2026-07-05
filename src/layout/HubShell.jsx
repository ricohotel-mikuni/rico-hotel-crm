import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { C, ROLES } from '../lib/constants'

export default function HubShell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, role, signOut } = useAuth()
  const isHome = location.pathname === '/'

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FA', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 100%)`,
          padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 14px rgba(0,0,0,.18)',
        }}
      >
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 9, background: 'rgba(201,168,76,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <img src="/logo.png" alt="RICO HOTEL MIKUNI" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 1.5, lineHeight: 1.25 }}>
              RICO HOTEL MIKUNI
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', letterSpacing: 1 }}>
              統合管理システム
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isHome && (
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)',
                color: 'rgba(255,255,255,.85)', borderRadius: 7, padding: '7px 12px',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.16)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
              ホームへ
            </button>
          )}

          <div style={{ textAlign: 'right', display: 'none' }} className="hub-user-info">
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{profile?.full_name || '—'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>{ROLES[role]?.label || '—'}</div>
          </div>

          <button
            onClick={signOut}
            title="ログアウト"
            style={{
              width: 32, height: 32, borderRadius: 7, flexShrink: 0,
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)',
              color: 'rgba(255,255,255,.8)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
          >
            <i className="ti ti-logout" style={{ fontSize: 14 }} />
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <style>{`
        @media (min-width: 480px) {
          .hub-user-info { display: block !important; }
        }
      `}</style>
    </div>
  )
}

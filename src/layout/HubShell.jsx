import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBrand } from '../branding/BrandContext'
import { HomeButton } from '../ui'
import { C, ROLES } from '../lib/constants'

export default function HubShell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, role, signOut } = useAuth()
  const brand = useBrand()
  const isHome = location.pathname === brand.homePath

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FA', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 100%)`,
          padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 14px rgba(0,0,0,.18)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
        }}
      >
        <div
          onClick={() => navigate(brand.homePath)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 9, background: 'rgba(201,168,76,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <img src={brand.logo} alt={brand.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 1.5, lineHeight: 1.25 }}>
              {brand.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', letterSpacing: 1 }}>
              {brand.subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isHome && <HomeButton compact />}

          <div style={{ textAlign: 'right', display: 'none' }} className="hub-user-info">
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{profile?.full_name || '—'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>{ROLES[role]?.label || '—'}</div>
          </div>

          <button onClick={signOut} title="ログアウト" className="hub-logout-btn">
            <i className="ti ti-logout" style={{ fontSize: 14 }} />
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <style>{`
        @media (min-width: 480px) {
          .hub-user-info { display: block !important; }
        }
        .hub-logout-btn {
          width: 40px; height: 40px; border-radius: 7px; flex-shrink: 0;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
          color: rgba(255,255,255,.8); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .hub-logout-btn:active { background: rgba(255,255,255,.18); }
        @media (hover: hover) and (pointer: fine) {
          .hub-logout-btn:hover { background: rgba(255,255,255,.16); }
        }
      `}</style>
    </div>
  )
}

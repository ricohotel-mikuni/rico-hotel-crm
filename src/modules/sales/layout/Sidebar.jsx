import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { C } from '../../../lib/constants'

const NAV_ITEMS = [
  { path: '/sales',             icon: 'ti-home',           label: 'ホーム' },
  { path: '/sales/clients',     icon: 'ti-building-store',  label: '営業先管理' },
  { path: '/sales/reports',     icon: 'ti-file-text',       label: '営業日報' },
  { path: '/sales/cases',       icon: 'ti-clipboard-list',  label: '案件管理' },
  { path: '/sales/commissions', icon: 'ti-currency-yen',    label: '成果報酬' },
  { path: '/sales/dashboard',   icon: 'ti-chart-bar',       label: 'ダッシュボード' },
  { path: '/sales/contracts',   icon: 'ti-file-check',      label: '契約管理' },
  { path: '/sales/settings',    icon: 'ti-settings',        label: '設定' },
]

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, role, signOut } = useAuth()

  const goto = (path) => {
    navigate(path)
    onClose?.()
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,.4)',
            display: 'block',
          }}
          className="sidebar-overlay"
        />
      )}

      <aside
        style={{
          width: 200, background: C.navyDark,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflowY: 'auto',
          position: 'fixed', top: 0, left: open ? 0 : -200,
          height: '100%', zIndex: 200,
          transition: 'left .25s ease',
          boxShadow: open ? '4px 0 20px rgba(0,0,0,.3)' : 'none',
        }}
        className="sidebar-desktop"
      >
        {/* Branding */}
        <div
          onClick={() => goto('/')}
          title="統合ホームへ戻る"
          style={{ padding: '22px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.08)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'rgba(201,168,76,.2)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/logo.png" alt="RICO HOTEL MIKUNI" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 1.5 }}>RICO HOTEL</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>MIKUNI</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 8, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-arrow-back-up" style={{ fontSize: 11 }} />
            統合ホームへ戻る
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: 6 }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => goto(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 16px',
                  border: 'none', borderLeft: active ? `3px solid ${C.gold}` : '3px solid transparent',
                  background: active ? 'rgba(201,168,76,.15)' : 'transparent',
                  color: active ? C.gold : 'rgba(255,255,255,.68)',
                  cursor: 'pointer', fontSize: 13,
                  fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(201,168,76,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="ti ti-user" style={{ fontSize: 14, color: C.gold }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || '—'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                {role === 'admin' ? '管理者' : role === 'manager' ? 'マネージャー' : role === 'sales' ? '営業担当' : '閲覧のみ'}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              width: '100%', padding: '7px', borderRadius: 6,
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.6)', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
          >
            <i className="ti ti-logout" style={{ fontSize: 13 }} />
            ログアウト
          </button>
        </div>
      </aside>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-overlay { display: none !important; }
          .sidebar-desktop {
            position: static !important;
            left: 0 !important;
            height: 100vh !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}

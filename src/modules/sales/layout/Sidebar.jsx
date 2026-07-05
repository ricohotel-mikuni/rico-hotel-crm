import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useBrand } from '../../../branding/BrandContext'
import { HomeButton } from '../../../ui'
import { C } from '../../../lib/constants'

// Segments relative to `${brand.homePath}/sales` — composed at render
// time so this sidebar works unchanged if a future property reuses the
// sales module under a different homePath.
const NAV_ITEMS = [
  { seg: '',             icon: 'ti-home',           label: 'ホーム' },
  { seg: '/clients',     icon: 'ti-building-store',  label: '営業先管理' },
  { seg: '/reports',     icon: 'ti-file-text',       label: '営業日報' },
  { seg: '/cases',       icon: 'ti-clipboard-list',  label: '案件管理' },
  { seg: '/commissions', icon: 'ti-currency-yen',    label: '成果報酬' },
  { seg: '/dashboard',   icon: 'ti-chart-bar',       label: 'ダッシュボード' },
  { seg: '/contracts',   icon: 'ti-file-check',      label: '契約管理' },
  { seg: '/settings',    icon: 'ti-settings',        label: '設定' },
]

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, role, signOut } = useAuth()
  const brand = useBrand()
  const salesBase = `${brand.homePath}/sales`

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
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className="sidebar-desktop"
      >
        {/* Branding */}
        <div style={{ padding: '22px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'rgba(201,168,76,.2)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={brand.logo} alt={brand.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
            <div>
              {brand.nameLines ? (
                brand.nameLines.map((line, i) => (
                  <div key={i} style={{ fontSize: i === 0 ? 11 : 10, color: i === 0 ? C.gold : 'rgba(255,255,255,.5)', fontWeight: i === 0 ? 700 : 400, letterSpacing: 1.5 }}>
                    {line}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 1 }}>{brand.name}</div>
              )}
            </div>
          </div>
        </div>

        {/* Back to integrated Hub */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <HomeButton full compact />
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: 6 }}>
          {NAV_ITEMS.map(item => {
            const path = `${salesBase}${item.seg}`
            const active = location.pathname === path
            return (
              <button
                key={item.seg}
                onClick={() => goto(path)}
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
          <button onClick={signOut} className="sidebar-logout-btn">
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
        .sidebar-logout-btn {
          width: 100%; padding: 7px; border-radius: 6px;
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
          color: rgba(255,255,255,.6); cursor: pointer;
          font-size: 12px; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: background .15s;
        }
        .sidebar-logout-btn:active { background: rgba(255,255,255,.16); }
        @media (hover: hover) and (pointer: fine) {
          .sidebar-logout-btn:hover { background: rgba(255,255,255,.12); }
        }
      `}</style>
    </>
  )
}

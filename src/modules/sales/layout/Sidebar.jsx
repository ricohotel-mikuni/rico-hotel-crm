import { useNavigate, useLocation } from 'react-router-dom'
import { useBrand } from '../../../branding/BrandContext'
import { C } from '../../../lib/constants'

// Segments relative to `${brand.homePath}/sales` — composed at render
// time so this sidebar works unchanged if a future property reuses the
// sales module under a different homePath. The first entry ("ホーム")
// is this property's own hub — branding, the back-to-company button,
// and the user/logout controls all live in the shared Header now
// (src/layout/Header.jsx), so this component is nav-only.
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
          width: C.sidebarWidth, background: C.navyDark,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflowY: 'auto',
          position: 'fixed', top: 0, left: open ? 0 : -C.sidebarWidth,
          height: '100%', zIndex: 200,
          transition: 'left .25s ease',
          boxShadow: open ? '4px 0 20px rgba(0,0,0,.3)' : 'none',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className="sidebar-desktop"
      >
        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: 10 }}>
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

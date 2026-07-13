import { useNavigate } from 'react-router-dom'
import { useBrand } from '../branding/BrandContext'
import Breadcrumb from './Breadcrumb'
import ProfileMenu from '../branding/ProfileMenu'
import NotificationBell from '../notifications/NotificationBell'
import { C } from '../lib/constants'
import { DASH } from '../lib/designSystem'

// The ONE header used everywhere — company Portal, ComingSoon,
// PropertyHub, 管理センター, the sales module, and every future screen.
// Navigation is entirely breadcrumb-driven (see Breadcrumb.jsx) — no
// per-screen or per-brand back-button variants.
//
// Layout: [menu?] [logo — fixed] [breadcrumb — flexes/truncates]
// [NotificationBell] [ProfileMenu — right group never shrinks], so on
// any viewport width the middle gives way before anything overlaps.
//
// `hideLogo` — SidebarShell-based screens (拠点ホーム・管理センター)
// now show a large brand logo at the top of the sidebar itself
// (NavSidebar.jsx), so the small header logo here would be a duplicate
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.5」⑤). Screens without
// a sidebar (会社ホーム等) keep the header logo as their only one.
export default function Header({ onMenuClick, hideLogo }) {
  const navigate = useNavigate()
  const brand = useBrand()

  return (
    <header className="app-header">
      {onMenuClick && (
        <button onClick={onMenuClick} className="app-header-menu-btn" title="メニュー">
          <i className="ti ti-menu-2" />
        </button>
      )}

      {!hideLogo && (
        <div className="app-header-logo" onClick={() => navigate(brand.homePath)} title={brand.name}>
          <img src={brand.logo} alt={brand.name} />
        </div>
      )}

      <Breadcrumb />

      <div className="app-header-actions">
        <NotificationBell compact />
        <ProfileMenu compact />
      </div>

      <style>{`
        .app-header {
          display: flex; align-items: center; gap: 10px;
          min-height: ${C.headerHeight}px;
          padding: 6px 14px;
          padding-top: max(6px, env(safe-area-inset-top));
          padding-left: max(14px, env(safe-area-inset-left));
          padding-right: max(14px, env(safe-area-inset-right));
          background: linear-gradient(135deg, ${DASH.brandNavyDark} 0%, ${DASH.brandNavy} 100%);
          border-bottom: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 2px 14px rgba(0,0,0,.18);
          position: sticky; top: 0; z-index: 100;
        }
        .app-header-menu-btn {
          background: none; border: none; color: #fff; cursor: pointer;
          padding: 4px; font-size: 21px; line-height: 1; flex-shrink: 0;
          min-width: 40px; min-height: 40px;
          display: flex; align-items: center; justify-content: center;
        }
        .app-header-logo {
          height: 34px; max-width: 132px; flex-shrink: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .app-header-logo img { height: 100%; width: auto; max-width: 100%; object-fit: contain; }
        .app-header-actions {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        /* The property/admin sidebars become permanently visible at
           this width — the menu toggle would do nothing there, so hide it. */
        @media (min-width: ${C.breakpoint.md}px) {
          .app-header-menu-btn { display: none; }
        }
      `}</style>
    </header>
  )
}

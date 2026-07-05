import { useNavigate } from 'react-router-dom'
import { useBrand } from '../branding/BrandContext'
import BackButton from '../branding/BackButton'
import ProfileMenu from '../branding/ProfileMenu'
import NotificationBell from '../notifications/NotificationBell'
import { C } from '../lib/constants'

// The ONE header used everywhere — company Portal, ComingSoon,
// PropertyHub, the sales module, and every future screen. Only the
// active brand (logo/name, via useBrand()) and whether a sidebar
// toggle is needed (`onMenuClick`, passed only by the sales module's
// AppShell) change; the structure, sizing and spacing are fixed via
// the C.* design tokens (src/lib/constants.js) so nothing drifts
// out of sync again like the old separate HubShell header / AppShell
// topbar did.
//
// Layout: [menu?] [logo+brand — flexes/truncates] [BackButton]
// [NotificationBell] [ProfileMenu — right group never shrinks], so
// on any viewport width the middle gives way before anything overlaps.
export default function Header({ onMenuClick }) {
  const navigate = useNavigate()
  const brand = useBrand()

  return (
    <header className="app-header">
      {onMenuClick && (
        <button onClick={onMenuClick} className="app-header-menu-btn" title="メニュー">
          <i className="ti ti-menu-2" />
        </button>
      )}

      <div className="app-header-brand" onClick={() => navigate(brand.homePath)}>
        <div className="app-header-logo">
          <img src={brand.logo} alt={brand.name} />
        </div>
        <span className="app-header-brand-text">{brand.name}</span>
      </div>

      <div className="app-header-actions">
        <BackButton compact />
        <NotificationBell compact />
        <ProfileMenu compact />
      </div>

      <style>{`
        .app-header {
          display: flex; align-items: center; gap: 8px;
          min-height: ${C.headerHeight}px;
          padding: 6px 14px;
          padding-top: max(6px, env(safe-area-inset-top));
          padding-left: max(14px, env(safe-area-inset-left));
          padding-right: max(14px, env(safe-area-inset-right));
          background: linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 100%);
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
        .app-header-brand {
          display: flex; align-items: center; gap: 9px; cursor: pointer;
          flex: 1; min-width: 0;
        }
        .app-header-logo {
          width: 36px; height: 36px; border-radius: ${C.radius.md}px;
          background: rgba(201,168,76,.18); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .app-header-logo img { width: 26px; height: 26px; object-fit: contain; }
        .app-header-brand-text {
          font-size: 13px; font-weight: 700; color: ${C.gold};
          letter-spacing: .5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .app-header-actions {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        @media (max-width: 400px) {
          .app-header-brand-text { display: none; }
        }
        /* The sales module's Sidebar becomes permanently visible at
           this width (see Sidebar.jsx's .sidebar-desktop rule) — the
           menu toggle would do nothing there, so hide it. */
        @media (min-width: ${C.breakpoint.md}px) {
          .app-header-menu-btn { display: none; }
        }
      `}</style>
    </header>
  )
}

import { useState } from 'react'
import Sidebar from './Sidebar'
import { useBrand } from '../../../branding/BrandContext'
import CompanyHomeButton from '../../../branding/CompanyHomeButton'
import { HomeButton } from '../../../ui'
import { C } from '../../../lib/constants'

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const brand = useBrand()

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Always-visible topbar: full (menu+brand+HomeButton) on mobile where
            the sidebar is an off-canvas drawer; slimmed down to just the
            CompanyHomeButton on desktop, where the sidebar already shows
            branding + HomeButton and is permanently visible. */}
        <header className="app-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            className="app-topbar-menu-btn"
            style={{
              background: 'none', border: 'none', color: '#fff',
              cursor: 'pointer', padding: 4, fontSize: 22, lineHeight: 1,
              flexShrink: 0, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-menu-2" />
          </button>
          <div className="app-topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, background: 'rgba(201,168,76,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src={brand.logo} alt={brand.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600, color: C.gold,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {brand.name}
            </span>
          </div>
          <div className="app-topbar-home-btn">
            <HomeButton compact />
          </div>
          <CompanyHomeButton compact />
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
          {children}
        </main>
      </div>

      <style>{`
        .app-topbar {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 10px 12px;
          padding-top: max(10px, env(safe-area-inset-top));
          padding-left: max(12px, env(safe-area-inset-left));
          padding-right: max(12px, env(safe-area-inset-right));
          background: ${C.navyDark};
          border-bottom: 1px solid rgba(255,255,255,.08);
          position: sticky; top: 0; z-index: 100;
        }
        @media (min-width: 768px) {
          .app-topbar { justify-content: flex-end; padding: 8px 20px; }
          .app-topbar-menu-btn, .app-topbar-brand, .app-topbar-home-btn { display: none; }
        }
      `}</style>
    </div>
  )
}

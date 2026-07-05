import { useState } from 'react'
import Sidebar from './Sidebar'
import { HomeButton } from '../../../ui'
import { C } from '../../../lib/constants'

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <header className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none', color: '#fff',
              cursor: 'pointer', padding: 4, fontSize: 22, lineHeight: 1,
              flexShrink: 0, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-menu-2" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6, background: 'rgba(201,168,76,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/logo.png" alt="RICO HOTEL MIKUNI" style={{ width: 17, height: 17, objectFit: 'contain' }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600, color: C.gold,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              RICO HOTEL MIKUNI
            </span>
          </div>
          <HomeButton compact />
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
          {children}
        </main>
      </div>

      <style>{`
        .mobile-topbar {
          display: none; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 10px 12px;
          padding-top: max(10px, env(safe-area-inset-top));
          padding-left: max(12px, env(safe-area-inset-left));
          padding-right: max(12px, env(safe-area-inset-right));
          background: ${C.navyDark};
          border-bottom: 1px solid rgba(255,255,255,.08);
          position: sticky; top: 0; z-index: 100;
        }
        @media (max-width: 767px) {
          .mobile-topbar { display: flex; }
        }
        @media (min-width: 768px) {
          .mobile-topbar { display: none; }
        }
      `}</style>
    </div>
  )
}

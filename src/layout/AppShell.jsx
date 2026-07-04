import { useState } from 'react'
import Sidebar from './Sidebar'
import { C } from '../lib/constants'

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <header
          className="mobile-topbar"
          style={{
            display: 'none', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: C.navyDark,
            borderBottom: '1px solid rgba(255,255,255,.08)',
            position: 'sticky', top: 0, zIndex: 100,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none', color: '#fff',
              cursor: 'pointer', padding: 4, fontSize: 20, lineHeight: 1,
            }}
          >
            <i className="ti ti-menu-2" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🏨</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>RICO HOTEL MIKUNI</span>
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .mobile-topbar { display: flex !important; }
        }
        @media (min-width: 768px) {
          .mobile-topbar { display: none !important; }
        }
      `}</style>
    </div>
  )
}

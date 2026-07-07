import { useState } from 'react'
import NavSidebar from './NavSidebar'
import Header from './Header'

// Persistent-sidebar shell shared by every section that needs a
// standing menu instead of a tile grid — the property hub (営業管理 +
// 運営 + その他, see propertyNav.js) and 管理センター (admin/registry.js).
// Replaces the old sales-only AppShell/Sidebar pair; same visual shell,
// generalized so any future module group can reuse it by passing its
// own `groups`.
export default function SidebarShell({ groups, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <NavSidebar groups={groups} open={open} onClose={() => setOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header onMenuClick={() => setOpen(true)} />
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

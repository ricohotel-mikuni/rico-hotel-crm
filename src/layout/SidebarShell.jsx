import { useState } from 'react'
import NavSidebar from './NavSidebar'
import Header from './Header'

// Persistent-sidebar shell shared by every section that needs a
// standing menu instead of a tile grid — the property hub (ホテル業務 +
// 営業 + 管理 + システム, see propertyNav.js) and 管理センター
// (admin/registry.js). Replaces the old sales-only AppShell/Sidebar
// pair; same visual shell, generalized so any future module group can
// reuse it by passing its own `groups`.
//
// The outer container is height-locked to the viewport (not just
// minHeight) so `main`'s own overflowY:auto is the ONLY scroll region —
// previously minHeight let this container grow past the viewport
// whenever page content was tall, which dragged the sidebar along with
// page-level scroll instead of keeping it fixed(サイドバーが画面下で
// 切れる不具合の根本原因、承認済み提案書「拠点ダッシュボードUI改善
// Ver.5」⑦で修正)。NavSidebar自身がリコホテル/大栄商事のロゴを表示
// するため、ヘッダー側の重複ロゴはここで非表示にする。
export default function SidebarShell({ groups, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <NavSidebar groups={groups} open={open} onClose={() => setOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header onMenuClick={() => setOpen(true)} hideLogo />
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

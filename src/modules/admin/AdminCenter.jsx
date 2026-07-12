import { useNavigate } from 'react-router-dom'
import ModuleGrid from '../../ui/ModuleGrid'
import { ADMIN_MODULES } from './registry'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

// 管理センターのホーム画面 — rendered inside AdminApp's SidebarShell.
// Design System v1.0(承認済み提案書「Design System v1.0 仕様変更」)。
// The brief summary line below stands in for what would otherwise be
// a separate "ダッシュボード" tile (deliberately dropped from the
// company Portal — see portal/registry.js's comment).
export default function AdminCenter() {
  const navigate = useNavigate()

  return (
    <DarkPage>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
          管理者専用
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>
          管理センター
        </h1>
        <div style={{ fontSize: 13, color: DASH.textFaint }}>
          会社全体の経営・システム管理機能をここに集約しています。一般スタッフの画面には表示されません。
        </div>
      </div>

      <ModuleGrid modules={ADMIN_MODULES} unreadCounts={{}} onSelect={m => navigate(`/admin${m.path}`)} />
    </DarkPage>
  )
}

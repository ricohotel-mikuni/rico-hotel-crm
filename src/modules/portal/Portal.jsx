import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '../../permissions/PermissionContext'
import { useUnreadCounts, useMyNotifications } from '../../hooks/useNotifications'
import { useApprovalRequests } from '../../hooks/useData'
import HubShell from '../../layout/HubShell'
import ModuleGrid from '../../ui/ModuleGrid'
import StatCard from '../../ui/StatCard'
import WelcomeHero from './WelcomeHero'
import { COMPANY_MODULES } from './registry'
import { C, today } from '../../lib/constants'

// Not part of COMPANY_MODULES itself since it's conditionally shown —
// keeping it out of the plain array means there's no risk of it
// leaking to a non-admin by a future refactor that stops filtering.
const ADMIN_CENTER_TILE = {
  id: 'admin-center', label: '管理センター', icon: 'ti-shield', path: '/admin',
  status: 'active', notifiable: false, desc: '経営・システム管理機能(管理者専用)',
}

// The company Portal — the very top of the system (`/`), always
// rendered under the daiei brand. COMPANY_MODULES paths are already
// complete top-level paths, so navigation is a direct `navigate(m.path)`
// (unlike PropertyHub, whose registry entries are relative to a
// property's own base path).
//
// The stat row below is the "リアルタイム情報表示領域" — 未承認件数と
// 新着通知は approval_requests/notifications への実クエリ(realtime
// 購読込み)、残りは今回ダミー表示(該当モジュールがまだ無いため)。
export default function Portal() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isSystemAdmin, isCeo } = usePermissions()
  const unread = useUnreadCounts()
  const { requests } = useApprovalRequests()
  const { unreadCount } = useMyNotifications()

  const pendingApprovals = requests.filter(r => r.status === 'pending').length
  const tiles = (isSystemAdmin || isCeo) ? [...COMPANY_MODULES, ADMIN_CENTER_TILE] : COMPANY_MODULES

  return (
    <HubShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 20px 64px' }}>
        <div style={{ marginBottom: 30 }}>
          <WelcomeHero fullName={profile?.full_name} />
          <div style={{ fontSize: 13, color: '#90A4AE', marginTop: 6 }}>
            ご利用になる管理メニューを選択してください — {today()}
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14,
          marginBottom: 34,
        }}>
          <StatCard icon="ti-checkbox" label="未承認件数" value={pendingApprovals} unit="件" color={C.red} />
          <StatCard icon="ti-bell" label="新着通知" value={unreadCount} unit="件" color={C.gold} />
          <StatCard icon="ti-currency-yen" label="今日の売上" value="1,240" unit="千円" color={C.navy} dummy />
          <StatCard icon="ti-list-check" label="今日のToDo" value="3" unit="件" color={C.navy} dummy />
          <StatCard icon="ti-building-store" label="新規営業" value="2" unit="件" color={C.gold} dummy />
          <StatCard icon="ti-file-check" label="新規契約" value="1" unit="件" color={C.navy} dummy />
          <StatCard icon="ti-calendar-time" label="今日のシフト" value="8" unit="名" color={C.gold} dummy />
          <StatCard icon="ti-sparkles" label="AIからのお知らせ" value="1" unit="件" color={C.gold} dummy />
        </div>

        <ModuleGrid modules={tiles} unreadCounts={unread} onSelect={m => navigate(m.path)} />
      </div>
    </HubShell>
  )
}

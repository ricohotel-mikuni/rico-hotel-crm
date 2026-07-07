import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '../../permissions/PermissionContext'
import { useUnreadCounts, useMyNotifications } from '../../hooks/useNotifications'
import { useApprovalRequests } from '../../hooks/useData'
import HubShell from '../../layout/HubShell'
import ModuleGrid from '../../ui/ModuleGrid'
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

function StatCard({ icon, label, value, unit, color, dummy }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px',
      border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      position: 'relative',
    }}>
      {dummy && (
        <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, color: '#BDBDBD', fontWeight: 700 }}>
          ダミー
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${icon}`} style={{ fontSize: 13, color }} />
        </div>
        <span style={{ fontSize: 10.5, color: '#90A4AE', lineHeight: 1.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  )
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
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 20 }}>
          <WelcomeHero fullName={profile?.full_name} />
          <div style={{ fontSize: 13, color: '#90A4AE' }}>
            ご利用になる管理メニューを選択してください — {today()}
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10,
          marginBottom: 26,
        }}>
          <StatCard icon="ti-checkbox" label="未承認件数" value={pendingApprovals} unit="件" color="#E65100" />
          <StatCard icon="ti-bell" label="新着通知" value={unreadCount} unit="件" color="#C62828" />
          <StatCard icon="ti-currency-yen" label="今日の売上" value="1,240" unit="千円" color={C.navy} dummy />
          <StatCard icon="ti-list-check" label="今日のToDo" value="3" unit="件" color="#5C6BC0" dummy />
          <StatCard icon="ti-building-store" label="新規営業" value="2" unit="件" color="#009688" dummy />
          <StatCard icon="ti-file-check" label="新規契約" value="1" unit="件" color="#6A1B9A" dummy />
          <StatCard icon="ti-calendar-time" label="今日のシフト" value="8" unit="名" color="#00838F" dummy />
          <StatCard icon="ti-sparkles" label="AIからのお知らせ" value="1" unit="件" color="#B4933D" dummy />
        </div>

        <ModuleGrid modules={tiles} unreadCounts={unread} onSelect={m => navigate(m.path)} />
      </div>
    </HubShell>
  )
}

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import HubShell from '../../layout/HubShell'
import ModuleGrid from '../../ui/ModuleGrid'
import { COMPANY_MODULES } from './registry'
import { C, today } from '../../lib/constants'

// The company Portal — the very top of the system (`/`), always
// rendered under the daiei brand. COMPANY_MODULES paths are already
// complete top-level paths, so navigation is a direct `navigate(m.path)`
// (unlike PropertyHub, whose registry entries are relative to a
// property's own base path).
export default function Portal() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const unread = useUnreadCounts()

  return (
    <HubShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
            WELCOME
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
            こんにちは、{profile?.full_name || '—'} さん
          </h1>
          <div style={{ fontSize: 13, color: '#90A4AE' }}>
            ご利用になる管理メニューを選択してください — {today()}
          </div>
        </div>

        <ModuleGrid modules={COMPANY_MODULES} unreadCounts={unread} onSelect={m => navigate(m.path)} />
      </div>
    </HubShell>
  )
}

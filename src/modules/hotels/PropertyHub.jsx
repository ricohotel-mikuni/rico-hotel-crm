import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useBrand } from '../../branding/BrandContext'
import HubShell from '../../layout/HubShell'
import ModuleGrid from '../../ui/ModuleGrid'
import { MODULES } from '../registry'
import { C, today } from '../../lib/constants'

// A single property's hub (today: リコホテル三国), rendered under
// that property's own brand. MODULES entries are single-segment
// paths (e.g. '/sales') meant to be appended to this property's own
// base path, so navigation composes `brand.homePath + m.path` —
// unlike the company Portal, whose registry paths are already
// complete top-level paths.
export default function PropertyHub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const brand = useBrand()
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

        <ModuleGrid modules={MODULES} unreadCounts={unread} onSelect={m => navigate(brand.homePath + m.path)} />
      </div>
    </HubShell>
  )
}

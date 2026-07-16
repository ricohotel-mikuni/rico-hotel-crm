import { Routes, Route, Navigate } from 'react-router-dom'
import { usePermissions } from '../../permissions/PermissionContext'
import { PageLoader } from '../../ui'
import SidebarShell from '../../layout/SidebarShell'
import ComingSoon from '../ComingSoon'
import AdminCenter from './AdminCenter'
import AdminAuditLog from './AdminAuditLog'
import AdminHotelManagement from './AdminHotelManagement'
import AdminCommonMasters from './AdminCommonMasters'
import AdminCompanies from './AdminCompanies'
import { ADMIN_MODULES } from './registry'

const ADMIN_NAV_GROUPS = [{
  items: [
    { icon: 'ti-shield', label: '管理センター', path: '/admin', exact: true },
    ...ADMIN_MODULES.map(m => ({ icon: m.icon, label: m.label, path: `/admin${m.path}`, soon: m.status !== 'active' })),
  ],
}]

// 管理センター — gated to system_admin/ceo (the same two role keys
// PermissionContext already special-cases everywhere else). A regular
// staff member hitting /admin directly (typed URL, stale bookmark) is
// silently redirected to company home rather than shown an error —
// the Portal tile is also hidden for them, so this is a defense-in-
// depth check, not the only gate.
export default function AdminApp() {
  const { isSystemAdmin, isCeo, loading } = usePermissions()

  if (loading) return <PageLoader message="権限を確認しています…" />
  if (!isSystemAdmin && !isCeo) return <Navigate to="/" replace />

  return (
    <SidebarShell groups={ADMIN_NAV_GROUPS}>
      <Routes>
        <Route path="/" element={<AdminCenter />} />
        <Route path="audit-logs/*" element={<AdminAuditLog />} />
        <Route path="companies/*" element={<AdminCompanies />} />
        <Route path="hotel-management/*" element={<AdminHotelManagement />} />
        <Route path="common-masters/*" element={<AdminCommonMasters />} />
        {ADMIN_MODULES.filter(m => m.status !== 'active').map(m => (
          <Route key={m.id} path={`${m.path.replace(/^\//, '')}/*`} element={<ComingSoon module={m} bare />} />
        ))}
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </SidebarShell>
  )
}

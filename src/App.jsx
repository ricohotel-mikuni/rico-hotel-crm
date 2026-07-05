import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './auth/Login'
import { PageLoader } from './ui'
import Portal from './modules/portal/Portal'
import { COMPANY_MODULES } from './modules/portal/registry'
import HotelsApp from './modules/hotels/HotelsApp'
import EmployeeDirectory from './modules/employees/EmployeeDirectory'
import EmployeeProfile from './modules/employees/EmployeeProfile'
import ApprovalCenter from './modules/approvals/ApprovalCenter'
import ComingSoon from './modules/ComingSoon'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader message="起動中…" />
  if (!user) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Portal />} />
      <Route path="/hotels/*" element={<HotelsApp />} />
      <Route path="/employees" element={<EmployeeDirectory />} />
      <Route path="/employees/:id" element={<EmployeeProfile />} />
      <Route path="/approvals" element={<ApprovalCenter />} />
      {COMPANY_MODULES.filter(m => m.status !== 'active').map(m => (
        <Route key={m.id} path={`${m.path}/*`} element={<ComingSoon module={m} />} />
      ))}

      {/* 旧URL互換: /sales/* は今はリコホテル三国配下に移動した。
          ブックマーク・履歴からの移行用の一時的なリダイレクトであり、
          恒久的な構造として維持する意図はない。 */}
      <Route path="/sales/*" element={<Navigate to="/hotels/rico-mikuni/sales" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './auth/Login'
import PinLogin from './auth/PinLogin'
import DeviceTrustSetup from './auth/DeviceTrustSetup'
import { hasTrustedRoster, JUST_PASSWORD_SIGNED_IN_KEY } from './auth/deviceTrust'
import { PageLoader } from './ui'
import Portal from './modules/portal/Portal'
import { COMPANY_MODULES } from './modules/portal/registry'
import HotelsApp from './modules/hotels/HotelsApp'
import EmployeeDirectory from './modules/employees/EmployeeDirectory'
import EmployeeProfile from './modules/employees/EmployeeProfile'
import ApprovalCenter from './modules/approvals/ApprovalCenter'
import AdminApp from './modules/admin/AdminApp'
import ComingSoon from './modules/ComingSoon'

export default function App() {
  const { user, loading } = useAuth()
  const [forcePassword, setForcePassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [deviceSetupPending, setDeviceSetupPending] = useState(false)

  // パスワードでログインした直後だけ、信頼済み端末+PIN登録の案内を
  // 一度挟む(Login.jsxがsignIn成功時に立てるフラグを読む)。PINログイン
  // やページ再読み込みによるセッション復元では立たないため誤発火しない。
  useEffect(() => {
    if (user && sessionStorage.getItem(JUST_PASSWORD_SIGNED_IN_KEY)) {
      setDeviceSetupPending(true)
    }
  }, [user])

  // ログアウトして別の人がこの共有端末を使うケースに備え、直前の
  // 「パスワードで」強制表示は次のセッションへ持ち越さない。
  useEffect(() => {
    if (!user) setForcePassword(false)
  }, [user])

  if (loading) return <PageLoader message="起動中…" />

  if (!user) {
    if (forcePassword || !hasTrustedRoster()) {
      return <Login notice={notice} />
    }
    return (
      <PinLogin
        onUsePassword={(msg) => { setForcePassword(true); setNotice(msg || '') }}
      />
    )
  }

  if (deviceSetupPending) {
    return (
      <DeviceTrustSetup
        onDone={() => {
          sessionStorage.removeItem(JUST_PASSWORD_SIGNED_IN_KEY)
          setDeviceSetupPending(false)
          setForcePassword(false)
          setNotice('')
        }}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Portal />} />
      <Route path="/hotels/*" element={<HotelsApp />} />
      <Route path="/employees" element={<EmployeeDirectory />} />
      <Route path="/employees/:id" element={<EmployeeProfile />} />
      <Route path="/approvals" element={<ApprovalCenter />} />
      <Route path="/admin/*" element={<AdminApp />} />
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

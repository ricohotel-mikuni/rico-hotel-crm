import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './auth/Login'
import { PageLoader } from './ui'
import Hub from './views/Hub'
import SalesApp from './modules/sales/SalesApp'
import ComingSoon from './modules/ComingSoon'
import { MODULES } from './modules/registry'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader message="起動中…" />
  if (!user) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/sales/*" element={<SalesApp />} />
      {MODULES.filter(m => m.status !== 'active').map(m => (
        <Route key={m.id} path={`${m.path}/*`} element={<ComingSoon module={m} />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

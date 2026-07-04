import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './auth/Login'
import AppShell from './layout/AppShell'
import { PageLoader } from './ui'

// Lazy-load views
import Home          from './views/Home'
import Clients       from './views/Clients'
import Reports       from './views/Reports'
import Cases         from './views/Cases'
import Commissions   from './views/Commissions'
import Dashboard     from './views/Dashboard'
import Contracts     from './views/Contracts'
import Settings      from './views/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader message="認証確認中…" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader message="起動中…" />

  if (!user) return <Login />

  return (
    <AppShell>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/clients"     element={<Clients />} />
        <Route path="/reports"     element={<Reports />} />
        <Route path="/cases"       element={<Cases />} />
        <Route path="/commissions" element={<Commissions />} />
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/contracts"   element={<Contracts />} />
        <Route path="/settings"    element={<Settings />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

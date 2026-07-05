import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './layout/AppShell'
import Home from './views/Home'
import Clients from './views/Clients'
import Reports from './views/Reports'
import Cases from './views/Cases'
import Commissions from './views/Commissions'
import Dashboard from './views/Dashboard'
import Contracts from './views/Contracts'
import Settings from './views/Settings'

// Sales module — mounted under a property's base path (today
// /hotels/rico-mikuni/sales/*) by that property's router. Keeps its
// own shell/sidebar/routes so it behaves exactly like the original
// standalone 営業管理システム, and doesn't hardcode its own mount
// point anywhere (the catch-all below resolves relative to wherever
// it's actually mounted).
export default function SalesApp() {
  return (
    <AppShell>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="clients"      element={<Clients />} />
        <Route path="reports"      element={<Reports />} />
        <Route path="cases"        element={<Cases />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="contracts"    element={<Contracts />} />
        <Route path="settings"     element={<Settings />} />
        <Route path="*"            element={<Navigate to="." replace />} />
      </Routes>
    </AppShell>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './views/Home'
import Clients from './views/Clients'
import Reports from './views/Reports'
import Cases from './views/Cases'
import Commissions from './views/Commissions'
import Dashboard from './views/Dashboard'
import Contracts from './views/Contracts'
import Settings from './views/Settings'

// Sales module routes — mounted under a property's base path (today
// /hotels/rico-mikuni/sales/*) by HotelsApp.jsx, which now also owns
// the shell (Header + persistent PropertySidebar covering ALL property
// modules, not just sales — see propertyNav.js). No shell of its own
// here anymore; doesn't hardcode its own mount point anywhere (the
// catch-all below resolves relative to wherever it's actually mounted).
export default function SalesApp() {
  return (
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
  )
}

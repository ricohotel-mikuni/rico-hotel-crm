import Header from './Header'
import { DASH } from '../lib/designSystem'

// Thin wrapper: sticky Header + scrollable content. Used by every
// screen that doesn't have its own sidebar (company Portal, ComingSoon,
// PropertyHub, EmployeeDirectory/Profile, ApprovalCenter). The sales
// module's AppShell renders Header too (with a menu button for its
// own Sidebar) — see src/modules/sales/layout/AppShell.jsx.
export default function HubShell({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: DASH.bg, display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}

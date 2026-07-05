import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from '../../../layout/Header'

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useMyNotifications } from '../hooks/useNotifications'
import NotificationCenter from './NotificationCenter'
import { DASH } from '../lib/designSystem'

// Common bell icon + unread badge, mounted once inside the shared
// Header (src/layout/Header.jsx) so any current or future screen
// built on HubShell/AppShell gets it automatically.
export default function NotificationBell({ compact }) {
  const [open, setOpen] = useState(false)
  const { items, unreadCount, loading, markRead, markAllRead } = useMyNotifications()

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="通知"
        className="notification-bell-btn"
        style={{ width: compact ? 34 : 40, height: compact ? 34 : 40 }}
      >
        <i className="ti ti-bell" style={{ fontSize: compact ? 15 : 16 }} />
        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="notification-bell-backdrop" />
          <div className="notification-bell-panel">
            <NotificationCenter
              items={items}
              loading={loading}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          </div>
        </>
      )}

      <style>{`
        .notification-bell-btn {
          position: relative; border-radius: 7px; flex-shrink: 0;
          background: none; border: none;
          color: ${DASH.textSub}; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .notification-bell-btn:active { background: ${DASH.surface3}; }
        @media (hover: hover) and (pointer: fine) {
          .notification-bell-btn:hover { background: ${DASH.surface2}; }
        }
        .notification-bell-badge {
          position: absolute; top: -5px; right: -5px;
          min-width: 17px; height: 17px; padding: 0 4px;
          border-radius: 999px; background: #E53935; color: #fff;
          font-size: 10px; font-weight: 700; line-height: 17px;
          text-align: center; border: 2px solid ${DASH.card};
        }
        .notification-bell-backdrop {
          position: fixed; inset: 0; z-index: 998; background: transparent;
        }
        .notification-bell-panel {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 999;
          background: ${DASH.card}; border-radius: 12px; overflow: hidden;
          box-shadow: 0 12px 36px rgba(0,0,0,.22); border: 1px solid ${DASH.border};
        }
        @media (max-width: 420px) {
          .notification-bell-panel { position: fixed; top: 60px; right: 8px; left: 8px; }
          .notification-bell-panel > div { width: auto !important; }
        }
      `}</style>
    </div>
  )
}

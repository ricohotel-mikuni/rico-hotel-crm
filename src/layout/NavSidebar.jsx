import { useNavigate, useLocation } from 'react-router-dom'
import { C } from '../lib/constants'

// Generic grouped sidebar — takes `groups: [{ label?, soon?, items:
// [{icon,label,path,exact?,soon?}] }]` so it can render both the
// property-wide sidebar (PropertySidebar) and the 管理センター sidebar
// (AdminCenter) from the same component, keeping their look identical.
export default function NavSidebar({ groups, open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()

  const goto = (path) => {
    navigate(path)
    onClose?.()
  }

  return (
    <>
      {open && (
        <div onClick={onClose} className="navsidebar-overlay" style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,.4)' }} />
      )}

      <aside
        className="navsidebar-desktop"
        style={{
          width: C.sidebarWidth, background: C.navyDark,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflowY: 'auto',
          position: 'fixed', top: 0, left: open ? 0 : -C.sidebarWidth,
          height: '100%', zIndex: 200,
          transition: 'left .25s ease',
          boxShadow: open ? '4px 0 20px rgba(0,0,0,.3)' : 'none',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <nav style={{ flex: 1, paddingTop: 10, paddingBottom: 20 }}>
          {groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 6 }}>
              {group.label && (
                <div style={{
                  padding: '12px 16px 5px', fontSize: 10, letterSpacing: '.07em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.35)', fontWeight: 700,
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => goto(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 16px',
                      border: 'none', borderLeft: active ? `3px solid ${C.gold}` : '3px solid transparent',
                      background: active ? 'rgba(201,168,76,.15)' : 'transparent',
                      color: active ? C.gold : 'rgba(255,255,255,.68)',
                      cursor: 'pointer', fontSize: 13,
                      fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                      transition: 'all .15s', textAlign: 'left',
                    }}
                  >
                    <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                    {item.label}
                    {item.soon && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,.35)', flexShrink: 0 }}>準備中</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      <style>{`
        @media (min-width: ${C.breakpoint.md}px) {
          .navsidebar-overlay { display: none !important; }
          .navsidebar-desktop {
            position: static !important;
            left: 0 !important;
            height: 100vh !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}

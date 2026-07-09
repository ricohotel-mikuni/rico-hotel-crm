import { useNavigate, useLocation } from 'react-router-dom'
import { useBrand } from '../branding/BrandContext'
import { C } from '../lib/constants'

// Generic grouped sidebar — takes `groups: [{ label?, soon?, items:
// [{icon,label,path,exact?,soon?}] }]` so it can render both the
// property-wide sidebar (PropertySidebar) and the 管理センター sidebar
// (AdminCenter) from the same component, keeping their look identical.
//
// Top brand-logo header(承認済み提案書「拠点ダッシュボードUI改善
// Ver.5/Ver.6」⑤⑥) — replaces the old "ホーム" text link that used to
// live inside a plain 概要 group; clicking the logo now IS the way
// back to this brand's home. useBrand() already resolves correctly
// whether this sidebar is rendered under a property's BrandProvider
// (リコホテル三国) or with no provider at all(管理センターは既定の
// 大栄商事ブランドを使う — BrandContext.jsxのデフォルト値)。
export default function NavSidebar({ groups, open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const brand = useBrand()

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
        <button
          type="button" onClick={() => goto(brand.homePath)} title={brand.name}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '22px 16px 16px',
            textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0,
          }}
        >
          <img src={brand.logo} alt={brand.name} style={{ maxWidth: '100%', height: 76, objectFit: 'contain' }} />
        </button>

        <nav style={{ flex: 1, paddingTop: 10, paddingBottom: 20 }}>
          {groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 6 }}>
              {group.label && (
                <div className="navsidebar-group-label">{group.label}</div>
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
        .navsidebar-group-label {
          padding: 12px 16px 6px; margin: 0 4px 3px;
          font-size: 10px; letter-spacing: .07em; text-transform: uppercase;
          color: ${C.gold}; font-weight: 700;
          border-bottom: 1px solid rgba(201,168,76,.22);
        }
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

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBrand } from '../branding/BrandContext'
import { C } from '../lib/constants'
import { DASH } from '../lib/designSystem'

// Generic grouped sidebar — takes `groups: [{ label?, soon?, items:
// [{icon,label,path,exact?,soon?}] }]` so it can render both the
// property-wide sidebar (PropertySidebar) and the 管理センター sidebar
// (AdminCenter) from the same component, keeping their look identical.
// A group with no `label` renders as a "pinned" row with no category
// header and no collapse toggle — used for a single always-visible
// entry point (プロパティ側の「ダッシュボード」、管理センター側の
// 「管理センター」自身) sitting above the labeled, collapsible
// categories(承認済み提案書「拠点ダッシュボードUI改善 Ver.7」①)。
//
// Top brand-logo header(承認済み提案書Ver.5/Ver.6⑤⑥) — replaces the
// old "ホーム" text link; clicking the logo is the way back to this
// brand's home. useBrand() already resolves correctly whether this
// sidebar is rendered under a property's BrandProvider(リコホテル
// 三国)or with no provider at all(管理センターは既定の大栄商事
// ブランドを使う — BrandContext.jsxのデフォルト値)。
export default function NavSidebar({ groups, open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const brand = useBrand()
  const [collapsed, setCollapsed] = useState({})

  const goto = (path) => {
    navigate(path)
    onClose?.()
  }

  const toggleGroup = (label) => setCollapsed(c => ({ ...c, [label]: !c[label] }))

  return (
    <>
      {open && (
        <div onClick={onClose} className="navsidebar-overlay" style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,.4)' }} />
      )}

      <aside
        className="navsidebar-desktop"
        style={{
          width: C.sidebarWidth, background: DASH.card,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflowY: 'auto',
          position: 'fixed', top: 0, left: open ? 0 : -C.sidebarWidth,
          height: '100%', zIndex: 200,
          transition: 'left .25s ease',
          borderRight: `1px solid ${DASH.border}`,
          boxShadow: open ? '4px 0 20px rgba(0,0,0,.15)' : 'none',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <button
          type="button" onClick={() => goto(brand.homePath)} title={brand.name}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '28px 16px 22px',
            textAlign: 'center', borderBottom: `1px solid ${DASH.border}`, flexShrink: 0,
          }}
        >
          {/* ロゴを約1.5倍(76px→114px)に拡大(承認済み提案書「拠点
              ダッシュボードUI 追加修正」③) — ブランドとして最初に
              目に入る存在感を持たせる。余白もサイズに合わせて拡大。 */}
          <img src={brand.logo} alt={brand.name} style={{ maxWidth: '100%', height: 114, objectFit: 'contain' }} />
        </button>

        <nav style={{ flex: 1, paddingTop: 10, paddingBottom: 20 }}>
          {groups.map((group, gi) => {
            if (!group.label) {
              return (
                <div key={gi} className="navsidebar-pinned">
                  {group.items.map(item => (
                    <NavButton key={item.path} item={item} location={location} onClick={() => goto(item.path)} pinned />
                  ))}
                </div>
              )
            }

            const isCollapsed = !!collapsed[group.label]
            return (
              <div key={gi} style={{ marginBottom: 6 }}>
                <button type="button" onClick={() => toggleGroup(group.label)} className="navsidebar-group-label">
                  {group.label}
                  <i className={`ti ti-chevron-down navsidebar-chevron${isCollapsed ? ' is-collapsed' : ''}`} />
                </button>
                {!isCollapsed && group.items.map(item => (
                  <NavButton key={item.path} item={item} location={location} onClick={() => goto(item.path)} />
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      <style>{`
        .navsidebar-pinned { margin: 6px 12px 14px; }
        .navsidebar-group-label {
          width: 100%; display: flex; align-items: center; gap: 8px; cursor: pointer;
          background: none; border: none; font-family: inherit;
          padding: 12px 16px 6px; margin: 0 4px 3px;
          font-size: 10px; letter-spacing: .07em; text-transform: uppercase;
          color: ${DASH.gold}; font-weight: 700;
          border-bottom: 1px solid rgba(212,175,55,.22);
        }
        .navsidebar-chevron { margin-left: auto; font-size: 13px; opacity: .6; transition: transform .2s; }
        .navsidebar-chevron.is-collapsed { transform: rotate(-90deg); }
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

function NavButton({ item, location, onClick, pinned }) {
  const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: pinned ? '10px 14px' : '10px 16px',
        border: 'none',
        borderLeft: !pinned && active ? `3px solid ${DASH.gold}` : '3px solid transparent',
        borderRadius: pinned ? 10 : 0,
        background: active ? 'rgba(212,175,55,.13)' : 'transparent',
        color: active ? DASH.gold : DASH.textSub,
        cursor: 'pointer', fontSize: pinned ? 12.5 : 13,
        fontFamily: 'inherit', fontWeight: active ? 700 : 400,
        transition: 'all .15s', textAlign: 'left',
      }}
    >
      <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
      {item.label}
      {item.soon && <span style={{ marginLeft: 'auto', fontSize: 9, color: DASH.textFaint, flexShrink: 0 }}>準備中</span>}
    </button>
  )
}

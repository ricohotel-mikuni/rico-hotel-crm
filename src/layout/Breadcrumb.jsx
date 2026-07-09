import { useNavigate, useLocation } from 'react-router-dom'
import { buildBreadcrumbs } from './breadcrumbTrail'
import { C } from '../lib/constants'

// The ONE navigation control in the header: an in-app "← 1つ前へ戻る"
// (goes to the previous breadcrumb level, not browser history) plus
// the full breadcrumb trail, each level clickable. Replaces the old
// BackButton/PropertyBackLink pair — a breadcrumb already generalizes
// both "jump to company top" and "jump to property hub" as just two
// of its levels, so there's no longer a need for separate components
// with their own logic for which ancestor to jump to.
//
// Full trail shows on wider screens; below C.breakpoint.md it
// collapses to just the current page's label (bold) since 4-5 levels
// of text cannot fit a phone screen — the "←" button remains the way
// to step back one level regardless of viewport width.
export default function Breadcrumb() {
  const navigate = useNavigate()
  const location = useLocation()
  const crumbs = buildBreadcrumbs(location.pathname)
  const current = crumbs[crumbs.length - 1]
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null

  return (
    <div className="breadcrumb">
      {parent && (
        <button type="button" onClick={() => navigate(parent.path)} className="breadcrumb-back" title={`${parent.label}へ戻る`}>
          <span aria-hidden="true">←</span>
          <span className="breadcrumb-back-label">1つ前へ</span>
        </button>
      )}

      <nav className="breadcrumb-trail" aria-label="現在地">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={c.path + i} className="breadcrumb-item-wrap">
              {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">›</span>}
              {isLast ? (
                <span className="breadcrumb-item current">
                  {c.icon && <span className="breadcrumb-item-icon">{c.icon}</span>}
                  {c.label}
                </span>
              ) : (
                <button type="button" onClick={() => navigate(c.path)} className="breadcrumb-item">
                  {c.icon ? `${c.icon} ` : ''}{c.label}
                </button>
              )}
            </span>
          )
        })}
      </nav>

      {/* Narrow-screen fallback: only the current page label */}
      <div className="breadcrumb-current-mobile">{current.icon ? `${current.icon} ` : ''}{current.label}</div>

      <style>{`
        .breadcrumb {
          display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;
        }
        .breadcrumb-back {
          display: flex; align-items: center; gap: 5px; flex-shrink: 0;
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
          border-radius: ${C.radius.pill}px; padding: 6px 12px;
          color: #fff; font-weight: 700; font-size: 12px; font-family: inherit;
          cursor: pointer; white-space: nowrap; min-height: 34px;
          transition: background .15s, transform .1s;
        }
        .breadcrumb-back:active { transform: scale(.95); background: rgba(255,255,255,.2); }
        @media (hover: hover) and (pointer: fine) {
          .breadcrumb-back:hover { background: rgba(255,255,255,.18); }
        }
        .breadcrumb-trail {
          display: flex; align-items: center; flex-wrap: nowrap; overflow: hidden;
          min-width: 0; gap: 2px;
        }
        .breadcrumb-item-wrap { display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; }
        .breadcrumb-item {
          background: none; border: none; padding: 4px 5px; border-radius: 5px;
          font-size: 12.5px; font-family: inherit; cursor: pointer;
          color: rgba(255,255,255,.55); white-space: nowrap;
        }
        .breadcrumb-item.current {
          color: ${C.gold}; font-weight: 700; cursor: default; font-size: 15px;
          padding-bottom: 5px; border-bottom: 2px solid ${C.gold};
        }
        .breadcrumb-item-icon { display: inline-block; transform: scale(1.3); margin-right: 3px; }
        button.breadcrumb-item:hover { background: rgba(255,255,255,.1); color: #fff; }
        .breadcrumb-sep { color: rgba(255,255,255,.3); font-size: 11px; margin: 0 1px; }
        .breadcrumb-current-mobile { display: none; font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .breadcrumb-back-label { display: inline; }

        @media (max-width: ${C.breakpoint.md - 1}px) {
          .breadcrumb-trail { display: none; }
          .breadcrumb-current-mobile { display: block; min-width: 0; }
        }
        @media (max-width: 480px) {
          .breadcrumb-back-label { display: none; }
          .breadcrumb-back { padding: 6px 9px; }
        }
      `}</style>
    </div>
  )
}

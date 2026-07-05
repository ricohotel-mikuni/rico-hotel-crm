import { useNavigate } from 'react-router-dom'
import { useBrand } from './BrandContext'
import { BRANDS } from './brands'

// Shortcut straight back to the 大栄商事 company Portal, shown inside
// every property-scoped header (HubShell, the sales module's
// AppShell) whenever the active brand isn't daiei — i.e. anywhere
// inside a property's own subtree. Both of those headers are already
// `position: sticky; top: 0`, so rendering this as a normal inline
// button there (rather than a viewport-fixed overlay) satisfies
// "always visible on scroll" for free, with no risk of floating over
// a page's own in-content controls.
//
// Deliberately distinct from the existing `HomeButton` (which only
// goes back one level, to the property's own hub) — see
// brand_switching_pattern in memory.
export default function CompanyHomeButton({ compact }) {
  const navigate = useNavigate()
  const brand = useBrand()

  if (brand.id === BRANDS.daiei.id) return null

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(BRANDS.daiei.homePath)}
        className="company-home-btn"
        title="大栄商事統合ホームへ戻る"
        style={{ padding: compact ? '7px 11px' : '8px 14px', fontSize: compact ? 11.5 : 12.5 }}
      >
        <span style={{ fontSize: compact ? 13 : 15, lineHeight: 1 }}>🏢</span>
        統合ホームへ戻る
      </button>
      <style>{`
        .company-home-btn {
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: linear-gradient(135deg, #162847 0%, #1F3864 100%);
          border: 1.5px solid rgba(201,168,76,.6);
          border-radius: 999px;
          color: #FFF3D6;
          font-weight: 700; font-family: inherit;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,.2);
          transition: background .15s, transform .1s;
        }
        .company-home-btn:active { transform: scale(.95); }
        @media (hover: hover) and (pointer: fine) {
          .company-home-btn:hover { background: linear-gradient(135deg, #1F3864 0%, #2E5FA3 100%); }
        }
      `}</style>
    </>
  )
}

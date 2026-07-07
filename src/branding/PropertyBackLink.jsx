import { useNavigate, useLocation } from 'react-router-dom'
import { useBrand, LAST_PROPERTY_STORAGE_KEY } from './BrandContext'
import { BRANDS } from './brands'
import { C } from '../lib/constants'

// Fast path back to whichever property (リコホテル三国 etc.) the user
// was last in, shown only on company-wide screens (社員管理・電子承認
// and similar) that render under the daiei brand — reached FROM a
// property but with no built-in way back to it, since they aren't part
// of that property's own route subtree. Property-scoped screens
// (sales module etc.) don't need this: their header logo already
// links to that property's own hub via brand.homePath.
//
// Mounted once in the shared Header, so any current or future
// property automatically gets this the moment BrandProvider records
// it (see BrandContext.jsx) — no per-screen wiring required.
export default function PropertyBackLink({ compact }) {
  const navigate = useNavigate()
  const location = useLocation()
  const brand = useBrand()

  if (brand.id !== BRANDS.daiei.id) return null

  const lastPropertyId = localStorage.getItem(LAST_PROPERTY_STORAGE_KEY)
  const property = lastPropertyId && BRANDS[lastPropertyId]
  if (!property || location.pathname === property.homePath) return null

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(property.homePath)}
        className="property-back-link"
        style={{ padding: compact ? '7px 12px' : '8px 16px', fontSize: compact ? 12 : 13 }}
      >
        <span style={{ fontSize: compact ? 13 : 15, lineHeight: 1 }}>←</span>
        <span className="property-back-link-label">{property.shortNameJa || property.name}へ戻る</span>
      </button>
      <style>{`
        .property-back-link {
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: rgba(255,255,255,.08);
          border: 1.5px solid rgba(255,255,255,.25);
          border-radius: ${C.radius.pill}px;
          color: rgba(255,255,255,.85);
          font-weight: 700; font-family: inherit;
          cursor: pointer; white-space: nowrap;
          min-height: 34px;
          transition: background .15s, transform .1s;
        }
        .property-back-link:active { transform: scale(.95); background: rgba(255,255,255,.18); }
        @media (hover: hover) and (pointer: fine) {
          .property-back-link:hover { background: rgba(255,255,255,.16); }
        }
        @media (max-width: 480px) {
          .property-back-link-label { display: none; }
        }
      `}</style>
    </>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'
import { useBrand } from './BrandContext'
import { BRANDS } from './brands'
import { C } from '../lib/constants'

// The ONE "go back" control shown in the shared Header (src/layout/Header.jsx),
// replacing what used to be two separately-styled buttons (the old
// HomeButton in src/ui/index.jsx and CompanyHomeButton here) that drifted
// into different sizes/radii/paddings. Label and target both switch on
// the active brand instead of being two different components:
//   - daiei (company-level screens): 🏠 ホーム → daiei's own top ('/').
//     Hidden once already there (no point linking to yourself).
//   - any other brand (inside a property, e.g. ricoHotel): 🏢 大栄商事へ戻る
//     → always daiei's top, shown unconditionally.
// The old "go back one level to the property's own hub" meaning is
// intentionally dropped as a separate button — it's covered by the
// sales Sidebar's own "ホーム" nav item, which pointed at the same
// place and was redundant with this one.
export default function BackButton({ compact }) {
  const navigate = useNavigate()
  const location = useLocation()
  const brand = useBrand()

  const isDaiei = brand.id === BRANDS.daiei.id
  if (isDaiei && location.pathname === BRANDS.daiei.homePath) return null

  const icon = isDaiei ? '🏠' : '🏢'
  const label = isDaiei ? 'ホーム' : '大栄商事へ戻る'

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(BRANDS.daiei.homePath)}
        className="back-btn"
        style={{ padding: compact ? '7px 12px' : '8px 16px', fontSize: compact ? 12 : 13 }}
      >
        <span style={{ fontSize: compact ? 14 : 16, lineHeight: 1 }}>{icon}</span>
        <span className="back-btn-label">{label}</span>
      </button>
      <style>{`
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: rgba(201,168,76,.18);
          border: 1.5px solid rgba(201,168,76,.55);
          border-radius: ${C.radius.pill}px;
          color: #FFF3D6;
          font-weight: 700; font-family: inherit;
          cursor: pointer; white-space: nowrap;
          min-height: 34px;
          transition: background .15s, transform .1s;
        }
        .back-btn:active { transform: scale(.95); background: rgba(201,168,76,.34); }
        @media (hover: hover) and (pointer: fine) {
          .back-btn:hover { background: rgba(201,168,76,.3); }
        }
        @media (max-width: 380px) {
          .back-btn { padding: 7px 10px !important; }
          .back-btn-label { display: none; }
        }
      `}</style>
    </>
  )
}

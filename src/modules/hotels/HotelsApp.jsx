import { Routes, Route, Navigate } from 'react-router-dom'
import { BrandProvider } from '../../branding/BrandContext'
import { BRANDS } from '../../branding/brands'
import HotelList from './HotelList'
import PropertyHub from './PropertyHub'
import SalesApp from '../sales/SalesApp'
import ComingSoon from '../ComingSoon'
import { MODULES } from '../registry'

// ホテル事業 — mounted at /hotels/* by the top-level App router.
// "/" lists every property; each property gets its own brand-switched
// subtree with its module hub + the existing sales module + the
// other property-level modules as ComingSoon placeholders.
//
// Only one property exists today (rico-mikuni), hardcoded below. A
// second property would repeat this same <Route> block under its own
// slug/brand — see the write-up for how that extends.
export default function HotelsApp() {
  return (
    <Routes>
      <Route path="/" element={<HotelList />} />
      <Route
        path="rico-mikuni/*"
        element={
          <BrandProvider brand={BRANDS.ricoHotel}>
            <Routes>
              <Route path="/" element={<PropertyHub />} />
              <Route path="sales/*" element={<SalesApp />} />
              {MODULES.filter(m => m.status !== 'active').map(m => (
                <Route key={m.id} path={`${m.path.replace(/^\//, '')}/*`} element={<ComingSoon module={m} />} />
              ))}
              <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
          </BrandProvider>
        }
      />
      <Route path="*" element={<Navigate to="/hotels" replace />} />
    </Routes>
  )
}

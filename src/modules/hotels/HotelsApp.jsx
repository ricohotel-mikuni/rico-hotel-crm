import { Routes, Route, Navigate } from 'react-router-dom'
import { BrandProvider } from '../../branding/BrandContext'
import { BRANDS } from '../../branding/brands'
import SidebarShell from '../../layout/SidebarShell'
import HotelList from './HotelList'
import PropertyHub from './PropertyHub'
import SalesApp from '../sales/SalesApp'
import ComingSoon from '../ComingSoon'
import { MODULES } from '../registry'
import { buildPropertyNavGroups } from './propertyNav'

// ホテル事業 — mounted at /hotels/* by the top-level App router.
// "/" lists every property; each property gets its own brand-switched
// subtree, now wrapped in ONE persistent-sidebar shell (SidebarShell +
// propertyNav.js) covering every property module (営業管理 sub-pages,
// 運営, その他) — replaces the old setup where only the sales module
// had its own separate AppShell/Sidebar and PropertyHub was a bare
// tile grid.
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
            <SidebarShell groups={buildPropertyNavGroups(BRANDS.ricoHotel)}>
              <Routes>
                <Route path="/" element={<PropertyHub />} />
                <Route path="sales/*" element={<SalesApp />} />
                {MODULES.filter(m => m.status !== 'active').map(m => (
                  <Route key={m.id} path={`${m.path.replace(/^\//, '')}/*`} element={<ComingSoon module={m} bare />} />
                ))}
                <Route path="*" element={<Navigate to="." replace />} />
              </Routes>
            </SidebarShell>
          </BrandProvider>
        }
      />
      <Route path="*" element={<Navigate to="/hotels" replace />} />
    </Routes>
  )
}

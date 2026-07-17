import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { BrandProvider } from '../../branding/BrandContext'
import { BRANDS } from '../../branding/brands'
import { PageLoader } from '../../ui'
import SidebarShell from '../../layout/SidebarShell'
import HotelList from './HotelList'
import PropertyHub from './PropertyHub'
import FrontDesk from './frontdesk/FrontDesk'
import Housekeeping from './housekeeping/Housekeeping'
import Breakfast from './breakfast/Breakfast'
import Parking from './parking/Parking'
import Dinner from './dinner/Dinner'
import SalesApp from '../sales/SalesApp'
import ComingSoon from '../ComingSoon'
import { MODULES } from '../registry'
import { buildPropertyNavGroups } from './propertyNav'
import { useHotelBySlug } from '../../hooks/useData'
import { HotelProvider } from './HotelContext'

// ホテル事業 — mounted at /hotels/* by the top-level App router.
// "/" lists every property; each property gets its own brand-switched
// subtree, wrapped in ONE persistent-sidebar shell (SidebarShell +
// propertyNav.js) covering every property module (営業管理 sub-pages,
// 運営, その他).
//
// 統合ホテル管理モジュール(承認済み提案書)により、以前は
// "rico-mikuni" 1件だけをハードコードした <Route> ブロックだったが、
// ":hotelSlug" による動的解決へ変更した — ホテル管理画面(管理センター)
// から新しいホテルを追加するだけで、コード変更なしにここへアクセス
// できるようになる。brand_key(hotels.brand_key)でBRANDS(現状はdaiei/
// ricoHotelの2種)のどれを使うかを決める。
function HotelProperty() {
  const { hotelSlug } = useParams()
  const { hotel, loading, error } = useHotelBySlug(hotelSlug)

  if (loading) return <PageLoader message="ホテル情報を読み込んでいます…" />
  if (error || !hotel) return <Navigate to="/hotels" replace />

  const brand = BRANDS[hotel.hotels?.brand_key] || BRANDS.ricoHotel

  return (
    <HotelProvider value={{ locationId: hotel.id, hotelId: hotel.hotels?.id, companyId: hotel.company_id, slug: hotel.slug, name: hotel.name }}>
      <BrandProvider brand={brand}>
        <SidebarShell groups={buildPropertyNavGroups(brand)}>
          <Routes>
            <Route path="/" element={<PropertyHub />} />
            <Route path="sales/*" element={<SalesApp />} />
            <Route path="front/*" element={<FrontDesk />} />
            <Route path="cleaning/*" element={<Housekeeping />} />
            <Route path="breakfast/*" element={<Breakfast />} />
            <Route path="parking/*" element={<Parking />} />
            <Route path="dinner/*" element={<Dinner />} />
            {MODULES.filter(m => m.status !== 'active').map(m => (
              <Route key={m.id} path={`${m.path.replace(/^\//, '')}/*`} element={<ComingSoon module={m} bare />} />
            ))}
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </SidebarShell>
      </BrandProvider>
    </HotelProvider>
  )
}

export default function HotelsApp() {
  return (
    <Routes>
      <Route path="/" element={<HotelList />} />
      <Route path=":hotelSlug/*" element={<HotelProperty />} />
      <Route path="*" element={<Navigate to="/hotels" replace />} />
    </Routes>
  )
}

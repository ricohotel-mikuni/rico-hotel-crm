import { BRANDS } from '../branding/brands'
import { MODULES } from '../modules/registry'
import { COMPANY_MODULES } from '../modules/portal/registry'
import { SALES_NAV_ITEMS } from '../modules/hotels/propertyNav'
import { ADMIN_MODULES } from '../modules/admin/registry'
import { LAST_PROPERTY_STORAGE_KEY } from '../branding/BrandContext'

// 社員管理/電子承認 are company-wide (daiei-branded) screens, not
// nested under any property's own route subtree, but are commonly
// reached FROM a property. Inserting the last-visited property here
// (remembered by BrandContext whenever a non-daiei brand mounts) keeps
// the breadcrumb as the one place this "fast path back" lives, rather
// than a separate button — see brand_switching_pattern for the
// history of why this existed as its own component before.
function lastPropertyCrumb() {
  const id = localStorage.getItem(LAST_PROPERTY_STORAGE_KEY)
  const brand = id && BRANDS[id]
  return brand ? { icon: 'ti-building-store', label: brand.shortNameJa || brand.name, path: brand.homePath } : null
}

// Pure function: current pathname -> the ancestor chain to show in the
// header breadcrumb, e.g. [大栄商事, ホテル事業, リコホテル三国, 営業管理,
// 営業先管理]. Reads the same registries the actual routes/sidebars are
// built from (registry.js, portal/registry.js, propertyNav.js) so it
// can never drift out of sync with what a screen is actually called —
// no separate hardcoded label list to maintain.
//
// Only one property (リコホテル三国) exists today; a second property
// would need this function to resolve the brand from the `:slug`
// segment instead of hardcoding BRANDS.ricoHotel — see HotelList.jsx
// for where that same simplification currently lives.
export function buildBreadcrumbs(pathname) {
  const daiei = BRANDS.daiei
  const crumbs = [{ icon: 'ti-building', label: daiei.name, path: daiei.homePath }]

  if (pathname === daiei.homePath) return crumbs

  if (pathname.startsWith('/hotels')) {
    crumbs.push({ icon: 'ti-building-store', label: 'ホテル事業', path: '/hotels' })
    if (pathname === '/hotels') return crumbs

    const brand = BRANDS.ricoHotel // single property today
    if (!pathname.startsWith(brand.homePath)) return crumbs
    crumbs.push({ icon: 'ti-building-store', label: brand.shortNameJa || brand.name, path: brand.homePath })
    if (pathname === brand.homePath) return crumbs

    const rest = pathname.slice(brand.homePath.length) // '/sales', '/sales/clients', '/front', ...
    if (rest.startsWith('/sales')) {
      const salesBase = `${brand.homePath}/sales`
      crumbs.push({ label: '営業管理', path: salesBase })
      const salesSeg = rest.slice('/sales'.length) // '', '/clients', ...
      if (salesSeg) {
        const navItem = SALES_NAV_ITEMS.find(n => n.seg === salesSeg)
        if (navItem) crumbs.push({ label: navItem.label, path: pathname })
      }
      return crumbs
    }

    const seg = '/' + rest.replace(/^\//, '').split('/')[0]
    const mod = MODULES.find(m => m.path === seg && !m.absolute)
    if (mod) crumbs.push({ label: mod.label, path: `${brand.homePath}${mod.path}` })
    return crumbs
  }

  if (pathname.startsWith('/admin')) {
    crumbs.push({ icon: 'ti-shield', label: '管理センター', path: '/admin' })
    if (pathname === '/admin') return crumbs
    const seg = '/' + pathname.slice('/admin'.length).replace(/^\//, '').split('/')[0]
    const mod = ADMIN_MODULES.find(m => m.path === seg)
    if (mod) crumbs.push({ label: mod.label, path: `/admin${mod.path}` })
    return crumbs
  }

  if (pathname.startsWith('/employees')) {
    const lp = lastPropertyCrumb()
    if (lp) crumbs.push(lp)
    crumbs.push({ icon: 'ti-users', label: '社員管理', path: '/employees' })
    if (pathname !== '/employees') crumbs.push({ label: '社員詳細', path: pathname })
    return crumbs
  }

  if (pathname.startsWith('/approvals')) {
    const lp = lastPropertyCrumb()
    if (lp) crumbs.push(lp)
    crumbs.push({ icon: 'ti-clipboard-text', label: '電子承認', path: '/approvals' })
    return crumbs
  }

  const mod = COMPANY_MODULES.find(m => m.path !== '/' && pathname.startsWith(m.path))
  if (mod) crumbs.push({ label: mod.label, path: mod.path })
  return crumbs
}

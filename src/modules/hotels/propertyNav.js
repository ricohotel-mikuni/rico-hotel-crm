import { MODULES } from '../registry'

// Canonical nav structure for a property (today: リコホテル三国) — the
// single source of truth for both the persistent PropertySidebar and
// the header breadcrumb's label lookups, so they can never drift apart.
// Paths are relative segments appended to the property's own base path
// (`brand.homePath`), except `staff`'s absolute:true entry, which jumps
// straight to the company-wide /employees (see MODULES in registry.js).
//
// 営業管理's own sub-pages are hardcoded here (not derived from a
// registry) since the sales module has no separate module-registry of
// its own — this list is also what src/layout/breadcrumbTrail.js reads
// for sales sub-page labels.
export const SALES_NAV_ITEMS = [
  { seg: '/clients',     icon: 'ti-building-store', label: '営業先管理' },
  { seg: '/reports',     icon: 'ti-file-text',      label: '営業日報' },
  { seg: '/cases',       icon: 'ti-clipboard-list', label: '案件管理' },
  { seg: '/contracts',   icon: 'ti-file-check',     label: '契約管理' },
  { seg: '/commissions', icon: 'ti-currency-yen',   label: '成果報酬' },
  { seg: '',             icon: 'ti-chart-bar',      label: '営業概要' },
  { seg: '/settings',    icon: 'ti-settings',       label: '営業設定' },
]

const OPERATIONS_IDS = ['front', 'cleaning', 'breakfast', 'dinner', 'maintenance', 'shifts']
const OTHER_IDS = ['payments', 'cashier', 'purchase', 'expenses', 'documents', 'staff', 'settings']

// Builds the grouped sidebar structure for a given property brand.
// `salesBase`/`propBase` are the property's own homePath composed with
// the relevant segment — kept as plain strings so both PropertySidebar
// (rendering) and breadcrumbTrail.js (lookup) build identical paths.
export function buildPropertyNavGroups(brand) {
  const propBase = brand.homePath
  const salesBase = `${propBase}/sales`

  return [
    {
      label: '概要',
      items: [{ icon: 'ti-home', label: 'ホーム', path: propBase, exact: true }],
    },
    {
      label: '営業',
      items: SALES_NAV_ITEMS.map(n => ({ icon: n.icon, label: n.label, path: `${salesBase}${n.seg}`, exact: n.seg === '' })),
    },
    {
      label: '運営',
      soon: true,
      items: MODULES.filter(m => OPERATIONS_IDS.includes(m.id)).map(m => ({
        icon: m.icon, label: m.label, path: `${propBase}${m.path}`, soon: m.status !== 'active',
      })),
    },
    {
      label: 'その他',
      items: MODULES.filter(m => OTHER_IDS.includes(m.id)).map(m => ({
        icon: m.icon, label: m.label,
        path: m.absolute ? m.path : `${propBase}${m.path}`,
        soon: m.status !== 'active',
      })),
    },
  ]
}

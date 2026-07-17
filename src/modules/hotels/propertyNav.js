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
// for sales sub-page labels. The sidebar itself only surfaces 3 of
// these 7 (承認済み提案書「拠点ダッシュボードUI改善 Ver.6」④) — the
// rest stay reachable via 営業管理 トップ画面(Home.jsx)のKPIカード、
// またはURLを直接開くことで到達できる(サイドバーから消えるだけで
// ルート自体は残る)。
export const SALES_NAV_ITEMS = [
  { seg: '/clients',     icon: 'ti-building-store', label: '営業先管理' },
  { seg: '/reports',     icon: 'ti-file-text',      label: '営業日報' },
  { seg: '/cases',       icon: 'ti-clipboard-list', label: '案件管理' },
  { seg: '/contracts',   icon: 'ti-file-check',     label: '契約管理' },
  { seg: '/commissions', icon: 'ti-currency-yen',   label: '成果報酬' },
  { seg: '',             icon: 'ti-chart-bar',      label: '営業概要' },
  { seg: '/settings',    icon: 'ti-settings',       label: '営業設定' },
]

// サイドバーに出す項目。以前は3項目(承認済み提案書Ver.6)だったが、
// Foundation v1.0是正(UX統一③)で「主要操作は3クリック以内」の
// 監査に基づき営業先管理を追加した — 営業管理トップ(Home.jsx)の
// KPIカード経由だと5クリックかかっていたため。
const SALES_SIDEBAR_ITEMS = [
  { seg: '',           icon: 'ti-building-store', label: '営業管理' },
  { seg: '/clients',    icon: 'ti-building-store', label: '営業先管理' },
  { seg: '/cases',      icon: 'ti-clipboard-list', label: '案件管理' },
  { seg: '/contracts',  icon: 'ti-file-check',     label: '契約管理' },
]

const HOTEL_OPS_IDS = ['front', 'cleaning', 'breakfast', 'dinner', 'parking', 'revenue']
const MANAGEMENT_IDS = ['maintenance', 'shifts', 'payments', 'cashier', 'purchase', 'expenses', 'documents']
const SYSTEM_IDS = ['staff', 'settings', 'neo']

// Builds the grouped sidebar structure for a given property brand —
// 「ダッシュボード」の固定項目(label無し = NavSidebar.jsxで折りたたみ
// 不可のpinned表示になる)+ ホテル業務／営業／管理／システムの4カテゴリー
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.5〜Ver.7」)。旧「概要」
// グループの「ホーム」リンクはロゴクリックに統合済みだが、Ver.7で改めて
// 独立したナビ項目としても復活させている。
export function buildPropertyNavGroups(brand) {
  const propBase = brand.homePath
  const salesBase = `${propBase}/sales`

  return [
    {
      items: [{ icon: 'ti-layout-dashboard', label: 'ダッシュボード', path: propBase, exact: true }],
    },
    {
      label: 'ホテル業務',
      items: MODULES.filter(m => HOTEL_OPS_IDS.includes(m.id)).map(m => ({
        icon: m.icon, label: m.label, path: `${propBase}${m.path}`, soon: m.status !== 'active',
      })),
    },
    {
      label: '営業',
      items: SALES_SIDEBAR_ITEMS.map(n => ({ icon: n.icon, label: n.label, path: `${salesBase}${n.seg}`, exact: n.seg === '' })),
    },
    {
      label: '管理',
      soon: true,
      items: MODULES.filter(m => MANAGEMENT_IDS.includes(m.id)).map(m => ({
        icon: m.icon, label: m.label, path: `${propBase}${m.path}`, soon: m.status !== 'active',
      })),
    },
    {
      label: 'システム',
      items: MODULES.filter(m => SYSTEM_IDS.includes(m.id)).map(m => ({
        icon: m.icon, label: m.label,
        path: m.absolute ? m.path : `${propBase}${m.path}`,
        soon: m.status !== 'active',
      })),
    },
  ]
}

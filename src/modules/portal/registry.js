// Tiles shown on the company Portal (`/`) — the top of the whole
// system, one level above any business line. Same extension pattern
// as src/modules/registry.js: add a module folder under src/modules/,
// add an entry here, flip status to 'active' once it has a real
// screen wired up in App.jsx.
//
// IDs are deliberately distinct from src/modules/registry.js's IDs
// (that registry has its own 'documents', hence 'hq-documents' here)
// since useUnreadCounts() groups notifications by a flat `module`
// text column with no scope prefix — reusing an id across registries
// would make one module's badge bleed into the other's tile.
export const COMPANY_MODULES = [
  { id: 'dashboard',    label: 'ダッシュボード',     icon: 'ti-chart-bar',     path: '/dashboard', status: 'soon',   notifiable: false, desc: '会社全体の経営指標' },
  { id: 'hotels',       label: 'ホテル事業',         icon: 'ti-building-store', path: '/hotels',    status: 'active', notifiable: true,  desc: 'ホテル各拠点の管理' },
  { id: 'rentals',      label: '賃貸事業',           icon: 'ti-home',          path: '/rentals',    status: 'soon',   notifiable: true,  desc: '賃貸物件の管理' },
  { id: 'employees',    label: '社員管理',           icon: 'ti-users',        path: '/employees',  status: 'active', notifiable: false, desc: '社員情報・配属の管理' },
  { id: 'approvals',    label: '電子承認',           icon: 'ti-checkbox',     path: '/approvals',  status: 'active', notifiable: true,  desc: '購入・経費・休暇・稟議・契約の承認' },
  { id: 'hq-documents', label: '書類管理',           icon: 'ti-folder',       path: '/documents',  status: 'soon',   notifiable: true,  desc: '規程・契約書等の管理' },
  { id: 'banking',      label: '銀行・融資管理',     icon: 'ti-building-bank', path: '/banking',   status: 'soon',   notifiable: true,  desc: '銀行口座・融資の管理' },
  { id: 'ai-assistant', label: 'AIアシスタント',     icon: 'ti-sparkles',     path: '/ai',         status: 'soon',   notifiable: false, desc: '準備中' },
  { id: 'system-admin', label: 'システム管理',       icon: 'ti-settings',     path: '/system',     status: 'soon',   notifiable: false, desc: 'システム全体設定' },
  { id: 'archive',      label: 'システムアーカイブ', icon: 'ti-archive',      path: '/archive',    status: 'soon',   notifiable: false, desc: '過去データの保管・参照' },
]

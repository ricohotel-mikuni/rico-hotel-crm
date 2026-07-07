// Tiles shown on the company Portal (`/`) — deliberately limited to
// what's used daily (v1.3 navigation redesign, approved proposal item
// ④). ダッシュボード／書類管理／銀行融資管理／システム管理／システム
// アーカイブ moved to 管理センター (see src/modules/admin/registry.js,
// gated to system_admin/ceo only) — ダッシュボード specifically was
// dropped rather than relocated; its role is now the brief summary at
// the top of AdminCenter.jsx instead of its own tile anywhere.
//
// IDs are deliberately distinct from src/modules/registry.js's IDs
// (that registry has its own 'documents', hence 'hq-documents' when
// it existed here) since useUnreadCounts() groups notifications by a
// flat `module` text column with no scope prefix — reusing an id
// across registries would make one module's badge bleed into the
// other's tile.
export const COMPANY_MODULES = [
  { id: 'hotels',       label: 'ホテル事業',         icon: 'ti-building-store', path: '/hotels',    status: 'active', notifiable: true,  desc: 'ホテル各拠点の管理' },
  { id: 'rentals',      label: '賃貸事業',           icon: 'ti-home',          path: '/rentals',    status: 'soon',   notifiable: true,  desc: '賃貸物件の管理' },
  { id: 'employees',    label: '社員管理',           icon: 'ti-users',        path: '/employees',  status: 'active', notifiable: false, desc: '社員情報・配属の管理' },
  { id: 'approvals',    label: '電子承認',           icon: 'ti-checkbox',     path: '/approvals',  status: 'active', notifiable: true,  desc: '購入・経費・休暇・稟議・契約の承認' },
  { id: 'ai-assistant', label: 'AIアシスタント',     icon: 'ti-sparkles',     path: '/ai',         status: 'soon',   notifiable: false, desc: '準備中' },
]

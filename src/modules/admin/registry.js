// 管理センター (/admin) — admin-only tiles/sidebar items, gated by
// isSystemAdmin/isCeo in AdminApp.jsx. `banking`/`hq-documents`/
// `system-admin`/`archive` are relocated here from
// src/modules/portal/registry.js (were company-Portal tiles before);
// `permissions`/`audit-logs`/`backup` are new. Reusing 'banking' etc.
// as ids is safe — they're moving out of COMPANY_MODULES, not
// duplicated across both registries at once.
export const ADMIN_MODULES = [
  { id: 'companies', label: '会社管理', icon: 'ti-building', path: '/companies', status: 'active', notifiable: false, desc: '会社の一覧・追加・編集・削除・切替' },
  { id: 'hotel-management', label: 'ホテル管理', icon: 'ti-building-store', path: '/hotel-management', status: 'active', notifiable: false, desc: 'ホテル一覧・追加・編集・削除・停止(統合ホテル管理モジュール)' },
  { id: 'common-masters', label: '共通マスター', icon: 'ti-list-details', path: '/common-masters', status: 'active', notifiable: false, desc: '事業・部署・役職・雇用区分の管理(SQL不要)' },
  { id: 'banking',      label: '銀行・融資管理',     icon: 'ti-building-bank', path: '/banking',     status: 'soon', notifiable: true,  desc: '借入一覧・返済予定・契約書・金融機関・担保・金利' },
  { id: 'hq-documents', label: '書類管理(全社)',     icon: 'ti-folder',        path: '/documents',   status: 'soon', notifiable: true,  desc: '会社・ホテル・賃貸・銀行・税務・契約・社員・マニュアル分類の横断検索' },
  { id: 'permissions',  label: '権限管理',           icon: 'ti-key',           path: '/permissions', status: 'soon', notifiable: false, desc: 'ロール・権限マトリクスの管理' },
  { id: 'audit-logs',   label: '監査ログ',           icon: 'ti-list-check',    path: '/audit-logs',  status: 'active', notifiable: false, desc: 'ログイン履歴の確認(操作履歴・変更履歴は今後拡張)' },
  { id: 'system-admin', label: 'システム管理',       icon: 'ti-settings',      path: '/system',      status: 'soon', notifiable: false, desc: 'システム全体の設定' },
  { id: 'archive',      label: 'システムアーカイブ', icon: 'ti-archive',       path: '/archive',     status: 'soon', notifiable: false, desc: '過去データの保管・参照' },
  { id: 'backup',       label: 'バックアップ',       icon: 'ti-database',      path: '/backup',      status: 'soon', notifiable: false, desc: 'データバックアップの管理' },
]

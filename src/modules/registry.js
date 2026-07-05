// Central registry of top-level system modules shown on the integrated home (Hub).
// To wire up a new module: build it under src/modules/<id>/, mount its route in
// App.jsx, then flip status to 'active' — Hub and the router both read from here.
export const MODULES = [
  { id: 'sales',       label: '営業管理',         icon: 'ti-building-store', path: '/sales',       status: 'active', desc: '営業先・案件・契約・成果報酬の管理' },
  { id: 'front',       label: 'フロント管理',     icon: 'ti-key',            path: '/front',       status: 'soon',   desc: 'チェックイン・チェックアウト・客室状況' },
  { id: 'payments',    label: '入金管理',         icon: 'ti-cash',           path: '/payments',    status: 'soon',   desc: '入金・売掛金の記録と消込' },
  { id: 'cashier',     label: 'キャッシャーレポート', icon: 'ti-report-money', path: '/cashier',    status: 'soon',   desc: '日次売上・レジ精算の集計' },
  { id: 'purchase',    label: '購入申請',         icon: 'ti-shopping-cart',  path: '/purchase',    status: 'soon',   desc: '備品・消耗品の購入申請と承認' },
  { id: 'expenses',    label: '経費精算',         icon: 'ti-receipt-2',      path: '/expenses',    status: 'soon',   desc: '経費申請と精算処理' },
  { id: 'maintenance', label: '修繕・故障管理',   icon: 'ti-tools',          path: '/maintenance', status: 'soon',   desc: '設備の修繕・故障対応の記録' },
  { id: 'documents',   label: '書類管理',         icon: 'ti-folder',        path: '/documents',   status: 'soon',   desc: '規程・マニュアル等の文書管理' },
  { id: 'shifts',      label: 'シフト管理',       icon: 'ti-calendar-time',  path: '/shifts',      status: 'soon',   desc: 'スタッフの勤務シフト作成・管理' },
  { id: 'staff',       label: 'スタッフ管理',     icon: 'ti-users',         path: '/staff',       status: 'soon',   desc: 'スタッフ情報・権限の管理' },
  { id: 'settings',    label: '設定',             icon: 'ti-settings',      path: '/settings',    status: 'soon',   desc: 'システム全体の設定' },
]

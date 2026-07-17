// Central registry of top-level system modules shown on the integrated home (Hub).
// To wire up a new module: build it under src/modules/<id>/, mount its route in
// App.jsx, then flip status to 'active' — Hub and the router both read from here.
//
// `notifiable: true` means the Hub shows a red unread-count badge for it,
// sourced from the `notifications` table (see useNotifications.js) filtered
// by `module` = this entry's `id`.
//
// `absolute: true` means `path` is a complete top-level route, not a
// segment relative to the current property's own base path — PropertyHub
// navigates to it directly instead of composing `brand.homePath + path`.
// Used by 'staff' below, which intentionally leaves this property's own
// brand scope to point at the company-wide employee master (社員は
// 大栄商事に一元管理 — ホテル側はスタッフを独自に持たず参照のみ).
//
// `color` — icon accent color for the dashboard KPI/launcher tiles
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.6」の配色指定)。他の
// 画面(会社ホームのModuleGrid等)は今のところこの値を読まないため、
// 追加しても既存表示には影響しない。
export const MODULES = [
  { id: 'sales',       label: '営業管理',         icon: 'ti-building-store', path: '/sales',       status: 'active', notifiable: true,  color: '#3A6DFF', desc: '営業先・案件・契約・成果報酬の管理' },
  { id: 'front',       label: 'フロント',         icon: 'ti-key',            path: '/front',       status: 'active', notifiable: true,  color: '#FFC107', desc: 'チェックイン・チェックアウト・客室状況' },
  { id: 'cleaning',    label: '清掃',             icon: 'ti-sparkles',       path: '/cleaning',    status: 'active', notifiable: true,  color: '#4CD964', desc: '客室清掃の状況管理' },
  { id: 'breakfast',   label: '朝食',             icon: 'ti-coffee',         path: '/breakfast',   status: 'active', notifiable: true,  color: '#FFC107', desc: '朝食対象者・提供状況の管理(メニュー・在庫・発注・原価は将来拡張)' },
  { id: 'dinner',      label: '夕食',             icon: 'ti-tools-kitchen-2', path: '/dinner',     status: 'soon',   notifiable: true,  color: '#F59E0B', desc: '夕食のメニュー・在庫・発注・原価・売上(将来拡張)' },
  { id: 'parking',     label: '駐車場',           icon: 'ti-car',            path: '/parking',     status: 'active', notifiable: true,  color: '#3A6DFF', desc: '駐車位置・宿泊者の駐車利用の管理' },
  { id: 'maintenance', label: '設備',             icon: 'ti-tools',          path: '/maintenance', status: 'soon',   notifiable: true,  color: '#8A96AC', desc: '設備の修繕・故障対応の記録' },
  { id: 'shifts',      label: 'シフト管理',       icon: 'ti-calendar-time',  path: '/shifts',      status: 'soon',   notifiable: true,  color: '#FFC107', desc: 'スタッフの勤務シフト作成・管理' },
  { id: 'payments',    label: '入金管理',         icon: 'ti-building-bank',  path: '/payments',    status: 'soon',   notifiable: true,  color: '#B366FF', desc: '入金・売掛金の記録と消込' },
  { id: 'cashier',     label: 'キャッシャーレポート', icon: 'ti-report-money', path: '/cashier',    status: 'soon',   notifiable: true,  color: '#B366FF', desc: '日次売上・レジ精算の集計' },
  { id: 'purchase',    label: '購入申請',         icon: 'ti-shopping-cart',  path: '/purchase',    status: 'soon',   notifiable: true,  color: '#4CD964', desc: '備品・消耗品の購入申請と承認' },
  { id: 'expenses',    label: '経費精算',         icon: 'ti-receipt-2',      path: '/expenses',    status: 'soon',   notifiable: true,  color: '#4CD964', desc: '経費申請と精算処理' },
  { id: 'documents',   label: '書類管理',         icon: 'ti-folder',        path: '/documents',   status: 'soon',   notifiable: true,  color: '#4CD964', desc: '規程・マニュアル等の文書管理(フロント分類)' },
  { id: 'staff',       label: '社員情報',         icon: 'ti-users',         path: '/employees',   status: 'active', notifiable: false, absolute: true, color: '#4CD964', desc: '大栄商事の社員管理を参照(参照のみ)' },
  { id: 'settings',    label: '拠点設定',         icon: 'ti-settings',      path: '/settings',    status: 'soon',   notifiable: false, color: '#8A96AC', desc: 'この拠点全体の設定' },
  { id: 'neo',         label: 'NEO',              icon: 'ti-robot',         path: '/neo',         status: 'soon',   notifiable: false, color: '#6BD1FF', desc: 'NEOの設定・カスタマイズ(将来拡張)' },
]

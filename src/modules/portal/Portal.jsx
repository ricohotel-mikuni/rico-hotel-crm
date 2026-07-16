import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '../../permissions/PermissionContext'
import { useUnreadCounts, useMyNotifications } from '../../hooks/useNotifications'
import { useApprovalRequests, useClients, useContracts } from '../../hooks/useData'
import HubShell from '../../layout/HubShell'
import { daiGreeting } from '../../ai/daiGreeting'
import { COMPANY_MODULES } from './registry'
import { DASH } from '../../lib/designSystem'
import { DarkPage, TodayCard, TodayCardTitle, KpiGrid, KpiCell, ChartGrid, ChartCard, DarkPanel } from '../../ui/DesignSystemKit'

// 拠点ダッシュボードで確立したDesign System v1.0(docs/ui-design-system.md、
// ERP開発憲章第37条)の第1弾展開先(会社ホーム)。TodayCard/KpiGrid/
// KpiCell/DarkPageはPropertyHub.jsxと同じsrc/ui/DesignSystemKit.jsxを
// literally importして使う(画面ごとに似たマークアップを個別に書かない
// という承認済み方針)。業務メニューのタイル一覧だけはPortal固有の
// レイアウト(カード内に説明文つき)のため、このファイル内に留めている。
// StatCard.jsx/ModuleGrid.jsxは他画面(ComingSoon等)からも参照される
// 共有コンポーネントのため、直接改造せずPortal専用マークアップに置き
// 換えている。会社ホームはタイル数が少ない(5枚)ため、サイドバーは
// 追加していない(承認済み提案書の判断)。天気・AI総合評価はホテル運営
// 固有の情報のため、簡略版のNEO TODAY(NEO+挨拶のみ)にしている。
// データ取得ロジック(未承認件数・新着通知)は変更していない。

// Not part of COMPANY_MODULES itself since it's conditionally shown —
// keeping it out of the plain array means there's no risk of it
// leaking to a non-admin by a future refactor that stops filtering.
const ADMIN_CENTER_TILE = {
  id: 'admin-center', label: '管理センター', icon: 'ti-shield', path: '/admin',
  status: 'active', notifiable: false, desc: '経営・システム管理機能(管理者専用)',
}

// グラフ・AI提案/ToDo(HotelOS Design System v1.0 §6.3、標準レイアウト
// HERO→KPI→グラフ→AI提案→ToDo→クイックメニュー)。
//
// Foundation v1.0是正(Dashboard実データ化): 「申請・承認件数推移」は
// 実データ(useApprovalRequests)から集計できるためダミーを廃止した
// (下記computeApprovalTrend参照)。「全社売上推移」は、実際に入金が
// 確定した売上を集計するテーブル(請求書・入金管理)がまだHotelOS
// に存在しない(cases.revenueは営業案件の見込み金額であり、確定売上
// ではないため代用すると数値の意味が変わってしまう)ため、正直に
// ダミーのまま残す — 請求/入金管理モジュール実装後に接続する。
const REVENUE_TREND = [
  { label: '4月', value: 8200000 }, { label: '5月', value: 8900000 }, { label: '6月', value: 9400000 },
]

function computeApprovalTrend(requests) {
  const now = new Date()
  return [2, 1, 0].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const count = requests.filter(r => {
      const rd = new Date(r.created_at)
      return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth()
    }).length
    return { label: `${d.getMonth() + 1}月`, value: count }
  })
}

const isToday = (iso) => {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

const NOTICES = ['未承認の申請が3件あります', '新規営業先が2件登録されました']
const SUGGESTIONS = ['月末に向けて経費精算の締切が近づいています']
const TODO_ITEMS = [
  { label: '購入申請の承認', priority: '高', color: DASH.orange },
  { label: '新規営業先のフォロー', priority: '中', color: DASH.gold },
]

export default function Portal() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isSystemAdmin, isCeo } = usePermissions()
  const unread = useUnreadCounts()
  const { requests } = useApprovalRequests()
  const { unreadCount } = useMyNotifications()
  const { clients } = useClients()
  const { contracts } = useContracts()

  const pendingApprovals = requests.filter(r => r.status === 'pending').length
  const newClientsToday = clients.filter(c => isToday(c.created_at)).length
  const newContractsToday = contracts.filter(c => isToday(c.created_at)).length
  const approvalTrend = computeApprovalTrend(requests)
  const tiles = (isSystemAdmin || isCeo) ? [...COMPANY_MODULES, ADMIN_CENTER_TILE] : COMPANY_MODULES

  // Foundation v1.0是正(Dashboard実データ化): 新規営業・新規契約は
  // 実データ(clients/contracts)から算出、dummyフラグを外した。
  // 今日の売上・今日のToDo・今日のシフト・AIからのお知らせは、
  // それぞれ請求/入金・タスク管理・シフト管理・AI通知生成のいずれも
  // まだHotelOSに実装が無く、実データ接続先が存在しないため
  // 正直にダミーのまま残す(捏造しない)。
  const kpis = [
    { icon: 'ti-checkbox', color: DASH.alert, label: '未承認件数', value: pendingApprovals, unit: '件' },
    { icon: 'ti-bell', color: DASH.gold, label: '新着通知', value: unreadCount, unit: '件' },
    { icon: 'ti-currency-yen', color: DASH.green, label: '今日の売上', value: '1,240', unit: '千円', dummy: true },
    { icon: 'ti-list-check', color: DASH.blue, label: '今日のToDo', value: '3', unit: '件', dummy: true },
    { icon: 'ti-building-store', color: DASH.purple, label: '新規営業', value: newClientsToday, unit: '件' },
    { icon: 'ti-file-check', color: DASH.orange, label: '新規契約', value: newContractsToday, unit: '件' },
    { icon: 'ti-calendar-time', color: DASH.gold, label: '今日のシフト', value: '8', unit: '名', dummy: true },
    { icon: 'ti-sparkles', color: DASH.green, label: 'AIからのお知らせ', value: '1', unit: '件', dummy: true },
  ]

  return (
    <HubShell>
      <DarkPage>
        <TodayCard>
          <TodayCardTitle title="NEO TODAY" daiExpr="talk" daiSize={70} />
          <div style={{ fontSize: 13, color: DASH.textSub, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {daiGreeting()}{profile?.full_name ? ` ${profile.full_name}さん` : ''}
          </div>
        </TodayCard>

        <KpiGrid>
          {kpis.map((k, i) => (
            <KpiCell key={i} icon={k.icon} color={k.color} label={k.label} value={k.value} unit={k.unit} dummy={k.dummy} />
          ))}
        </KpiGrid>

        <ChartGrid>
          <ChartCard title="全社売上推移" data={REVENUE_TREND} color={DASH.gold} unit="円" dummy />
          <ChartCard title="申請・承認件数推移" data={approvalTrend} color={DASH.blue} unit="件" />
        </ChartGrid>

        <div className="portal-panel-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, marginBottom: 30 }}>
          <DarkPanel title="🤖 NEOからのお知らせ・提案">
            {NOTICES.map((n, i) => (
              <div key={i} style={{ fontSize: 12, color: DASH.textSub, marginBottom: 7, paddingLeft: 14, position: 'relative', lineHeight: 1.6 }}>
                <span style={{ position: 'absolute', left: 0, color: DASH.gold }}>・</span>{n}
              </div>
            ))}
            <div style={{ fontSize: 11.5, fontWeight: 700, color: DASH.green, marginTop: 10, marginBottom: 8 }}>📈 AI分析・提案</div>
            {SUGGESTIONS.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: DASH.textSub, marginBottom: 7, paddingLeft: 14, position: 'relative', lineHeight: 1.6 }}>
                <span style={{ position: 'absolute', left: 0, color: DASH.gold }}>・</span>{s}
              </div>
            ))}
          </DarkPanel>
          <DarkPanel title="💡 今日やるべきこと(優先順位)">
            {TODO_ITEMS.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: DASH.gold, color: DASH.onGold, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, color: DASH.textSub, flex: 1 }}>{t.label}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: t.color, background: `color-mix(in srgb, ${t.color} 16%, transparent)`, padding: '3px 9px', borderRadius: 999, flexShrink: 0 }}>{t.priority}</span>
              </div>
            ))}
          </DarkPanel>
        </div>
        <style>{`
          @media (max-width: 720px) { .portal-panel-grid { grid-template-columns: 1fr !important; } }
        `}</style>

        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 14 }}>業務メニュー</div>
        <div className="dash-tile-grid">
          {tiles.map(m => {
            const soon = m.status !== 'active'
            const count = m.notifiable ? (unread[m.id] || 0) : 0
            return (
              <div key={m.id} className="dash-tile" onClick={() => navigate(m.path)}>
                {soon && <span className="dash-tile-soon">準備中</span>}
                {count > 0 && <span className="dash-tile-badge">{count > 99 ? '99+' : count}</span>}
                <div className="dash-tile-icon"><i className={`ti ${m.icon}`} style={{ fontSize: 20, color: DASH.gold }} /></div>
                <div className="dash-tile-name">{m.label}</div>
                <div className="dash-tile-desc">{m.desc}</div>
              </div>
            )
          })}
        </div>

        <style>{`
          .dash-tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px,1fr)); gap: 16px; }
          .dash-tile {
            background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 16px; padding: 24px; box-shadow: ${DASH.cardShadow};
            display: flex; flex-direction: column; gap: 12px; position: relative; cursor: pointer;
            transition: border-color .18s, transform .15s;
          }
          .dash-tile:active { transform: scale(.98); }
          @media (hover: hover) and (pointer: fine) {
            .dash-tile:hover { border-color: ${DASH.gold}; }
          }
          .dash-tile-icon { width: 42px; height: 42px; border-radius: 11px; background: rgba(212,175,55,.14); display: flex; align-items: center; justify-content: center; }
          .dash-tile-name { font-size: 14px; font-weight: 700; color: ${DASH.textMain}; }
          .dash-tile-desc { font-size: 11.5px; color: ${DASH.textFaint}; line-height: 1.5; }
          .dash-tile-soon { position: absolute; top: 14px; right: 14px; font-size: 9px; color: ${DASH.textFaint}; background: ${DASH.surface3}; padding: 3px 8px; border-radius: 999px; }
          .dash-tile-badge {
            position: absolute; top: 14px; right: 14px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
            background: ${DASH.alert}; color: #fff; font-size: 10.5px; font-weight: 700; line-height: 20px; text-align: center;
          }
        `}</style>
      </DarkPage>
    </HubShell>
  )
}

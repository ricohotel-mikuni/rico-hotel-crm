import { useNavigate } from 'react-router-dom'
import { useClients } from '../../../hooks/useData'
import { useCases } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Badge, AsyncBoundary, TableSkeleton } from '../../../ui'
import { today } from '../../../lib/constants'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, TodayCard, TodayCardTitle, KpiGrid, KpiCell, DarkPanel } from '../../../ui/DesignSystemKit'
import ModuleLauncher from '../../../ui/ModuleLauncher'

// クイックメニュー(承認済み提案書「Design System v1.0 最終統一提案」
// Item A) — 見積書・提案書は帳票テンプレート機能自体が未実装のため
// 'soon'(準備中)。新規営業先登録/案件追加/契約追加は各一覧画面への
// 導線のみ(一覧側の「新規登録」ボタンから登録する動線は既存のまま)。
const SALES_QUICK_ITEMS = [
  { id: 'new-client',   icon: 'ti-building-store',  label: '新規営業先登録', path: 'clients',   status: 'active' },
  { id: 'new-case',     icon: 'ti-clipboard-list',  label: '案件追加',       path: 'cases',      status: 'active' },
  { id: 'new-contract', icon: 'ti-file-check',      label: '契約追加',       path: 'contracts',  status: 'active' },
  { id: 'quote',        icon: 'ti-receipt',         label: '見積書',         path: '',           status: 'soon' },
  { id: 'proposal',     icon: 'ti-notes',           label: '提案書',         path: '',           status: 'soon' },
]

// 営業管理ホーム — Design System v1.0(docs/ui-design-system.md、ERP開発
// 憲章第37条)の適用第2弾。承認済み指示(「完成版ダッシュボードをベース
// テンプレートとして営業管理へ置き換える」「コンポーネントの一部流用
// ではなく世界観をそのまま展開する」)に基づき、PropertyHub.jsx/
// Portal.jsxと同じsrc/ui/DesignSystemKit.jsxを直接importして組み立てる
// — 独自にDASHやカードマークアップを再定義しない。データ取得
// (useClients/useCases)・フィルタ条件・AsyncBoundary/TableSkeletonに
// よるローディング制御・navigate()の遷移先は一切変更していない
// (相対パス — SalesAppはHotelsApp.jsx配下にネストされているため)。
// 既知の限界: TableSkeleton/Badge(src/ui/index.jsx)は他の未移行画面
// でも共有されているため今回はダーク化せず、ローディング中のみ一瞬
// 明るいスケルトンが表示される — 今後ダーク化対象画面が増えた段階で
// 改めて提案する。

function KpiIcon({ icon, color }) {
  return <i className={`ti ${icon}`} style={{ fontSize: 22, color }} />
}

export default function Home() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { clients, loading: cLoading, error: cError, refresh: cRefresh } = useClients()
  const { cases, loading: sLoading, error: sError, refresh: sRefresh } = useCases()

  const todayStr = today()
  const weekStr = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]

  const todayFollow = clients.filter(c => c.next_follow_date === todayStr)
  const weekFollow  = clients.filter(c => c.next_follow_date && c.next_follow_date <= weekStr && c.next_follow_date >= todayStr)
  const overdue     = clients.filter(c => c.next_follow_date && c.next_follow_date < todayStr)
  const won         = cases.filter(c => c.status === '成約')
  const wonRev      = won.reduce((s, c) => s + (c.revenue || 0), 0)
  const wonComm     = won.reduce((s, c) => s + (c.commission || 0), 0)

  // 相対パス(先頭スラッシュ無し) — この画面はSalesAppのネスト
  // ルート内('.../sales/'配下)にマウントされているため、絶対パス
  // ('/clients'等)を渡すとアプリのルート直下として解釈され、
  // どの拠点のURLにも一致せず /(会社ホーム)へ弾かれてしまう
  // (2026-07-09、実際に発生した不具合を修正)。
  const kpis = [
    { label: '今日のフォロー',   value: todayFollow.length, unit: '件', color: DASH.alert,  icon: 'ti-bell',           path: 'clients' },
    { label: '今週フォロー予定', value: weekFollow.length,  unit: '件', color: DASH.orange, icon: 'ti-calendar',       path: 'clients' },
    { label: '期限切れ案件',     value: overdue.length,     unit: '件', color: DASH.purple, icon: 'ti-alert-circle',   path: 'clients' },
    { label: '成約件数',         value: won.length,         unit: '件', color: DASH.green,  icon: 'ti-trophy',         path: 'cases'   },
    { label: '成約売上合計',     value: Math.round(wonRev / 10000), unit: '万円', color: DASH.gold, icon: 'ti-currency-yen',  path: 'cases'   },
    { label: '成果報酬合計',     value: Math.round(wonComm / 10000), unit: '万円', color: DASH.blue, icon: 'ti-coins',         path: 'commissions' },
    { label: '商談中案件',       value: cases.filter(c => c.status !== '成約' && c.status !== 'キャンセル').length, unit: '件', color: DASH.purple, icon: 'ti-briefcase', path: 'cases' },
    { label: '営業先総数',       value: clients.length,     unit: '社', color: DASH.blue,   icon: 'ti-building-store', path: 'clients' },
  ]

  return (
    <DarkPage>
      <TodayCard>
        <TodayCardTitle title="SALES TODAY" daiExpr="talk" daiSize={70} />
        <div style={{ fontSize: 13, color: DASH.textSub, lineHeight: 1.6 }}>
          こんにちは、{profile?.full_name || '—'} さん<br />
          リコホテル三国 営業管理システム — {todayStr}
        </div>
      </TodayCard>

      <AsyncBoundary loading={cLoading || sLoading} error={cError || sError} onRetry={() => { cRefresh(); sRefresh() }} skeleton={<TableSkeleton rows={4} columns={4} />}>
        <KpiGrid>
          {kpis.map(k => (
            <KpiCell key={k.label} icon={k.icon} color={k.color} label={k.label} value={k.value} unit={k.unit} onClick={() => navigate(k.path)} />
          ))}
        </KpiGrid>

        <div className="sales-today-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <DarkPanel title="🔔 今日のフォロー">
            {todayFollow.length === 0
              ? <div style={{ padding: '18px 0', textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>今日のフォロー予定はありません ✓</div>
              : todayFollow.map((c, i) => (
                <div key={c.id} onClick={() => navigate('clients')} className="sales-row" style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: DASH.textMain }}>{c.company}</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint }}>{c.contact}</div>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
          </DarkPanel>

          <DarkPanel title="⚠️ 期限切れ案件">
            {overdue.length === 0
              ? <div style={{ padding: '18px 0', textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>期限切れの案件はありません ✓</div>
              : overdue.slice(0, 5).map((c, i) => (
                <div key={c.id} onClick={() => navigate('clients')} className="sales-row" style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: DASH.alert }}>⚠ {c.company}</div>
                    <div style={{ fontSize: 11, color: DASH.textFaint }}>期限: {c.next_follow_date}</div>
                  </div>
                  <Badge status={c.rank} />
                </div>
              ))}
          </DarkPanel>
        </div>

        <DarkPanel title="📋 最近の営業先" action={<span style={{ color: DASH.green, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="ti ti-wifi" style={{ fontSize: 12 }} />リアルタイム同期中</span>}>
          {clients.slice(0, 6).map((c, i) => (
            <div key={c.id} onClick={() => navigate('clients')} className="sales-row" style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(212,175,55,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KpiIcon icon="ti-building-store" color={DASH.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DASH.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company}</div>
                <div style={{ fontSize: 11, color: DASH.textFaint }}>{c.contact} · {c.phone}</div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <Badge status={c.rank} />
                <Badge status={c.status} />
              </div>
            </div>
          ))}
        </DarkPanel>
      </AsyncBoundary>

      <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, margin: '24px 0 12px' }}>クイックメニュー</div>
      <ModuleLauncher modules={SALES_QUICK_ITEMS} onSelect={m => m.status === 'active' && navigate(m.path)} />

      <style>{`
        .sales-row {
          display: flex; align-items: center; justify-content: space-between; padding: 10px 0; cursor: pointer;
        }
        @media (max-width: 720px) {
          .sales-today-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DarkPage>
  )
}

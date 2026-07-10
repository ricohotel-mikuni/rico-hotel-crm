import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '../../permissions/PermissionContext'
import { useUnreadCounts, useMyNotifications } from '../../hooks/useNotifications'
import { useApprovalRequests } from '../../hooks/useData'
import HubShell from '../../layout/HubShell'
import { daiGreeting } from '../../ai/daiGreeting'
import { COMPANY_MODULES } from './registry'
import { DASH } from '../../lib/designSystem'
import { DarkPage, TodayCard, TodayCardTitle, KpiGrid, KpiCell } from '../../ui/DesignSystemKit'

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

export default function Portal() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isSystemAdmin, isCeo } = usePermissions()
  const unread = useUnreadCounts()
  const { requests } = useApprovalRequests()
  const { unreadCount } = useMyNotifications()

  const pendingApprovals = requests.filter(r => r.status === 'pending').length
  const tiles = (isSystemAdmin || isCeo) ? [...COMPANY_MODULES, ADMIN_CENTER_TILE] : COMPANY_MODULES

  const kpis = [
    { icon: 'ti-checkbox', color: DASH.alert, label: '未承認件数', value: pendingApprovals, unit: '件' },
    { icon: 'ti-bell', color: DASH.gold, label: '新着通知', value: unreadCount, unit: '件' },
    { icon: 'ti-currency-yen', color: DASH.green, label: '今日の売上', value: '1,240', unit: '千円', dummy: true },
    { icon: 'ti-list-check', color: DASH.blue, label: '今日のToDo', value: '3', unit: '件', dummy: true },
    { icon: 'ti-building-store', color: DASH.purple, label: '新規営業', value: '2', unit: '件', dummy: true },
    { icon: 'ti-file-check', color: DASH.orange, label: '新規契約', value: '1', unit: '件', dummy: true },
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
            background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 16px; padding: 20px;
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
          .dash-tile-soon { position: absolute; top: 14px; right: 14px; font-size: 9px; color: ${DASH.textFaint}; background: rgba(255,255,255,.06); padding: 3px 8px; border-radius: 999px; }
          .dash-tile-badge {
            position: absolute; top: 14px; right: 14px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
            background: #E53935; color: #fff; font-size: 10.5px; font-weight: 700; line-height: 20px; text-align: center;
          }
        `}</style>
      </DarkPage>
    </HubShell>
  )
}

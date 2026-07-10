import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '../../permissions/PermissionContext'
import { useUnreadCounts, useMyNotifications } from '../../hooks/useNotifications'
import { useApprovalRequests } from '../../hooks/useData'
import HubShell from '../../layout/HubShell'
import Dai from '../../ai/Dai'
import { daiGreeting } from '../../ai/daiGreeting'
import { COMPANY_MODULES } from './registry'

// 拠点ダッシュボードで確立したDesign System v1.0(docs/ui-design-system.md、
// ERP開発憲章第37条)の第1弾展開先(会社ホーム)。配色トークン・KPI
// グリッド・タイルはPropertyHub.jsxと同じパターンをこのファイル内だけで
// 再現する — StatCard.jsx/ModuleGrid.jsxは他画面(ComingSoon等)からも
// 参照される共有コンポーネントのため、直接改造せずPortal専用マーク
// アップに置き換えている。会社ホームはタイル数が少ない(5枚)ため、
// サイドバーは追加していない(承認済み提案書の判断)。天気・AI総合評価は
// ホテル運営固有の情報のため、簡略版のNEO TODAY(NEO+挨拶のみ)にして
// いる。データ取得ロジック(未承認件数・新着通知)は変更していない。
const DASH = {
  bg: '#071C3A',
  card: '#0F2A4D',
  border: '#1A2A4A',
  gold: '#D4AF37',
  textMain: '#FFFFFF',
  textSub: '#C7D0E0',
  textFaint: '#8A96AC',
}

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
    { icon: 'ti-checkbox', color: '#ff8a7a', label: '未承認件数', value: pendingApprovals, unit: '件' },
    { icon: 'ti-bell', color: DASH.gold, label: '新着通知', value: unreadCount, unit: '件' },
    { icon: 'ti-currency-yen', color: '#4CD964', label: '今日の売上', value: '1,240', unit: '千円', dummy: true },
    { icon: 'ti-list-check', color: '#3A6DFF', label: '今日のToDo', value: '3', unit: '件', dummy: true },
    { icon: 'ti-building-store', color: '#B366FF', label: '新規営業', value: '2', unit: '件', dummy: true },
    { icon: 'ti-file-check', color: '#F59E0B', label: '新規契約', value: '1', unit: '件', dummy: true },
    { icon: 'ti-calendar-time', color: DASH.gold, label: '今日のシフト', value: '8', unit: '名', dummy: true },
    { icon: 'ti-sparkles', color: '#4CD964', label: 'AIからのお知らせ', value: '1', unit: '件', dummy: true },
  ]

  return (
    <HubShell>
      <div style={{ background: DASH.bg, minHeight: '100%' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px 56px' }}>

          <div className="neo-today-card">
            <Dai expr="talk" size={70} />
            <div>
              <div className="neo-today-title">NEO TODAY</div>
              <div className="neo-today-line">{daiGreeting()}{profile?.full_name ? ` ${profile.full_name}さん` : ''}</div>
            </div>
          </div>

          <div className="dash-kpi-grid">
            {kpis.map((k, i) => (
              <div key={i} className="kpi-cell">
                {k.dummy && <span className="kpi-dummy">ダミー</span>}
                <i className={`ti ${k.icon}`} style={{ fontSize: 22, color: k.color }} />
                <div className="kpi-lbl">{k.label}</div>
                <div className="kpi-val">{k.value}<small>{k.unit}</small></div>
              </div>
            ))}
          </div>

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
        </div>

        <style>{`
          .neo-today-card {
            background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 22px 24px;
            display: flex; align-items: center; gap: 18px; margin-bottom: 24px; flex-wrap: wrap;
          }
          .neo-today-title { font-size: 16px; color: ${DASH.gold}; font-weight: 700; margin-bottom: 4px; }
          .neo-today-line { font-size: 13px; color: ${DASH.textSub}; line-height: 1.6; white-space: pre-line; }

          .dash-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
          @media (max-width: 1180px) and (min-width: 760px) { .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 759px) { .dash-kpi-grid { grid-template-columns: 1fr; } }
          .kpi-cell { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; position: relative; }
          .kpi-dummy { position: absolute; top: 10px; right: 12px; font-size: 9px; color: ${DASH.textFaint}; font-weight: 700; }
          .kpi-lbl { font-size: 10.5px; color: ${DASH.textFaint}; margin: 8px 0 2px; }
          .kpi-val { font-size: 18px; font-weight: 700; color: ${DASH.textMain}; }
          .kpi-val small { font-size: 10px; font-weight: 500; color: ${DASH.textFaint}; margin-left: 2px; }

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
      </div>
    </HubShell>
  )
}

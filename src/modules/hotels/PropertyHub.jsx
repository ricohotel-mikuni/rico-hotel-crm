import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useBrand } from '../../branding/BrandContext'
import ModuleGrid from '../../ui/ModuleGrid'
import StatCard from '../../ui/StatCard'
import Dai from '../../ai/Dai'
import { daiGreeting } from '../../ai/daiGreeting'
import { MODULES } from '../registry'
import { C, today } from '../../lib/constants'

const TODO_ITEMS = [
  { label: '203号室 エアコン故障対応', priority: '緊急', color: '#C62828' },
  { label: 'A株式会社 営業フォロー', priority: '高', color: '#E65100' },
  { label: '楽天口コミ返信 3件', priority: '中', color: '#B4933D' },
  { label: '朝食食材が不足する可能性あり', priority: '中', color: '#B4933D' },
  { label: 'VIPチェックイン 17:00(山田様)', priority: '中', color: '#B4933D' },
]

const SUGGESTIONS = [
  '土曜日の宿泊料金を+1,000円に設定すると、利益が約12%向上する可能性があります。',
  '楽天の口コミ返信を優先すると、評価改善が期待できます。',
  '清掃の遅延が発生しやすい時間帯を予測しています。',
]

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)— 「AI Today」実装
// 指示書(簡易版)に基づき、DAIの挨拶+当日の優先度サマリーをホーム最上部
// に追加した。既存の持続的サイドバー(HotelsApp.jsx の SidebarShell +
// buildPropertyNavGroups)をそのまま使うため、新しいナビゲーションは
// 増やしていない(ERP開発憲章第7条・第8条: 画面設計の一貫性)。
//
// 下記の指標(売上・稼働率・チェックイン等)は、対応するフロント/清掃/
// 朝食/夕食モジュールが未実装のため、現時点では実データを持たない。
// AI開発憲章第12条に基づき、既存のStatCard「ダミー」表示を流用して
// サンプルであることを明示している — 対応モジュール実装後、順次
// 実データへ切り替える(役割別AI Today提案・データ可否一覧を参照)。
export default function PropertyHub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const brand = useBrand()
  const unread = useUnreadCounts()

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 56px' }}>

      <div style={{
        background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 65%, #2E5FA3 140%)`,
        borderRadius: 16, padding: '22px 24px', marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <Dai expr="normal" size={92} />
        <div style={{
          background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)',
          borderRadius: 14, padding: '12px 16px', flex: 1, minWidth: 220,
        }}>
          <div style={{ fontSize: 11, color: '#D9BE72', letterSpacing: 1, marginBottom: 3, fontWeight: 700 }}>
            DAI TODAY
          </div>
          <div style={{ fontSize: 13, color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {daiGreeting()}{profile?.full_name ? ` ${profile.full_name}さん` : ''}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#B9C6DF', whiteSpace: 'nowrap' }}>{today()}</div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10,
        marginBottom: 8,
      }}>
        <StatCard icon="ti-currency-yen" label="本日の売上" value="548,000" unit="円" color={C.navy} dummy />
        <StatCard icon="ti-door-enter" label="チェックイン" value="27" unit="件" color="#009688" dummy />
        <StatCard icon="ti-door-exit" label="チェックアウト" value="25" unit="件" color="#6A1B9A" dummy />
        <StatCard icon="ti-chart-donut" label="稼働率(本日)" value="92" unit="%" color="#00838F" dummy />
        <StatCard icon="ti-brush" label="清掃待ち客室" value="4" unit="室" color="#5C6BC0" dummy />
        <StatCard icon="ti-message-circle" label="レビュー返信" value="3" unit="件" color="#C62828" dummy />
        <StatCard icon="ti-coffee" label="朝食予測" value="43" unit="食" color="#B4933D" dummy />
        <StatCard icon="ti-crown" label="VIP宿泊者" value="2" unit="名" color={C.gold} dummy />
      </div>
      <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 22 }}>
        ※ 上記はサンプル表示です。フロント・清掃・朝食・夕食モジュール実装後、順次実データへ切り替わります。
      </div>

      <div className="dai-today-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 26 }}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 10 }}>今日やるべきこと(優先順位別)</div>
          {TODO_ITEMS.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid #F0F2F4' : 'none' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', background: `${C.gold}22`, color: C.gold,
                fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, color: '#37474F', flex: 1 }}>{t.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.color, background: `${t.color}18`, padding: '2px 9px', borderRadius: 999 }}>
                {t.priority}
              </span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-bulb" style={{ color: C.gold }} />DAIからの提案
          </div>
          {SUGGESTIONS.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: '#607D8B', marginBottom: 9, paddingLeft: 14, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: C.gold }}>・</span>{s}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .dai-today-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#90A4AE', marginBottom: 30 }}>
        DAIはあなたの業務をサポートします。何でも聞いてください！
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>WELCOME</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
          こんにちは、{profile?.full_name || '—'} さん
        </h1>
        <div style={{ fontSize: 13, color: '#90A4AE' }}>ご利用になる管理メニューを選択してください</div>
      </div>

      <ModuleGrid modules={MODULES} unreadCounts={unread} onSelect={m => navigate(m.absolute ? m.path : brand.homePath + m.path)} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useBrand } from '../../branding/BrandContext'
import ModuleGrid from '../../ui/ModuleGrid'
import KpiCard from '../../ui/KpiCard'
import Dai from '../../ai/Dai'
import { dailyPick } from '../../ai/daiGreeting'
import { MODULES } from '../registry'
import { C, today } from '../../lib/constants'

const TODO_ITEMS = [
  { label: '203号室 エアコン故障対応', priority: '緊急', color: C.red },
  { label: 'A株式会社 営業フォロー', priority: '高', color: C.navy },
  { label: '楽天口コミ返信 3件', priority: '中', color: C.gold },
  { label: '朝食食材が不足する可能性あり', priority: '中', color: C.gold },
  { label: 'VIPチェックイン 17:00(山田様)', priority: '中', color: C.gold },
]

const SUGGESTIONS = [
  '土曜日の宿泊料金を+1,000円に設定すると、利益が約12%向上する可能性があります。',
  '楽天の口コミ返信を優先すると、評価改善が期待できます。',
  '清掃の遅延が発生しやすい時間帯を予測しています。',
]

// NEOの一言 — 日付をシードに選ぶことで「毎日コメントが変わる」演出
// (承認済み提案書Ver.2 ⑩)。乱数ではないので同じ日に開き直しても
// ぶれない。実データが無い項目はチェックリスト側で明示する。
const OPENERS = ['おはようございます。', 'おはようございます、今日も一日よろしくお願いします。', 'おはようございます、本日も張り切っていきましょう。']
const CLOSERS = ['優先順位順に並べました。', '気になる点から順にまとめています。', 'まずはこちらからご確認ください。']
const CHECK_ITEMS = ['チェックイン27件', '清掃4室', '未承認3件', 'VIP2組']

const KPIS = [
  { label: '本日の売上', value: '548,000', unit: '円', delta: 12, trend: [420, 460, 440, 500, 480, 530, 548], color: C.navy },
  { label: 'チェックイン', value: '27', unit: '件', delta: 5, trend: [21, 23, 22, 25, 24, 26, 27] },
  { label: '稼働率', value: '92', unit: '%', delta: 3, deltaUnit: 'pt', trend: [85, 86, 88, 87, 89, 90, 92] },
  { label: '清掃待ち客室', value: '4', unit: '室', delta: -2, trend: [8, 7, 6, 6, 5, 5, 4] },
  { label: '未承認', value: '3', unit: '件', delta: 3, trend: [0, 0, 1, 1, 2, 2, 3], alert: true },
]

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)— 「AI Today」実装
// (承認済み提案書Ver.2)。開いた瞬間は「NEOがデータを分析しています」
// を短く見せてから、チャット風の吹き出しで要約+チェックリストを話し
// かける構成にした — ホーム画面は一覧ではなく「今日の判断材料」を
// 提示する場、という方針に沿って、数値カードは8枚から5枚(前日比+
// スパークライン付き)に絞っている。既存の持続的サイドバー(HotelsApp.jsx
// の SidebarShell + buildPropertyNavGroups)をそのまま使うため、新しい
// ナビゲーションは増やしていない(ERP開発憲章第7条・第8条)。
//
// 下記の指標(売上・稼働率・チェックイン等)は、対応するフロント/清掃/
// 朝食/夕食モジュールが未実装のため、現時点では実データを持たない。
// AI開発憲章第12条に基づき「ダミー」表示で明示している — 対応モジュール
// 実装後、順次実データへ切り替える。
export default function PropertyHub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const brand = useBrand()
  const unread = useUnreadCounts()
  const [analyzing, setAnalyzing] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setAnalyzing(false), 1100)
    return () => clearTimeout(t)
  }, [])

  const opener = dailyPick(OPENERS)
  const closer = dailyPick(CLOSERS, 1)

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 64px' }}>

      {analyzing ? (
        <div style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 65%, #2E5FA3 140%)`,
          borderRadius: 18, padding: '26px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 14, color: '#fff', fontSize: 13,
        }}>
          <Dai expr="normal" size={44} />
          <span>
            NEOがデータを分析しています
            <span className="neo-analyzing-dots">
              <span /><span /><span />
            </span>
          </span>
          <style>{`
            .neo-analyzing-dots { display: inline-flex; gap: 4px; margin-left: 8px; }
            .neo-analyzing-dots span { width: 6px; height: 6px; border-radius: 50%; background: ${C.gold}; display: inline-block; animation: neoDotPulse 1.1s ease-in-out infinite; }
            .neo-analyzing-dots span:nth-child(2) { animation-delay: .15s; }
            .neo-analyzing-dots span:nth-child(3) { animation-delay: .3s; }
            @keyframes neoDotPulse { 0%,80%,100% { opacity: .25; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.15); } }
            @media (prefers-reduced-motion: reduce) { .neo-analyzing-dots span { animation: none; } }
          `}</style>
        </div>
      ) : (
        <div className="neo-chat-fade" style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 65%, #2E5FA3 140%)`,
          borderRadius: 18, padding: '24px 26px', marginBottom: 28,
          display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
        }}>
          <Dai expr="talk" size={68} />
          <div style={{
            background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.16)',
            borderRadius: '4px 16px 16px 16px', padding: '14px 18px', flex: 1, minWidth: 220,
          }}>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: 1, marginBottom: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              🤖 NEO
            </div>
            <div style={{ fontSize: 13.5, color: '#fff', marginBottom: 10 }}>
              {opener}{profile?.full_name ? `${profile.full_name}さん、` : ''}本日は
            </div>
            <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'grid', gap: 6 }}>
              {CHECK_ITEMS.map((t, i) => (
                <li key={i} style={{ fontSize: 13, color: '#eef1f6', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: C.gold, fontSize: 11 }}>✔</span>{t}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: '#cfd9ec' }}>{closer}</div>
          </div>
          <style>{`
            .neo-chat-fade { animation: neoChatFadeIn .5s ease; }
            @keyframes neoChatFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @media (prefers-reduced-motion: reduce) { .neo-chat-fade { animation: none; } }
          `}</style>
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 18,
        marginBottom: 10,
      }}>
        {KPIS.map((k, i) => <KpiCard key={i} {...k} dummy />)}
      </div>
      <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 34 }}>
        ※ 上記はサンプル表示です。フロント・清掃・朝食・夕食モジュール実装後、順次実データへ切り替わります。
      </div>

      <div className="dai-today-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 34 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 12 }}>今日やるべきこと(優先順位別)</div>
          {TODO_ITEMS.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i > 0 ? '1px solid #F0F2F4' : 'none' }}>
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

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-bulb" style={{ color: C.gold }} />NEOからの提案
          </div>
          {SUGGESTIONS.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: '#607D8B', marginBottom: 10, paddingLeft: 14, position: 'relative' }}>
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

      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#90A4AE', marginBottom: 36 }}>
        NEOはあなたの業務をサポートします。何でも聞いてください！
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>WELCOME</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
          こんにちは、{profile?.full_name || '—'} さん
        </h1>
        <div style={{ fontSize: 13, color: '#90A4AE' }}>ご利用になる管理メニューを選択してください — {today()}</div>
      </div>

      <ModuleGrid modules={MODULES} unreadCounts={unread} onSelect={m => navigate(m.absolute ? m.path : brand.homePath + m.path)} />
    </div>
  )
}

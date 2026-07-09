import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useBrand } from '../../branding/BrandContext'
import ModuleLauncher from '../../ui/ModuleLauncher'
import Dai from '../../ai/Dai'
import { dailyPick } from '../../ai/daiGreeting'
import { MODULES } from '../registry'
import { C } from '../../lib/constants'

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
// ぶれない。実データが無い項目はKPI側で明示する。
const OPENERS = ['おはようございます！', 'おはようございます、今日も一日よろしくお願いします。', 'おはようございます、本日も張り切っていきましょう。']
const CLOSERS = ['本日も業務をサポートします。', '気になる点があればいつでも聞いてくださいね。', '今日も一緒に頑張りましょう。']

// KPIをNEO TODAYカードへ統合(承認済み提案書「拠点ダッシュボードUI改善
// Ver.6」②③④) — 「NEOがリアルタイムでホテル状況を教えてくれる」という
// コンセプトのため、独立したカード群ではなくNEOの右側に直接並べる。
// アイコン色は添付イメージの指定通り。
const KPIS = [
  { icon: 'ti-chart-line',        color: '#FFC107', label: '本日の売上+稼働率', value: '¥548,000', sub: '稼働率 92%' },
  { icon: 'ti-door-enter',        color: '#4CD964', label: 'チェックイン',      value: '27',    unit: '件' },
  { icon: 'ti-door-exit',         color: '#B366FF', label: 'チェックアウト',    value: '25',    unit: '件' },
  { icon: 'ti-brush',             color: '#F59E0B', label: '清掃待ち',          value: '20 / 44', unit: '部屋' },
  { icon: 'ti-car',               color: '#3A6DFF', label: '駐車場',            value: '1 / 10',  unit: '台' },
  { icon: 'ti-coffee',            color: '#4CD964', label: '朝食予定+稼働率',   value: '43',    unit: '食', sub: '稼働率 92%' },
  { icon: 'ti-tools-kitchen-2',   color: '#F59E0B', label: '夕食+稼働率',       value: '18',    unit: '食', sub: '稼働率 92%' },
]

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)— 「NEO TODAY」実装
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.5/Ver.6」)。開いた瞬間は
// 「NEOがデータを分析しています」を短く見せてから、NEO TODAYカード
// (NEO+挨拶+KPI7項目を1枚に統合)を表示する — KPIは独立したカード群では
// なくNEOが直接語りかける情報として配置している。既存の持続的サイドバー
// (HotelsApp.jsx の SidebarShell + buildPropertyNavGroups)をそのまま
// 使うため、新しいナビゲーションは増やしていない(ERP開発憲章第7条・
// 第8条)。
//
// 下記の指標(売上・稼働率・チェックイン等)は、対応するフロント/清掃/
// 朝食/夕食モジュールが未実装のため、現時点では実データを持たない。
// AI開発憲章第12条に基づき明示する必要があるため、末尾に注記を残して
// いる — 対応モジュール実装後、順次実データへ切り替える。
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
        <div className="neo-today-fade neo-today-card" style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 65%, #2E5FA3 140%)`,
        }}>
          <div className="neo-today-left">
            <Dai expr="talk" size={104} />
            <div>
              <div className="neo-today-title">NEO TODAY</div>
              <div className="neo-today-line">
                {opener}<br/>私はNEOです。{profile?.full_name ? `${profile.full_name}さん、` : ''}<br/>{closer}
              </div>
            </div>
          </div>

          <div className="neo-kpi-grid">
            {KPIS.map((k, i) => (
              <div key={i} className="neo-kpi">
                <i className={`ti ${k.icon}`} style={{ fontSize: 24, color: k.color, marginBottom: 6 }} />
                <div className="neo-kpi-lbl">{k.label}</div>
                <div className="neo-kpi-val">{k.value}{k.unit && <small>{k.unit}</small>}</div>
                {k.sub && <div className="neo-kpi-sub">{k.sub}</div>}
              </div>
            ))}
          </div>

          <style>{`
            .neo-today-fade { animation: neoChatFadeIn .5s ease; }
            @keyframes neoChatFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @media (prefers-reduced-motion: reduce) { .neo-today-fade { animation: none; } }
            .neo-today-card {
              border-radius: 18px; padding: 26px; margin-bottom: 12px;
              display: flex; gap: 26px; align-items: center; flex-wrap: wrap;
            }
            .neo-today-left { display: flex; align-items: center; gap: 18px; flex-shrink: 0; }
            .neo-today-title { font-size: 17px; color: ${C.gold}; font-weight: 700; margin-bottom: 8px; letter-spacing: .5px; }
            .neo-today-line { font-size: 13.5px; color: #fff; line-height: 1.7; }
            .neo-kpi-grid { flex: 1; min-width: 320px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px 10px; }
            .neo-kpi { display: flex; flex-direction: column; padding: 0 8px; border-left: 1px solid rgba(255,255,255,.12); }
            .neo-kpi:nth-child(4n+1) { border-left: none; }
            .neo-kpi-lbl { font-size: 10.5px; color: #B9C6DF; margin-bottom: 2px; }
            .neo-kpi-val { font-size: 19px; font-weight: 700; color: #fff; }
            .neo-kpi-val small { font-size: 10px; font-weight: 500; color: #B9C6DF; margin-left: 2px; }
            .neo-kpi-sub { font-size: 11px; color: ${C.gold}; font-weight: 700; }
            @media (max-width: 720px) { .neo-kpi-grid { grid-template-columns: repeat(2, 1fr); } .neo-kpi:nth-child(4n+1) { border-left: 1px solid rgba(255,255,255,.12); } .neo-kpi:nth-child(2n+1) { border-left: none; } }
          `}</style>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 30 }}>
        ※ 上記はサンプル表示です。フロント・清掃・朝食・夕食・駐車場モジュール実装後、順次実データへ切り替わります。
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

      <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 12 }}>業務メニュー</div>
      <ModuleLauncher modules={MODULES} unreadCounts={unread} onSelect={m => navigate(m.absolute ? m.path : brand.homePath + m.path)} />
    </div>
  )
}

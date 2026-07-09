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

// 優先度「低」を追加(承認済み提案書「拠点ダッシュボードUI改善 Ver.7」⑥)。
const TODO_ITEMS = [
  { label: '203号室 エアコン故障対応', priority: '緊急', color: C.red },
  { label: 'VIPチェックイン 17:00(山田様)', priority: '高', color: C.navy },
  { label: '楽天口コミ返信 3件', priority: '中', color: C.gold },
  { label: '朝食食材が不足する可能性あり', priority: '中', color: C.gold },
  { label: 'A株式会社 営業フォロー', priority: '低', color: '#8A96AC' },
]

// 「NEOからのお知らせ・提案」— 旧「NEOインサイト」を廃止し、お知らせ／
// AI分析・提案／AI予測の3セクションへ統合(承認済み提案書Ver.7④⑤)。
const NOTICES = [
  '未承認が3件あります',
  'VIPのお客様は17:00到着予定です',
  '朝食の在庫が不足する可能性があります',
]
const SUGGESTIONS = [
  '楽天口コミ返信を優先すると、評価改善が期待できます',
  '土曜日の宿泊料金を+1,000円に設定すると、利益が約12%向上する見込みです',
  '清掃スタッフを1名追加すると、清掃完了までの時間が短縮されます',
]
const FORECAST = { value: '¥612,000', rate: '89%', note: '現在のペースで推移した場合の、本日の売上予測です' }

// NEOの一言・AI総合評価 — 日付をシードに選ぶことで「毎日コメントが
// 変わる」演出(承認済み提案書Ver.2 ⑩)。乱数ではないので同じ日に開き
// 直しても表示がぶれない。
const OPENERS = ['おはようございます！', 'おはようございます、今日も一日よろしくお願いします。', 'おはようございます、本日も張り切っていきましょう。']
const CLOSERS = ['本日も業務をサポートします。', '気になる点があればいつでも聞いてくださいね。', '今日も一緒に頑張りましょう。']
const RATINGS = [
  { stars: 4, note: '今日は比較的余裕があります。15時〜17時のみ混雑が予想されます。' },
  { stars: 3, note: '本日はやや慌ただしい一日になりそうです。優先順位を意識して進めましょう。' },
  { stars: 5, note: '今日は全体的に落ち着いた一日になりそうです。' },
]
const WEATHER = { date: '2025年5月20日(火)', text: '晴れ 23℃/15℃' }

// クイックメニューに出す項目(承認済み提案書Ver.7⑦) — MODULES全体では
// なく、日常的によく使う9項目だけの厳選版。サイドバーは引き続き
// MODULES全項目を網羅しているため、ここに出ない項目も導線を失わない。
const QUICK_MENU_IDS = ['front', 'cleaning', 'breakfast', 'dinner', 'parking', 'maintenance', 'shifts', 'payments', 'cashier']

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)— 「NEO TODAY」実装
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.5〜Ver.7」)。開いた
// 瞬間は「NEOがデータを分析しています」を短く見せてから、NEO TODAY
// カード(NEO+挨拶+AI総合評価+KPI7項目を1枚に統合)を表示する — KPIは
// 独立したカード群ではなくNEOが直接語りかける情報として配置している。
// 既存の持続的サイドバー(HotelsApp.jsx の SidebarShell +
// buildPropertyNavGroups)をそのまま使うため、新しいナビゲーションは
// 増やしていない(ERP開発憲章第7条・第8条)。
//
// 下記の指標(売上・稼働率・チェックイン・天気等)は、対応するフロント/
// 清掃/朝食/夕食/駐車場モジュールや外部気象APIが未実装のため、現時点
// では実データを持たない。AI開発憲章第12条に基づき明示する必要がある
// ため、末尾に注記を残している — 対応モジュール実装後、順次実データへ
// 切り替える。
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
  const rating = dailyPick(RATINGS, 2)
  const quickMenuModules = MODULES.filter(m => QUICK_MENU_IDS.includes(m.id))

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 64px' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: '0 0 4px' }}>
            おはようございます、{profile?.full_name || '—'}さん！
          </h1>
          <div style={{ fontSize: 12.5, color: '#90A4AE' }}>本日も{brand.shortNameJa || brand.name}の業務をサポートします。</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, color: '#90A4AE', lineHeight: 1.7 }}>
          <div>{WEATHER.date}</div>
          <div>☀️ <b style={{ color: '#607D8B' }}>{WEATHER.text}</b> <span style={{ fontSize: 9, color: '#B0BEC5' }}>(ダミー)</span></div>
        </div>
      </div>

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
            <div className="neo-today-head">
              <Dai expr="talk" size={90} />
              <div className="neo-today-title">NEO TODAY</div>
            </div>
            <div className="neo-today-line">
              {opener}私はNEOです。{profile?.full_name ? `${profile.full_name}さん、` : ''}{closer}
            </div>
            <div className="neo-rating-box">
              <div className="neo-rating-label"><i className="ti ti-chart-line" style={{ color: C.gold }} />AI総合評価</div>
              <div className="neo-rating-stars">{'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}</div>
              <div className="neo-rating-note">{rating.note}</div>
            </div>
          </div>

          <div className="neo-kpi-grid">
            <KpiCell icon="ti-chart-line" color="#FFC107" label="本日の売上+稼働率" value="¥548,000" sub="稼働率 92%" />
            <KpiCell icon="ti-door-enter" color="#4CD964" label="チェックイン" value="27" unit="件" />
            <KpiCell icon="ti-door-exit" color="#B366FF" label="チェックアウト" value="25" unit="件" />
            <KpiCell icon="ti-brush" color="#F59E0B" label="清掃待ち" value="20 / 44" unit="部屋" />
            <KpiCell icon="ti-car" color="#3A6DFF" label="駐車場" value="1 / 10" unit="台" />
            <KpiCell icon="ti-coffee" color="#4CD964" label="朝食予定+稼働率" value="43" unit="食" sub="稼働率 92%" />
            <KpiCell icon="ti-tools-kitchen-2" color="#F59E0B" label="夕食予定+稼働率" value="18" unit="食" sub="稼働率 92%" />
          </div>

          <style>{`
            .neo-today-fade { animation: neoChatFadeIn .5s ease; }
            @keyframes neoChatFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @media (prefers-reduced-motion: reduce) { .neo-today-fade { animation: none; } }
            .neo-today-card {
              border-radius: 20px; padding: 28px; margin-bottom: 12px;
              display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap;
            }
            .neo-today-left { display: flex; flex-direction: column; gap: 16px; flex: 1; min-width: 260px; max-width: 300px; }
            .neo-today-head { display: flex; align-items: center; gap: 14px; }
            .neo-today-title { font-size: 17px; color: ${C.gold}; font-weight: 700; letter-spacing: .5px; }
            .neo-today-line { font-size: 13px; color: #D6DBE7; line-height: 1.75; }
            .neo-rating-box { background: rgba(255,255,255,.06); border-radius: 14px; padding: 14px 16px; }
            .neo-rating-label { font-size: 11px; color: #B9C6DF; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
            .neo-rating-stars { color: ${C.gold}; font-size: 15px; letter-spacing: 2px; margin-bottom: 6px; }
            .neo-rating-note { font-size: 11.5px; color: #D6DBE7; line-height: 1.6; }
            .neo-kpi-grid { flex: 2.2; min-width: 320px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
            @media (max-width: 720px) { .neo-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
          `}</style>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 30 }}>
        ※ 上記はサンプル表示です。フロント・清掃・朝食・夕食・駐車場モジュール実装後、順次実データへ切り替わります。
      </div>

      <div className="dai-today-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 20, marginBottom: 34 }}>
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>今日やるべきこと(優先順)</div>
            <div style={{ marginLeft: 'auto', fontSize: 11.5, color: C.gold, fontWeight: 600, cursor: 'pointer' }}>もっと見る ›</div>
          </div>
          {TODO_ITEMS.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i > 0 ? '1px solid #F0F2F4' : 'none' }}>
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

        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>NEOからのお知らせ・提案</div>
            <div style={{ marginLeft: 'auto', fontSize: 11.5, color: C.gold, fontWeight: 600, cursor: 'pointer' }}>もっと見る ›</div>
          </div>

          <InsightSection icon="ti-speakerphone" color="#607D8B" title="お知らせ" items={NOTICES} />
          <InsightSection icon="ti-trending-up" color="#2E7D32" title="AI分析・提案" items={SUGGESTIONS} />

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.navy, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <i className="ti ti-chart-bar" style={{ color: '#1976D2' }} />AI予測
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.navy }}>
              {FORECAST.value}
              <span style={{ fontSize: 11.5, color: '#90A4AE', fontWeight: 500, marginLeft: 6 }}>(達成率{FORECAST.rate})</span>
            </div>
            <div style={{ fontSize: 11, color: '#90A4AE', marginTop: 2 }}>{FORECAST.note}</div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .dai-today-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 12 }}>クイックメニュー</div>
      <ModuleLauncher modules={quickMenuModules} unreadCounts={unread} onSelect={m => navigate(m.absolute ? m.path : brand.homePath + m.path)} />
    </div>
  )
}

function KpiCell({ icon, color, label, value, unit, sub }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 22, color }} />
      <div style={{ fontSize: 10.5, color: '#B9C6DF', margin: '8px 0 2px' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
        {value}{unit && <small style={{ fontSize: 10, fontWeight: 500, color: '#B9C6DF', marginLeft: 2 }}>{unit}</small>}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: C.gold, fontWeight: 700, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function InsightSection({ icon, color, title, items }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className={`ti ${icon}`} />{title}
      </div>
      {items.map((s, i) => (
        <div key={i} style={{ fontSize: 12, color: '#607D8B', marginBottom: 7, paddingLeft: 14, position: 'relative', lineHeight: 1.6 }}>
          <span style={{ position: 'absolute', left: 0, color: C.gold }}>・</span>{s}
        </div>
      ))}
    </div>
  )
}

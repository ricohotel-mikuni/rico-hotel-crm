import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useHotelWeather } from '../../hooks/useHotelWeather'
import { useBrand } from '../../branding/BrandContext'
import ModuleLauncher from '../../ui/ModuleLauncher'
import Dai from '../../ai/Dai'
import { dailyPick } from '../../ai/daiGreeting'
import { describeWeatherCode, weatherComment } from '../../ai/weatherInsight'
import { MODULES } from '../registry'

// 拠点ダッシュボード専用の配色トークン(承認済み提案書「拠点ダッシュ
// ボードUI最終ブラッシュアップ(統一デザイン版)Ver.9」)。ERP開発憲章
// 第11条に基づき、既存のC定数(全社共通)は変更せずこのファイル内だけで
// 使うローカルなトークンとして管理する — サイドバー・パンくず等の
// 共通コンポーネントには影響しない。
const DASH = {
  bg: '#071C3A',
  card: '#0F2A4D',
  border: '#1A2A4A',
  gold: '#D4AF37',
  textMain: '#FFFFFF',
  textSub: '#C7D0E0',
  textFaint: '#8A96AC',
}

// 優先度「低」を追加(承認済み提案書「拠点ダッシュボードUI改善 Ver.7」⑥)。
const TODO_ITEMS = [
  { label: '203号室 エアコン故障対応', priority: '緊急', color: '#ff8a7a' },
  { label: 'VIPチェックイン 17:00(山田様)', priority: '高', color: '#F59E0B' },
  { label: '楽天口コミ返信 3件', priority: '中', color: DASH.gold },
  { label: '朝食食材が不足する可能性あり', priority: '中', color: DASH.gold },
  { label: 'A株式会社 営業フォロー', priority: '低', color: DASH.textFaint },
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
const RATINGS = [
  { stars: 4, note: '今日は比較的余裕があります。' },
  { stars: 3, note: '本日はやや慌ただしい一日になりそうです。' },
  { stars: 5, note: '今日は全体的に落ち着いた一日になりそうです。' },
]

// クイックメニューに出す項目(承認済み提案書Ver.7⑦) — MODULES全体では
// なく、日常的によく使う9項目だけの厳選版。サイドバーは引き続き
// MODULES全項目を網羅しているため、ここに出ない項目も導線を失わない。
const QUICK_MENU_IDS = ['front', 'cleaning', 'breakfast', 'dinner', 'parking', 'maintenance', 'shifts', 'payments', 'cashier']

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)— 「NEO TODAY」実装
// (承認済み提案書「拠点ダッシュボードUI改善 Ver.5〜Ver.9」)。Ver.9で
// ページ全体を専用の濃紺トーンへ統一し(SidebarShell自体は他画面と
// 共有のため変更せず、この画面のルート要素だけがdark-navyの背景を
// 敷く形にしている)、天気カードをNEO TODAY内へ統合、KPIグリッドを
// 完全統一+レスポンシブ化した。既存の持続的サイドバー(HotelsApp.jsx
// の SidebarShell + buildPropertyNavGroups)をそのまま使うため、新しい
// ナビゲーションは増やしていない(ERP開発憲章第7条・第8条)。
//
// 下記のKPI(売上・稼働率・チェックイン等)は、対応するフロント/清掃/
// 朝食/夕食/駐車場モジュールが未実装のため、現時点では実データを
// 持たない。AI開発憲章第12条に基づき明示する必要があるため、末尾に
// 注記を残している — 対応モジュール実装後、順次実データへ切り替える。
export default function PropertyHub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const brand = useBrand()
  const unread = useUnreadCounts()
  const [analyzing, setAnalyzing] = useState(true)
  const weather = useHotelWeather()

  useEffect(() => {
    const t = setTimeout(() => setAnalyzing(false), 1100)
    return () => clearTimeout(t)
  }, [])

  const rating = dailyPick(RATINGS, 2)
  const quickMenuModules = MODULES.filter(m => QUICK_MENU_IDS.includes(m.id))

  return (
    <div style={{ background: DASH.bg, minHeight: '100%' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 20px 56px' }}>

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>
            おはようございます、{profile?.full_name || '—'}さん！
          </h1>
          <div style={{ fontSize: 12, color: DASH.textFaint }}>
            本日も張り切っていきましょう！私はNEOです。本日も業務をサポートします。
          </div>
        </div>

        {analyzing ? (
          <div style={{
            background: DASH.card, border: `1px solid ${DASH.border}`,
            borderRadius: 18, padding: '24px 26px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14, color: DASH.textMain, fontSize: 13,
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
              .neo-analyzing-dots span { width: 6px; height: 6px; border-radius: 50%; background: ${DASH.gold}; display: inline-block; animation: neoDotPulse 1.1s ease-in-out infinite; }
              .neo-analyzing-dots span:nth-child(2) { animation-delay: .15s; }
              .neo-analyzing-dots span:nth-child(3) { animation-delay: .3s; }
              @keyframes neoDotPulse { 0%,80%,100% { opacity: .25; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.15); } }
              @media (prefers-reduced-motion: reduce) { .neo-analyzing-dots span { animation: none; } }
            `}</style>
          </div>
        ) : (
          <div className="neo-today-fade neo-today-card">
            <div className="neo-today-left">
              <div className="neo-today-head">
                <Dai expr="talk" size={78} />
                <div className="neo-today-title">NEO TODAY</div>
              </div>
              <div className="neo-rating-box">
                <div className="neo-rating-stars">{'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}</div>
                <div className="neo-rating-note">{rating.note}</div>
              </div>
            </div>

            <div className="neo-weather-box">
              <div className="neo-weather-label">本日のホテル周辺情報</div>
              {weather.loading && <div className="neo-weather-loading">天気情報を取得しています…</div>}
              {weather.error && <div className="neo-weather-loading">天気情報を取得できませんでした</div>}
              {weather.data && (() => {
                const w = describeWeatherCode(weather.data.code)
                const comment = weatherComment(weather.data)
                return (
                  <>
                    <div className="neo-weather-main"><span className="emoji">{w.emoji}</span><span className="txt">{w.label} {Math.round(weather.data.tempNow)}℃</span></div>
                    <div className="neo-weather-precip">降水確率 {weather.data.precipProb}%</div>
                    <div className="neo-weather-comment-lbl">NEOコメント</div>
                    <div className="neo-weather-comment">{comment}</div>
                  </>
                )
              })()}
            </div>

            <style>{`
              .neo-today-fade { animation: neoChatFadeIn .5s ease; }
              @keyframes neoChatFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @media (prefers-reduced-motion: reduce) { .neo-today-fade { animation: none; } }
              .neo-today-card {
                background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 24px;
                display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 24px;
              }
              .neo-today-left { display: flex; flex-direction: column; gap: 12px; min-width: 200px; }
              .neo-today-head { display: flex; align-items: center; gap: 14px; }
              .neo-today-title { font-size: 16px; color: ${DASH.gold}; font-weight: 700; }
              .neo-rating-box { background: rgba(255,255,255,.05); border-radius: 12px; padding: 10px 14px; }
              .neo-rating-stars { color: ${DASH.gold}; font-size: 13px; letter-spacing: 1.5px; margin-bottom: 3px; }
              .neo-rating-note { font-size: 11px; color: ${DASH.textSub}; line-height: 1.5; }

              .neo-weather-box { flex: 1; min-width: 200px; }
              .neo-weather-label { font-size: 10.5px; color: ${DASH.textFaint}; font-weight: 700; margin-bottom: 8px; }
              .neo-weather-loading { font-size: 11.5px; color: ${DASH.textFaint}; }
              .neo-weather-main { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
              .neo-weather-main .emoji { font-size: 22px; }
              .neo-weather-main .txt { font-size: 16px; font-weight: 700; color: ${DASH.textMain}; }
              .neo-weather-precip { font-size: 11px; color: ${DASH.textFaint}; margin-bottom: 8px; }
              .neo-weather-comment-lbl { font-size: 10px; color: ${DASH.textFaint}; font-weight: 700; margin-bottom: 2px; }
              .neo-weather-comment { font-size: 11.5px; color: ${DASH.textSub}; line-height: 1.55; }
            `}</style>
          </div>
        )}

        {/* KPIはNEO TODAYカードの外の独立したセクション(承認済み
            提案書「拠点ダッシュボードUI レイアウト再構成 Ver.10」) —
            以前はNEO TODAYカードに同居させていたが、それだとカードの
            背が高くなりKPIの開始位置が下がってしまうため、個別に枠を
            持つカードとして外へ出し、NEO TODAY自体をコンパクトにした。 */}
        {!analyzing && (
          <div className="dash-kpi-grid">
            <KpiCell icon="ti-chart-line" color={DASH.gold} label="本日の売上+稼働率" value="¥548,000" sub="稼働率 92%" />
            <KpiCell icon="ti-door-enter" color="#4CD964" label="チェックイン" value="27" unit="件" />
            <KpiCell icon="ti-door-exit" color="#B366FF" label="チェックアウト" value="25" unit="件" />
            <KpiCell icon="ti-brush" color="#F59E0B" label="清掃待ち" value="20 / 44" unit="部屋" />
            <KpiCell icon="ti-car" color="#3A6DFF" label="駐車場" value="1 / 10" unit="台" />
            <KpiCell icon="ti-coffee" color="#4CD964" label="朝食予定+稼働率" value="43" unit="食" sub="稼働率 92%" />
            <KpiCell icon="ti-tools-kitchen-2" color="#F59E0B" label="夕食予定+稼働率" value="18" unit="食" sub="稼働率 92%" />
          </div>
        )}
        <style>{`
          .dash-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
          @media (max-width: 1180px) and (min-width: 760px) { .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 759px) { .dash-kpi-grid { grid-template-columns: 1fr; } }
        `}</style>
        <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 24 }}>
          ※ KPIの数値はサンプル表示です。フロント・清掃・朝食・夕食・駐車場モジュール実装後、順次実データへ切り替わります。天気は実データです。
        </div>

        <div className="dai-today-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 20, marginBottom: 30 }}>
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div className="dash-panel-title">💡 今日やるべきこと(優先順位)</div>
              <div className="dash-more">もっと見る ›</div>
            </div>
            {TODO_ITEMS.map((t, i) => (
              <div key={i} className="dash-todo-item" style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                <span className="dash-todo-badge">{i + 1}</span>
                <span style={{ fontSize: 12.5, color: DASH.textSub, flex: 1 }}>{t.label}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: t.color, background: `${t.color}22`, padding: '3px 9px', borderRadius: 999, flexShrink: 0 }}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <div className="dash-panel-title">🤖 NEOからのお知らせ・提案</div>
              <div className="dash-more">もっと見る ›</div>
            </div>

            <InsightSection emoji="📢" title="お知らせ" items={NOTICES} />
            <InsightSection emoji="📈" title="AI分析・提案" items={SUGGESTIONS} titleColor="#4CD964" />

            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: DASH.textMain, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                📊 AI予測
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain }}>
                {FORECAST.value}
                <span style={{ fontSize: 11.5, color: DASH.textFaint, fontWeight: 500, marginLeft: 6 }}>(達成率{FORECAST.rate})</span>
              </div>
              <div style={{ fontSize: 11, color: DASH.textFaint, marginTop: 2 }}>{FORECAST.note}</div>
            </div>
          </div>
        </div>
        <style>{`
          .dash-panel { background: ${DASH.card}; border: 1px solid ${DASH.border}; border-radius: 18px; padding: 22px; }
          .dash-panel-head { display: flex; align-items: center; margin-bottom: 14px; }
          .dash-panel-title { font-size: 13px; font-weight: 700; color: ${DASH.textMain}; display: flex; align-items: center; gap: 7px; }
          .dash-more { margin-left: auto; font-size: 11.5px; color: ${DASH.gold}; font-weight: 600; cursor: pointer; flex-shrink: 0; }
          .dash-todo-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
          .dash-todo-badge {
            width: 22px; height: 22px; border-radius: 50%; background: ${DASH.gold}; color: #0B1C3A;
            font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          @media (max-width: 720px) {
            .dai-today-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 12 }}>クイックメニュー</div>
        <ModuleLauncher modules={quickMenuModules} unreadCounts={unread} onSelect={m => navigate(m.absolute ? m.path : brand.homePath + m.path)} />
      </div>
    </div>
  )
}

function KpiCell({ icon, color, label, value, unit, sub }) {
  return (
    <div style={{ background: DASH.card, border: `1px solid ${DASH.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 22, color }} />
      <div style={{ fontSize: 10.5, color: DASH.textFaint, margin: '8px 0 2px', minHeight: 28, lineHeight: 1.35 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: DASH.textMain }}>
        {value}{unit && <small style={{ fontSize: 10, fontWeight: 500, color: DASH.textFaint, marginLeft: 2 }}>{unit}</small>}
      </div>
      <div style={{ fontSize: 10.5, color: DASH.gold, fontWeight: 700, marginTop: 2, minHeight: 15 }}>{sub || ''}</div>
    </div>
  )
}

function InsightSection({ emoji, title, items, titleColor }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: titleColor || DASH.textSub, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {emoji} {title}
      </div>
      {items.map((s, i) => (
        <div key={i} style={{ fontSize: 12, color: DASH.textSub, marginBottom: 7, paddingLeft: 14, position: 'relative', lineHeight: 1.6 }}>
          <span style={{ position: 'absolute', left: 0, color: DASH.gold }}>・</span>{s}
        </div>
      ))}
    </div>
  )
}

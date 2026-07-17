import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useHotelWeather } from '../../hooks/useHotelWeather'
import { useRooms, useStays, useMealService } from '../../hooks/useData'
import { useCurrentHotel } from './HotelContext'
import { useBrand } from '../../branding/BrandContext'
import ModuleLauncher from '../../ui/ModuleLauncher'
import { DarkPage, AnalyzingCard, TodayCard, TodayCardTitle, KpiGrid, KpiCell, DarkPanel, ChartGrid, ChartCard } from '../../ui/DesignSystemKit'
import { dailyPick } from '../../ai/daiGreeting'
import { describeWeatherCode, weatherComment } from '../../ai/weatherInsight'
import { MODULES } from '../registry'
import { DASH } from '../../lib/designSystem'

// 優先度「低」を追加(承認済み提案書「拠点ダッシュボードUI改善 Ver.7」⑥)。
const TODO_ITEMS = [
  { label: '203号室 エアコン故障対応', priority: '緊急', color: DASH.alert },
  { label: 'VIPチェックイン 17:00(山田様)', priority: '高', color: DASH.orange },
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

// グラフ(HotelOS Design System v1.0 §6.3、標準レイアウト HERO→KPI→
// グラフ→AI提案→ToDo→クイックメニュー)— フロント/清掃等が未実装のため
// 裏付けとなる実データが無く、KPIグリッドと同様「ダミー」表示とする
// (AI開発憲章第12条)。対応モジュール実装後、順次実データへ切り替える。
const REVENUE_TREND = [
  { label: '6/1', value: 420000 }, { label: '6/8', value: 465000 }, { label: '6/15', value: 501000 },
  { label: '6/22', value: 480000 }, { label: '6/29', value: 548000 },
]
const OCCUPANCY_TREND = [
  { label: '6/1', value: 78 }, { label: '6/8', value: 82 }, { label: '6/15', value: 88 },
  { label: '6/22', value: 85 }, { label: '6/29', value: 92 },
]
const ADR_TREND = [
  { label: '6/1', value: 14200 }, { label: '6/8', value: 14500 }, { label: '6/15', value: 15100 },
  { label: '6/22', value: 14800 }, { label: '6/29', value: 15600 },
]
const REVPAR_TREND = [
  { label: '6/1', value: 11076 }, { label: '6/8', value: 11890 }, { label: '6/15', value: 13288 },
  { label: '6/22', value: 12580 }, { label: '6/29', value: 14352 },
]

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)— Design System v1.0
// (docs/ui-design-system.md、ERP開発憲章第十一章)の基準画面そのもの。
// src/ui/DesignSystemKit.jsx の共有部品(DarkPage/TodayCard/KpiGrid/
// DarkPanel等)を直接組み立てて作る — 他画面(会社ホーム・営業管理等)は
// この画面が使っているのと同じ部品を再利用することで世界観を統一する
// (独自にdiv+インラインスタイルで「似たもの」を作り直さない、という
// 明示的な方針)。既存の持続的サイドバー(HotelsApp.jsx の SidebarShell
// + buildPropertyNavGroups)をそのまま使うため、新しいナビゲーションは
// 増やしていない(ERP開発憲章第7条・第8条)。
//
// 下記のKPI(売上・稼働率・チェックイン等)は、対応するフロント/清掃/
// 夕食/駐車場モジュールが未実装のため、現時点では実データを
// 持たない。AI開発憲章第12条に基づき明示する必要があるため、末尾に
// 注記を残している — 対応モジュール実装後、順次実データへ切り替える。
export default function PropertyHub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const brand = useBrand()
  const unread = useUnreadCounts()
  const [analyzing, setAnalyzing] = useState(true)
  const weather = useHotelWeather()
  const hotel = useCurrentHotel()
  const { rooms } = useRooms(hotel?.hotelId)
  const { stays } = useStays(hotel?.hotelId)
  const { roster: breakfastRoster } = useMealService(hotel?.hotelId, 'breakfast')

  useEffect(() => {
    const t = setTimeout(() => setAnalyzing(false), 1100)
    return () => clearTimeout(t)
  }, [])

  // フロント/清掃/朝食モジュール実装(HotelOS Phase 1)により実データの
  // 裏付けができたKPIのみdummyを解除する。「チェックイン/チェック
  // アウト」は本日を予定日とする宿泊件数(実施済みかどうかは問わない
  // 予定ベースの日次件数)、「清掃待ち」はrooms.status='vacant_dirty'
  // の実件数、「朝食提供」はuseMealService(本日チェックイン中の滞在
  // からstaysベースで算出)のうちserved=trueの組数。売上・稼働率・
  // 駐車場・夕食は対応モジュールが未実装のため引き続きdummyのまま
  // (捏造しない)。
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCheckins = stays.filter(s => s.checkin_date === todayStr).length
  const todayCheckouts = stays.filter(s => s.checkout_date === todayStr).length
  const dirtyRooms = rooms.filter(r => r.status === 'vacant_dirty').length
  const breakfastServed = breakfastRoster.filter(r => r.service?.served).length

  const rating = dailyPick(RATINGS, 2)
  const quickMenuModules = MODULES.filter(m => QUICK_MENU_IDS.includes(m.id))

  return (
    <DarkPage>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: DASH.textMain, margin: '0 0 3px' }}>
          おはようございます、{profile?.full_name || '—'}さん！
        </h1>
        <div style={{ fontSize: 12, color: DASH.textFaint }}>
          本日も張り切っていきましょう！私はNEOです。本日も業務をサポートします。
        </div>
      </div>

      {analyzing ? (
        <AnalyzingCard />
      ) : (
        <TodayCard>
          <div className="neo-today-left">
            <TodayCardTitle title="NEO TODAY" daiExpr="talk" daiSize={78} />
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
            .neo-today-left { display: flex; flex-direction: column; gap: 12px; min-width: 200px; }
            .neo-rating-box { background: ${DASH.surface2}; border-radius: 12px; padding: 10px 14px; }
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
        </TodayCard>
      )}

      {!analyzing && (
        <KpiGrid>
          <KpiCell icon="ti-chart-line" color={DASH.gold} label="本日の売上+稼働率" value="¥548,000" sub="稼働率 92%" dummy />
          <KpiCell icon="ti-door-enter" color={DASH.green} label="チェックイン" value={todayCheckins} unit="件" onClick={() => navigate(`${brand.homePath}/front`)} />
          <KpiCell icon="ti-door-exit" color={DASH.purple} label="チェックアウト" value={todayCheckouts} unit="件" onClick={() => navigate(`${brand.homePath}/front`)} />
          <KpiCell icon="ti-brush" color={DASH.orange} label="清掃待ち" value={`${dirtyRooms} / ${rooms.length}`} unit="部屋" onClick={() => navigate(`${brand.homePath}/cleaning`)} />
          <KpiCell icon="ti-car" color={DASH.blue} label="駐車場" value="1 / 10" unit="台" dummy />
          <KpiCell icon="ti-coffee" color={DASH.green} label="朝食提供" value={`${breakfastServed} / ${breakfastRoster.length}`} unit="組" onClick={() => navigate(`${brand.homePath}/breakfast`)} />
          <KpiCell icon="ti-tools-kitchen-2" color={DASH.orange} label="夕食予定+稼働率" value="18" unit="食" sub="稼働率 92%" dummy />
        </KpiGrid>
      )}
      <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 24 }}>
        ※ 「本日の売上+稼働率」「駐車場」「夕食予定」はサンプル表示です(対応モジュール実装後、順次実データへ切り替わります)。チェックイン・チェックアウト・清掃待ち・朝食提供・天気は実データです。
      </div>

      {!analyzing && (
        <ChartGrid>
          <ChartCard title="売上推移" data={REVENUE_TREND} color={DASH.gold} unit="円" dummy />
          <ChartCard title="稼働率推移" data={OCCUPANCY_TREND} color={DASH.blue} unit="%" dummy />
          <ChartCard title="ADR(平均客室単価)" data={ADR_TREND} color={DASH.green} unit="円" dummy />
          <ChartCard title="RevPAR" data={REVPAR_TREND} color={DASH.purple} unit="円" dummy />
        </ChartGrid>
      )}

      <div className="dai-today-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, marginBottom: 30 }}>
        <DarkPanel title="🤖 NEOからのお知らせ・提案" action="もっと見る ›">
          <InsightSection emoji="📢" title="お知らせ" items={NOTICES} />
          <InsightSection emoji="📈" title="AI分析・提案" items={SUGGESTIONS} titleColor={DASH.green} />
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
        </DarkPanel>

        <DarkPanel title="💡 今日やるべきこと(優先順位)" action="もっと見る ›">
          {TODO_ITEMS.map((t, i) => (
            <div key={i} className="dash-todo-item" style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
              <span className="dash-todo-badge">{i + 1}</span>
              <span style={{ fontSize: 12.5, color: DASH.textSub, flex: 1 }}>{t.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: t.color, background: `color-mix(in srgb, ${t.color} 16%, transparent)`, padding: '3px 9px', borderRadius: 999, flexShrink: 0 }}>
                {t.priority}
              </span>
            </div>
          ))}
        </DarkPanel>
      </div>
      <style>{`
        .dash-todo-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
        .dash-todo-badge {
          width: 22px; height: 22px; border-radius: 50%; background: ${DASH.gold}; color: ${DASH.onGold};
          font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        @media (max-width: 720px) {
          .dai-today-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 12 }}>クイックメニュー</div>
      <ModuleLauncher modules={quickMenuModules} unreadCounts={unread} onSelect={m => navigate(m.absolute ? m.path : brand.homePath + m.path)} />
    </DarkPage>
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

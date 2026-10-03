import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUnreadCounts } from '../../hooks/useNotifications'
import { useHotelWeather } from '../../hooks/useHotelWeather'
import { useRooms, useMealService, useDailySales, useNightAudit, useOperationalAlertCheck } from '../../hooks/useData'
import { useCurrentHotel } from './HotelContext'
import { useBrand } from '../../branding/BrandContext'
import ModuleLauncher from '../../ui/ModuleLauncher'
import { DarkPage, AnalyzingCard, TodayCard, TodayCardTitle, DarkPanel } from '../../ui/DesignSystemKit'
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

// 拠点ホーム(リコホテル三国、/hotels/rico-mikuni)
//
// 2026-10-03是正: ホテルスマートと重複するホテル運営KPI(売上推移・
// 稼働率推移・ADR・RevPAR・チェックイン/チェックアウト・清掃待ち・
// 駐車場・朝食/夕食提供・締め状況)を表示から外した。ホテルスマート
// 側で管理するため。KpiGrid/ChartGridのJSXと、それ専用のダミー
// トレンドデータ(REVENUE_TREND等)・集計値(todayCheckins等)を削除。
// 駐車場/宿泊データの取得(useParkingSpots/useStays)もこの表示でしか
// 使っていなかったため、合わせて取得をやめた。
//
// 運用アラート機能(清掃未完了・朝食/夕食未提供・締め忘れ、migration
// 025)は画面表示とは独立した機能のため、計算・呼び出しは変更して
// いない(dirtyRooms/breakfastServed/dinnerServedは引き続き
// useOperationalAlertCheckへ渡す)。NEO TODAY(天気)・AIお知らせ/提案・
// 今日やるべきこと・クイックメニューも変更していない。
export default function PropertyHub() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const brand = useBrand()
  const unread = useUnreadCounts()
  const [analyzing, setAnalyzing] = useState(true)
  const weather = useHotelWeather()
  const hotel = useCurrentHotel()
  const { rooms } = useRooms(hotel?.hotelId)
  const { roster: breakfastRoster } = useMealService(hotel?.hotelId, 'breakfast')
  const { roster: dinnerRoster } = useMealService(hotel?.hotelId, 'dinner')
  const { todayRecord: todaySales } = useDailySales(hotel?.hotelId)
  const { todayAudit } = useNightAudit(hotel?.hotelId)

  useEffect(() => {
    const t = setTimeout(() => setAnalyzing(false), 1100)
    return () => clearTimeout(t)
  }, [])

  const dirtyRooms = rooms.filter(r => r.status === 'vacant_dirty').length
  const breakfastServed = breakfastRoster.filter(r => r.service?.served).length
  const dinnerServed = dinnerRoster.filter(r => r.service?.served).length

  // 運用アラート(HotelOS Foundation v1.0) — 画面表示とは独立した機能
  // のため変更していない。しきい値は承認済み: 清掃13:00・朝食9:00・
  // 夕食20:00・締め23:30。
  useOperationalAlertCheck({
    hotelId: hotel?.hotelId,
    dirtyRoomsCount: dirtyRooms,
    breakfastUnservedCount: breakfastRoster.length - breakfastServed,
    dinnerUnservedCount: dinnerRoster.length - dinnerServed,
    hasTodaySales: !!todaySales,
    hasTodayAudit: !!todayAudit,
  })

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

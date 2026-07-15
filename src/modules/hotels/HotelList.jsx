import { useNavigate } from 'react-router-dom'
import HubShell from '../../layout/HubShell'
import { useHotels } from '../../hooks/useData'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

const STATUS_BADGE = { inactive: '準備中', suspended: '停止中' }

// ホテル事業一覧 — lists every hotel property; clicking one enters
// that property's own brand + module hub. 統合ホテル管理モジュール
// (承認済み提案書)により、registry.jsの静的配列ではなくSupabase
// (locations×hotels、type='hotel')から取得するよう変更した —
// ホテル管理画面(管理センター)で追加したホテルがコード変更なしに
// ここへ並ぶ。デザイン・遷移先ロジックは無変更(確立済みDarkPage
// パターン)。
export default function HotelList() {
  const navigate = useNavigate()
  const { hotels, loading, error, refresh } = useHotels()

  return (
    <HubShell>
      <DarkPage>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
            ホテル事業
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>
            拠点を選択してください
          </h1>
          <div style={{ fontSize: 13, color: DASH.textFaint }}>
            大栄商事株式会社が運営するホテル一覧です
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 28, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…
          </div>
        ) : error ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ color: DASH.alert, fontSize: 12, marginBottom: 8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />ホテル一覧を取得できませんでした
            </div>
            <button onClick={refresh} style={{ fontSize: 12, color: DASH.brandNavy, background: 'none', border: `1px solid ${DASH.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>再試行</button>
          </div>
        ) : hotels.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>ホテルが登録されていません</div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {hotels.map(h => {
            const soon = h.status !== 'active'
            const roomCount = h.hotels?.room_count
            return (
              <div
                key={h.id}
                className={soon ? 'hotel-card hotel-card-soon' : 'hotel-card'}
                onClick={() => !soon && navigate(`/hotels/${h.slug}`)}
              >
                {soon && <span className="hotel-card-badge">{STATUS_BADGE[h.status] || '準備中'}</span>}
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: soon ? DASH.surface3 : 'rgba(212,175,55,.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <i className="ti ti-building-store" style={{ fontSize: 21, color: soon ? DASH.textFaint : DASH.gold }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: DASH.textMain, marginBottom: 4 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: DASH.textFaint, marginBottom: 10 }}>{h.address || '—'}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  color: soon ? DASH.textFaint : DASH.green,
                }}>
                  <i className="ti ti-circle-filled" style={{ fontSize: 8 }} />
                  {soon ? (STATUS_BADGE[h.status] || '準備中') : `客室数 ${roomCount ?? '—'}室`}
                </div>
              </div>
            )
          })}
        </div>
        )}

        <style>{`
          .hotel-card {
            background: ${DASH.card}; border-radius: 16px; padding: 24px; position: relative;
            border: 1px solid ${DASH.border}; box-shadow: ${DASH.cardShadow};
            cursor: pointer; transition: transform .18s ease, border-color .18s ease;
          }
          .hotel-card:active { transform: scale(.98); }
          @media (hover: hover) and (pointer: fine) {
            .hotel-card:hover {
              transform: translateY(-3px);
              border-color: ${DASH.gold};
            }
          }
          .hotel-card-soon { cursor: default; opacity: .6; }
          .hotel-card-soon:active { transform: none; }
          @media (hover: hover) and (pointer: fine) {
            .hotel-card-soon:hover { transform: none; border-color: ${DASH.border}; }
          }
          .hotel-card-badge {
            position: absolute; top: 14px; right: 14px;
            font-size: 10px; font-weight: 700; letter-spacing: .5px;
            color: ${DASH.textFaint}; background: ${DASH.surface3};
            padding: 3px 9px; border-radius: 20px;
          }
        `}</style>
      </DarkPage>
    </HubShell>
  )
}

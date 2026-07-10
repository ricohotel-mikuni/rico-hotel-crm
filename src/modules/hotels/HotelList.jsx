import { useNavigate } from 'react-router-dom'
import HubShell from '../../layout/HubShell'
import { HOTELS } from './registry'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

// ホテル事業一覧 — lists every hotel property; clicking one enters
// that property's own brand + module hub. Design System v1.0(承認済み
// 提案書「Design System v1.0 最終統一提案」Item D)により、背景・カード
// をPropertyHub/Portalと同じ濃紺トーンへ統一。データ(HOTELS)・遷移先は
// 無変更 — HubShellの共有main背景は他画面(ComingSoon等)からも使われる
// ため、この画面自身がDarkPageで上から濃紺を重ねる(確立済みパターン)。
export default function HotelList() {
  const navigate = useNavigate()

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {HOTELS.map(h => {
            const soon = h.status !== 'active'
            return (
              <div
                key={h.slug}
                className={soon ? 'hotel-card hotel-card-soon' : 'hotel-card'}
                onClick={() => !soon && navigate(`/hotels/${h.slug}`)}
              >
                {soon && <span className="hotel-card-badge">準備中</span>}
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: soon ? 'rgba(255,255,255,.06)' : 'rgba(212,175,55,.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <i className="ti ti-building-store" style={{ fontSize: 21, color: soon ? DASH.textFaint : DASH.gold }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: DASH.textMain, marginBottom: 4 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: DASH.textFaint, marginBottom: 10 }}>{h.address}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  color: soon ? DASH.textFaint : DASH.green,
                }}>
                  <i className="ti ti-circle-filled" style={{ fontSize: 8 }} />
                  {h.desc}
                </div>
              </div>
            )
          })}
        </div>

        <style>{`
          .hotel-card {
            background: ${DASH.card}; border-radius: 14px; padding: 22px 20px; position: relative;
            border: 1px solid ${DASH.border};
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
            color: ${DASH.textFaint}; background: rgba(255,255,255,.06);
            padding: 3px 9px; border-radius: 20px;
          }
        `}</style>
      </DarkPage>
    </HubShell>
  )
}

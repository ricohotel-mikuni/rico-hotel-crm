import { useNavigate } from 'react-router-dom'
import HubShell from '../../layout/HubShell'
import { HOTELS } from './registry'
import { C } from '../../lib/constants'

// ホテル事業一覧 — lists every hotel property; clicking one enters
// that property's own brand + module hub. Only one property is
// active today, but adding the next one is just another entry in
// HOTELS (src/modules/hotels/registry.js) — this layout already
// handles any number of cards, active or `status: 'soon'`, with no
// further changes needed.
export default function HotelList() {
  const navigate = useNavigate()

  return (
    <HubShell>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 56px' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
            ホテル事業
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
            拠点を選択してください
          </h1>
          <div style={{ fontSize: 13, color: '#90A4AE' }}>
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
                  background: soon ? '#ECEFF1' : `${C.gold}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <i className="ti ti-building-store" style={{ fontSize: 21, color: soon ? '#90A4AE' : '#B4933D' }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: '#90A4AE', marginBottom: 10 }}>{h.address}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  color: soon ? '#9E9E9E' : '#4CAF50',
                }}>
                  <i className="ti ti-circle-filled" style={{ fontSize: 8 }} />
                  {h.desc}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .hotel-card {
          background: #fff; border-radius: 14px; padding: 22px 20px; position: relative;
          border: 1px solid #ECEFF1; box-shadow: 0 2px 10px rgba(0,0,0,.05);
          cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .hotel-card:active { transform: scale(.98); }
        @media (hover: hover) and (pointer: fine) {
          .hotel-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 28px rgba(31,56,100,.14);
            border-color: ${C.gold};
          }
        }
        .hotel-card-soon { cursor: default; opacity: .75; }
        .hotel-card-soon:active { transform: none; }
        @media (hover: hover) and (pointer: fine) {
          .hotel-card-soon:hover { transform: none; box-shadow: 0 2px 10px rgba(0,0,0,.05); border-color: #ECEFF1; }
        }
        .hotel-card-badge {
          position: absolute; top: 14px; right: 14px;
          font-size: 10px; font-weight: 700; letter-spacing: .5px;
          color: #9E9E9E; background: #F5F5F5;
          padding: 3px 9px; border-radius: 20px;
        }
      `}</style>
    </HubShell>
  )
}

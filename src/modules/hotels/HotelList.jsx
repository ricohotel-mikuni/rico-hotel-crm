import { useNavigate } from 'react-router-dom'
import HubShell from '../../layout/HubShell'
import { HOTELS } from './registry'
import { C } from '../../lib/constants'

// ホテル事業一覧 — lists every hotel property; clicking one enters
// that property's own brand + module hub. Only one property exists
// today, but this screen (and HOTELS above) is where a second one
// would be added without touching any routing.
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
          {HOTELS.map(h => (
            <div
              key={h.slug}
              className="hotel-card"
              onClick={() => navigate(`/hotels/${h.slug}`)}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: `${C.gold}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <i className="ti ti-building-store" style={{ fontSize: 21, color: '#B4933D' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{h.name}</div>
              <div style={{ fontSize: 12, color: '#90A4AE', marginBottom: 10 }}>{h.address}</div>
              <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-circle-filled" style={{ fontSize: 8 }} />
                {h.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hotel-card {
          background: #fff; border-radius: 14px; padding: 22px 20px;
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
      `}</style>
    </HubShell>
  )
}

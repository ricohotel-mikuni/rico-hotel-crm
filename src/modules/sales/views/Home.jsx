import { useNavigate } from 'react-router-dom'
import { useClients } from '../../../hooks/useData'
import { useCases } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Badge, PageLoader, Btn, ErrorState } from '../../../ui'
import { C, fmt, today } from '../../../lib/constants'

function KPICard({ label, value, unit, color, icon, bg, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? 'kpi-card kpi-card-clickable' : 'kpi-card'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${icon}`} style={{ fontSize: 15, color }} />
        </div>
        <span style={{ fontSize: 11, color: '#90A4AE', lineHeight: 1.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { clients, loading: cLoading, error: cError, refresh: cRefresh } = useClients()
  const { cases, loading: sLoading, error: sError, refresh: sRefresh } = useCases()

  const todayStr = today()
  const weekStr = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]

  if (cLoading || sLoading) return <PageLoader />
  if (cError || sError) return <ErrorState message={cError || sError} onRetry={() => { cRefresh(); sRefresh() }} />

  const todayFollow = clients.filter(c => c.next_follow_date === todayStr)
  const weekFollow  = clients.filter(c => c.next_follow_date && c.next_follow_date <= weekStr && c.next_follow_date >= todayStr)
  const overdue     = clients.filter(c => c.next_follow_date && c.next_follow_date < todayStr)
  const won         = cases.filter(c => c.status === '成約')
  const wonRev      = won.reduce((s, c) => s + (c.revenue || 0), 0)
  const wonComm     = won.reduce((s, c) => s + (c.commission || 0), 0)

  const kpis = [
    { label: '今日のフォロー',   value: todayFollow.length, unit: '件', color: '#F44336', icon: 'ti-bell',          bg: '#FFEBEE', path: '/clients' },
    { label: '今週フォロー予定', value: weekFollow.length,  unit: '件', color: '#FF9800', icon: 'ti-calendar',      bg: '#FFF3E0', path: '/clients' },
    { label: '期限切れ案件',     value: overdue.length,     unit: '件', color: '#9C27B0', icon: 'ti-alert-circle',  bg: '#F3E5F5', path: '/clients' },
    { label: '成約件数',         value: won.length,         unit: '件', color: C.green,   icon: 'ti-trophy',        bg: '#E8F5E9', path: '/cases'   },
    { label: '成約売上合計',     value: Math.round(wonRev / 10000), unit: '万円', color: C.navy, icon: 'ti-currency-yen', bg: '#E3F2FD', path: '/cases' },
    { label: '成果報酬合計',     value: Math.round(wonComm / 10000), unit: '万円', color: '#009688', icon: 'ti-coins', bg: '#E0F2F1', path: '/commissions' },
    { label: '商談中案件',       value: cases.filter(c => c.status !== '成約' && c.status !== 'キャンセル').length, unit: '件', color: '#5C6BC0', icon: 'ti-briefcase', bg: '#E8EAF6', path: '/cases' },
    { label: '営業先総数',       value: clients.length,     unit: '社', color: '#455A64', icon: 'ti-building-store', bg: '#ECEFF1', path: '/clients' },
  ]

  return (
    <div style={{ padding: '18px 16px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: '0 0 3px' }}>
            こんにちは、{profile?.full_name || '—'} さん
          </h1>
          <div style={{ fontSize: 12, color: '#90A4AE', display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/logo.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
            リコホテル三国 営業管理システム — {todayStr}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => navigate('/clients')} icon="ti-plus" label="営業先を追加" color={C.navy} sm />
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {kpis.map(k => (
          <KPICard key={k.label} {...k} onClick={() => navigate(k.path)} />
        ))}
      </div>

      {/* Alert panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Today's follow */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ padding: '9px 14px', background: '#FFEBEE', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#C62828' }}>
            <i className="ti ti-bell" style={{ fontSize: 13 }} />
            今日のフォロー（{todayFollow.length}件）
          </div>
          {todayFollow.length === 0
            ? <div style={{ padding: '20px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>今日のフォロー予定はありません ✓</div>
            : todayFollow.map(c => (
              <div key={c.id} onClick={() => navigate('/clients')} style={{ padding: '8px 14px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{c.company}</div>
                  <div style={{ fontSize: 11, color: '#90A4AE' }}>{c.contact}</div>
                </div>
                <Badge status={c.status} />
              </div>
            ))}
        </div>

        {/* Overdue */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ padding: '9px 14px', background: overdue.length > 0 ? '#FFEBEE' : '#F5F5F5', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: overdue.length > 0 ? '#C62828' : '#9E9E9E' }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />
            期限切れ案件（{overdue.length}件）
          </div>
          {overdue.length === 0
            ? <div style={{ padding: '20px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>期限切れの案件はありません ✓</div>
            : overdue.slice(0, 5).map(c => (
              <div key={c.id} onClick={() => navigate('/clients')} style={{ padding: '8px 14px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#C62828' }}>⚠ {c.company}</div>
                  <div style={{ fontSize: 11, color: '#90A4AE' }}>期限: {c.next_follow_date}</div>
                </div>
                <Badge status={c.rank} />
              </div>
            ))}
        </div>
      </div>

      {/* Recent clients */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-list" style={{ fontSize: 14 }} />
          最近の営業先
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <i className="ti ti-wifi" style={{ fontSize: 12, color: '#4CAF50' }} />
            <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 500 }}>リアルタイム同期中</span>
          </div>
        </div>
        {clients.slice(0, 6).map(c => (
          <div key={c.id} onClick={() => navigate('/clients')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer', transition: 'background .1s' }}>
            <div style={{ width: 34, height: 34, borderRadius: 7, background: `${C.navy}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-building-store" style={{ fontSize: 15, color: C.navy }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company}</div>
              <div style={{ fontSize: 11, color: '#90A4AE' }}>{c.contact} · {c.phone}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <Badge status={c.rank} />
              <Badge status={c.status} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .kpi-card {
          background: #fff; border-radius: 8px; padding: 13px 14px;
          border: 1px solid #ECEFF1; box-shadow: 0 1px 4px rgba(0,0,0,.06);
          transition: transform .15s, box-shadow .15s;
        }
        .kpi-card-clickable { cursor: pointer; }
        .kpi-card-clickable:active { transform: scale(.98); }
        @media (hover: hover) and (pointer: fine) {
          .kpi-card-clickable:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        }
      `}</style>
    </div>
  )
}

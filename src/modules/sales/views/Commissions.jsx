import { useCases, useClients } from '../../../hooks/useData'
import { PageLoader, ErrorState } from '../../../ui'
import { C, fmt } from '../../../lib/constants'
import { Badge } from '../../../ui'

export default function Commissions() {
  const { cases, loading, error, refresh } = useCases()
  const { clients } = useClients()
  const getC = id => clients.find(c=>c.id===id)?.company||'—'
  const won = cases.filter(c=>c.status==='成約')
  const allComm = cases.reduce((s,c)=>s+(c.commission||0),0)
  const wonComm = won.reduce((s,c)=>s+(c.commission||0),0)
  const byP = {}; cases.forEach(c=>{ if(!byP[c.source])byP[c.source]={cnt:0,rev:0,comm:0}; byP[c.source].cnt++; byP[c.source].rev+=(c.revenue||0); byP[c.source].comm+=(c.commission||0) })

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refresh} />
  return (
    <div style={{ padding:'18px 16px', maxWidth:1000, margin:'0 auto' }}>
      <h1 style={{ fontSize:16, fontWeight:700, color:C.navy, margin:'0 0 14px' }}>成果報酬管理</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        {[['報酬合計（全案件）',allComm,'#5C6BC0'],['成約報酬',wonComm,'#4CAF50'],['未確定報酬',allComm-wonComm,'#FF9800']].map(([l,v,c])=>(
          <div key={l} style={{ background:'#fff', borderRadius:8, padding:'12px 14px', border:'1px solid #ECEFF1', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:11, color:'#90A4AE', marginBottom:5 }}>{l}</div>
            <div style={{ fontSize:21, fontWeight:700, color:c }}>{fmt(v)}円</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div style={{ background:'#fff', borderRadius:8, border:'1px solid #ECEFF1', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ padding:'9px 14px', background:C.navy, fontSize:12, fontWeight:700, color:'#fff' }}>担当者別実績</div>
          {Object.entries(byP).map(([n,d])=>(
            <div key={n} style={{ padding:'9px 14px', borderBottom:'1px solid #F5F5F5', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{n}</div>
                <div style={{ fontSize:11, color:'#90A4AE' }}>{d.cnt}件 / 売上 {fmt(d.rev)}円</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'#4CAF50' }}>{fmt(d.comm)}円</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:8, border:'1px solid #ECEFF1', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ padding:'9px 14px', background:C.navy, fontSize:12, fontWeight:700, color:'#fff' }}>成約済み案件</div>
          {won.length===0 ? <div style={{ padding:20, textAlign:'center', color:'#BDBDBD', fontSize:12 }}>成約案件なし</div> :
            won.map(c=>(
              <div key={c.id} style={{ padding:'8px 14px', borderBottom:'1px solid #F5F5F5' }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>{c.title}</div>
                <div style={{ fontSize:11, color:'#607D8B', display:'flex', justifyContent:'space-between', marginTop:2 }}>
                  <span>{getC(c.client_id)} / {c.source}</span>
                  <span style={{ fontWeight:700, color:'#4CAF50' }}>{fmt(c.commission)}円</span>
                </div>
              </div>
            ))}
        </div>
      </div>
      <div style={{ background:'#fff', borderRadius:8, border:'1px solid #ECEFF1', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'9px 14px', background:C.navy, fontSize:12, fontWeight:700, color:'#fff' }}>全案件一覧</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ background:'#F5F7FA' }}>
            {['案件名','営業先','売上(円)','報酬率','報酬額(円)','ステータス','担当'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:11, color:'#607D8B', fontWeight:600, borderBottom:'1px solid #ECEFF1', whiteSpace:'nowrap' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {cases.map((c,i)=>(
              <tr key={c.id} style={{ background:i%2?'#FAFAFA':'#fff', borderBottom:'1px solid #F5F5F5' }}>
                <td style={{ padding:'7px 12px', fontWeight:500, color:C.navy }}>{c.title}</td>
                <td style={{ padding:'7px 12px', color:'#607D8B' }}>{getC(c.client_id)}</td>
                <td style={{ padding:'7px 12px' }}>{fmt(c.revenue)}</td>
                <td style={{ padding:'7px 12px', textAlign:'center' }}>{c.commission_rate}</td>
                <td style={{ padding:'7px 12px', fontWeight:700, color:'#4CAF50' }}>{fmt(c.commission)}</td>
                <td style={{ padding:'7px 12px' }}><Badge status={c.status} /></td>
                <td style={{ padding:'7px 12px', color:'#607D8B' }}>{c.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

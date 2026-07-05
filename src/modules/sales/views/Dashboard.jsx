import { useClients, useCases } from '../../../hooks/useData'
import { PageLoader } from '../../../ui'
import { C, fmt } from '../../../lib/constants'

export default function Dashboard() {
  const { clients, loading: cl } = useClients()
  const { cases, loading: sl } = useCases()
  if (cl||sl) return <PageLoader />
  const won = cases.filter(c=>c.status==='成約')
  const wonR = won.reduce((s,c)=>s+(c.revenue||0),0)
  const byT={};clients.forEach(c=>{byT[c.client_type]=(byT[c.client_type]||0)+1})
  const bySt={};cases.forEach(c=>{bySt[c.status]=(bySt[c.status]||0)+1})
  const byR={A:0,B:0,C:0};clients.forEach(c=>{byR[c.rank]=(byR[c.rank]||0)+1})
  const COLS=['#1F3864','#2E5FA3','#C9A84C','#4CAF50','#FF9800','#9C27B0','#00BCD4']
  const tArr=Object.entries(byT).map(([n,v],i)=>({n,v,c:COLS[i%COLS.length]}))
  const sArr=Object.entries(bySt).map(([n,v],i)=>({n,v,c:COLS[i%COLS.length]}))
  const maxS=Math.max(...sArr.map(d=>d.v),1)
  return (
    <div style={{ padding:'18px 16px', maxWidth:1000, margin:'0 auto' }}>
      <h1 style={{ fontSize:16, fontWeight:700, color:C.navy, margin:'0 0 14px' }}>ダッシュボード — 分析</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[['営業先総数',clients.length,'社',C.navy,'ti-building-store'],['成約件数',won.length,'件','#4CAF50','ti-trophy'],['成約売上',Math.round(wonR/10000),'万円',C.navy,'ti-currency-yen'],['成約率',cases.length?Math.round(won.length/cases.length*100):0,'%','#009688','ti-percent']].map(([l,v,u,c,ic])=>(
          <div key={l} style={{ background:'#fff', borderRadius:8, padding:'12px 14px', border:'1px solid #ECEFF1', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <i className={`ti ${ic}`} style={{ fontSize:22, color:c, display:'block', marginBottom:6 }} />
            <div style={{ fontSize:11, color:'#90A4AE', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}<span style={{ fontSize:12, fontWeight:400, marginLeft:2 }}>{u}</span></div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div style={{ background:'#fff', borderRadius:8, padding:'13px 14px', border:'1px solid #ECEFF1', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:10 }}>案件ステータス別</div>
          {sArr.map(d=>(
            <div key={d.n} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
              <div style={{ width:60, fontSize:11, color:'#455A64', flexShrink:0 }}>{d.n}</div>
              <div style={{ flex:1, height:12, background:'#F0F0F0', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:12, background:d.c, width:(d.v/maxS*100)+'%', borderRadius:3 }} />
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:d.c, minWidth:16 }}>{d.v}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:8, padding:'13px 14px', border:'1px solid #ECEFF1', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:8 }}>営業先 業種別内訳</div>
          <div style={{ display:'flex', height:16, borderRadius:4, overflow:'hidden', marginBottom:8 }}>
            {tArr.map(d=><div key={d.n} title={d.n+': '+d.v+'社'} style={{ flex:d.v, background:d.c }} />)}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 12px' }}>
            {tArr.map(d=><span key={d.n} style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:1, background:d.c, display:'inline-block', flexShrink:0 }} />{d.n} {d.v}社
            </span>)}
          </div>
        </div>
      </div>
      <div style={{ background:'#fff', borderRadius:8, padding:'13px 14px', border:'1px solid #ECEFF1', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:10 }}>ランクA営業先</div>
        {clients.filter(c=>c.rank==='A').map(c=>(
          <div key={c.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F5F5F5', fontSize:12 }}>
            <span style={{ fontWeight:600, color:C.navy }}>{c.company}</span>
            <span style={{ color:'#2E7D32', fontWeight:600 }}>{c.revenue?fmt(c.revenue)+'円':'—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

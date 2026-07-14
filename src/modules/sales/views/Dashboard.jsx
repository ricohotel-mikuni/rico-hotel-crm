import { useClients, useCases } from '../../../hooks/useData'
import { AsyncBoundary, TableSkeleton } from '../../../ui'
import { fmt } from '../../../lib/constants'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkPanel } from '../../../ui/DesignSystemKit'

// 営業分析ダッシュボード — Design System v1.0(承認済み提案書「Design
// System v1.0 仕様変更」)。DarkPage/DarkPanelを使用、集計ロジックは
// 一切変更していない。
export default function Dashboard() {
  const { clients, loading: cl, error: ce, refresh: cr } = useClients()
  const { cases, loading: sl, error: se, refresh: sr } = useCases()
  const won = cases.filter(c=>c.status==='成約')
  const wonR = won.reduce((s,c)=>s+(c.revenue||0),0)
  const byT={};clients.forEach(c=>{byT[c.client_type]=(byT[c.client_type]||0)+1})
  const bySt={};cases.forEach(c=>{bySt[c.status]=(bySt[c.status]||0)+1})
  const COLS=[DASH.blue,DASH.gold,DASH.green,DASH.orange,DASH.purple,'#00BCD4']
  const tArr=Object.entries(byT).map(([n,v],i)=>({n,v,c:COLS[i%COLS.length]}))
  const sArr=Object.entries(bySt).map(([n,v],i)=>({n,v,c:COLS[i%COLS.length]}))
  const maxS=Math.max(...sArr.map(d=>d.v),1)
  return (
    <DarkPage maxWidth={1000}>
      <h1 style={{ fontSize:16, fontWeight:700, color:DASH.textMain, margin:'0 0 14px' }}>ダッシュボード — 分析</h1>
      <AsyncBoundary loading={cl||sl} error={ce||se} onRetry={() => { cr(); sr() }} skeleton={<TableSkeleton rows={4} columns={4} />}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {[['営業先総数',clients.length,'社',DASH.textMain,'ti-building-store'],['成約件数',won.length,'件',DASH.green,'ti-trophy'],['成約売上',Math.round(wonR/10000),'万円',DASH.textMain,'ti-currency-yen'],['成約率',cases.length?Math.round(won.length/cases.length*100):0,'%',DASH.blue,'ti-percent']].map(([l,v,u,c,ic])=>(
            <div key={l} style={{ background:DASH.card, borderRadius:16, padding:'16px', border:`1px solid ${DASH.border}`, textAlign:'center', boxShadow:DASH.cardShadow }}>
              <i className={`ti ${ic}`} style={{ fontSize:22, color:c, display:'block', marginBottom:6 }} />
              <div style={{ fontSize:11, color:DASH.textFaint, marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}<span style={{ fontSize:12, fontWeight:400, marginLeft:2 }}>{u}</span></div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <DarkPanel title="案件ステータス別">
            {sArr.map(d=>(
              <div key={d.n} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <div style={{ width:60, fontSize:11, color:DASH.textSub, flexShrink:0 }}>{d.n}</div>
                <div style={{ flex:1, height:12, background:DASH.border, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:12, background:d.c, width:(d.v/maxS*100)+'%', borderRadius:3 }} />
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:d.c, minWidth:16 }}>{d.v}</div>
              </div>
            ))}
          </DarkPanel>
          <DarkPanel title="営業先 業種別内訳">
            <div style={{ display:'flex', height:16, borderRadius:4, overflow:'hidden', marginBottom:8 }}>
              {tArr.map(d=><div key={d.n} title={d.n+': '+d.v+'社'} style={{ flex:d.v, background:d.c }} />)}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 12px' }}>
              {tArr.map(d=><span key={d.n} style={{ fontSize:11, color:DASH.textSub, display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:8, height:8, borderRadius:1, background:d.c, display:'inline-block', flexShrink:0 }} />{d.n} {d.v}社
              </span>)}
            </div>
          </DarkPanel>
        </div>
        <DarkPanel title="ランクA営業先">
          {clients.filter(c=>c.rank==='A').map((c,i)=>(
            <div key={c.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:i>0?`1px solid ${DASH.border}`:'none', fontSize:12 }}>
              <span style={{ fontWeight:600, color:DASH.textMain }}>{c.company}</span>
              <span style={{ color:DASH.green, fontWeight:600 }}>{c.revenue?fmt(c.revenue)+'円':'—'}</span>
            </div>
          ))}
        </DarkPanel>
      </AsyncBoundary>
    </DarkPage>
  )
}

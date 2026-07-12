import { useCases, useClients } from '../../../hooks/useData'
import { AsyncBoundary, TableSkeleton, Badge } from '../../../ui'
import { fmt } from '../../../lib/constants'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkPanel } from '../../../ui/DesignSystemKit'

// 成果報酬管理 — Design System v1.0(承認済み提案書「Design System
// v1.0 仕様変更」)。DarkPage/DarkPanelを使用、集計ロジックは
// 一切変更していない。
export default function Commissions() {
  const { cases, loading, error, refresh } = useCases()
  const { clients } = useClients()
  const getC = id => clients.find(c=>c.id===id)?.company||'—'
  const won = cases.filter(c=>c.status==='成約')
  const allComm = cases.reduce((s,c)=>s+(c.commission||0),0)
  const wonComm = won.reduce((s,c)=>s+(c.commission||0),0)
  const byP = {}; cases.forEach(c=>{ if(!byP[c.source])byP[c.source]={cnt:0,rev:0,comm:0}; byP[c.source].cnt++; byP[c.source].rev+=(c.revenue||0); byP[c.source].comm+=(c.commission||0) })

  return (
    <DarkPage maxWidth={1000}>
      <h1 style={{ fontSize:16, fontWeight:700, color:DASH.textMain, margin:'0 0 14px' }}>成果報酬管理</h1>
      <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={5} columns={5} />}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
          {[['報酬合計（全案件）',allComm,DASH.purple],['成約報酬',wonComm,DASH.green],['未確定報酬',allComm-wonComm,DASH.orange]].map(([l,v,c])=>(
            <div key={l} style={{ background:DASH.card, borderRadius:14, padding:'12px 14px', border:`1px solid ${DASH.border}`, boxShadow:DASH.cardShadow }}>
              <div style={{ fontSize:11, color:DASH.textFaint, marginBottom:5 }}>{l}</div>
              <div style={{ fontSize:21, fontWeight:700, color:c }}>{fmt(v)}円</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <DarkPanel title="担当者別実績">
            {Object.entries(byP).map(([n,d],i)=>(
              <div key={n} style={{ padding:'9px 0', borderTop:i>0?`1px solid ${DASH.border}`:'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:DASH.textMain }}>{n}</div>
                  <div style={{ fontSize:11, color:DASH.textFaint }}>{d.cnt}件 / 売上 {fmt(d.rev)}円</div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:DASH.green }}>{fmt(d.comm)}円</div>
              </div>
            ))}
          </DarkPanel>
          <DarkPanel title="成約済み案件">
            {won.length===0 ? <div style={{ padding:20, textAlign:'center', color:DASH.textFaint, fontSize:12 }}>成約案件なし</div> :
              won.map((c,i)=>(
                <div key={c.id} style={{ padding:'8px 0', borderTop:i>0?`1px solid ${DASH.border}`:'none' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:DASH.textMain }}>{c.title}</div>
                  <div style={{ fontSize:11, color:DASH.textFaint, display:'flex', justifyContent:'space-between', marginTop:2 }}>
                    <span>{getC(c.client_id)} / {c.source}</span>
                    <span style={{ fontWeight:700, color:DASH.green }}>{fmt(c.commission)}円</span>
                  </div>
                </div>
              ))}
          </DarkPanel>
        </div>
        <DarkPanel title="全案件一覧">
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>
              {['案件名','営業先','売上(円)','報酬率','報酬額(円)','ステータス','担当'].map(h=><th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:11, color:DASH.gold, fontWeight:700, borderBottom:`1px solid ${DASH.border}`, whiteSpace:'nowrap' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {cases.map((c,i)=>(
                <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                  <td style={{ padding:'7px 10px', fontWeight:500, color:DASH.textMain }}>{c.title}</td>
                  <td style={{ padding:'7px 10px', color:DASH.textSub }}>{getC(c.client_id)}</td>
                  <td style={{ padding:'7px 10px', color:DASH.textSub }}>{fmt(c.revenue)}</td>
                  <td style={{ padding:'7px 10px', textAlign:'center', color:DASH.textSub }}>{c.commission_rate}</td>
                  <td style={{ padding:'7px 10px', fontWeight:700, color:DASH.green }}>{fmt(c.commission)}</td>
                  <td style={{ padding:'7px 10px' }}><Badge status={c.status} /></td>
                  <td style={{ padding:'7px 10px', color:DASH.textSub }}>{c.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </DarkPanel>
      </AsyncBoundary>
    </DarkPage>
  )
}

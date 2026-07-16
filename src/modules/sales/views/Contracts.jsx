import { useState } from 'react'
import { useContracts, useClients } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Btn, Badge, G2, AsyncBoundary, TableSkeleton, Empty, Toast } from '../../../ui'
import Modal from '../../../ui/Modal'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkField, DarkSelect, DarkTextarea } from '../../../ui/DesignSystemKit'
import { COMM_RATES } from '../../../lib/constants'

// 契約管理 — Design System v1.0(承認済み提案書「Design System v1.0
// 仕様変更」)。Cases.jsx/Clients.jsxと同じ部品構成。
const EMPTY = {client_id:'',title:'',start_date:'',end_date:'',renewal_date:'',base_fee:0,commission_rate:'10%',car_loan:'なし',insurance_confirmed:'未確認',notes:'',file_location:''}

export default function Contracts() {
  const {contracts,loading,error:loadError,refresh,add,update,softDelete}=useContracts()
  const {clients}=useClients()
  const {permissions}=useAuth()
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({})
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState(null)
  const [search,setSearch]=useState('')
  const set=k=>v=>setForm(p=>({...p,[k]:v}))
  const showToast=(m,t='success')=>{setToast({message:m,type:t});setTimeout(()=>setToast(null),3000)}
  const getC=id=>clients.find(c=>c.id===id)?.company||'—'

  // Foundation v1.0是正(UI/UX監査): 検索欄が無かったため追加。
  const filteredContracts = contracts.filter(c => {
    if (!search) return true
    const term = search.toLowerCase()
    return [c.title, getC(c.client_id)].filter(Boolean).some(v => v.toLowerCase().includes(term))
  })

  const save=async()=>{
    if(!form.title)return showToast('契約名は必須です','error')
    setSaving(true)
    const{error}=form.id?await update(form.id,form):await add(form)
    setSaving(false)
    if(error){showToast('保存に失敗しました','error');return}
    showToast(form.id?'更新しました':'契約を追加しました');setModal(false)
  }
  const del=async id=>{
    if(!confirm('削除しますか？'))return
    const{error}=await softDelete(id)
    if(error)showToast('削除に失敗しました','error');else showToast('削除しました')
  }

  return (
    <DarkPage maxWidth={1000}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:16,fontWeight:700,color:DASH.textMain,margin:0}}>契約管理</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{position:'relative'}}>
            <i className="ti ti-search" style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:DASH.textFaint,fontSize:13,pointerEvents:'none'}} />
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="契約名・営業先で検索"
              style={{padding:'7px 10px 7px 28px',border:`1px solid ${DASH.border}`,borderRadius:8,fontSize:12.5,width:180,outline:'none',background:DASH.inputBg,color:DASH.textMain,fontFamily:'inherit'}}
            />
          </div>
          {permissions.canWrite&&<Btn onClick={()=>{setForm({...EMPTY,client_id:clients[0]?.id||''});setModal(true)}} icon="ti-plus" label="契約を追加" color={DASH.green}/>}
        </div>
      </div>
      <AsyncBoundary loading={loading} error={loadError} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={4} />}>
        {filteredContracts.length===0?<Empty icon="ti-file-check" title={search ? '該当する契約が見つかりません' : '契約情報がありません'}/>:
          filteredContracts.map(c=>(
            <div key={c.id} style={{background:DASH.card,borderRadius:16,padding:'16px',marginBottom:10,border:`1px solid ${DASH.border}`,boxShadow:DASH.cardShadow}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:DASH.textMain}}>{c.title}</div>
                  <div style={{fontSize:12,color:DASH.textFaint,marginTop:2}}>{getC(c.client_id)}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <Badge status={c.insurance_confirmed}/>
                  <Badge status={c.car_loan==='あり'?'あり':'なし'}/>
                  {permissions.canWrite&&<button onClick={()=>{setForm({...c});setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:DASH.textFaint,fontSize:14}}><i className="ti ti-edit"/></button>}
                  {permissions.canDelete&&<button onClick={()=>del(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:DASH.textFaint,fontSize:14}}><i className="ti ti-trash"/></button>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px 12px',fontSize:11,color:DASH.textFaint}}>
                <div>開始: <span style={{color:DASH.textMain,fontWeight:600}}>{c.start_date||'—'}</span></div>
                <div>終了: <span style={{color:DASH.textMain,fontWeight:600}}>{c.end_date||'—'}</span></div>
                <div>更新: <span style={{color:DASH.orange,fontWeight:600}}>{c.renewal_date||'—'}</span></div>
                <div>報酬率: <span style={{color:DASH.green,fontWeight:700}}>{c.commission_rate}</span></div>
              </div>
              {c.file_location&&<div style={{marginTop:5,fontSize:11,color:DASH.textFaint}}>ファイル: <span style={{color:DASH.gold}}>{c.file_location}</span></div>}
            </div>
          ))
        }
      </AsyncBoundary>
      {modal&&(
        <Modal dark title="契約情報" icon="ti-file-check" onClose={()=>setModal(false)} onSave={save} saving={saving} width={520}>
          <DarkField label="契約名" value={form.title} onChange={set('title')} required placeholder="年間利用契約 など"/>
          <div style={{marginBottom:9}}>
            <label style={{fontSize:11,color:DASH.textFaint,display:'block',marginBottom:3,fontWeight:500}}>営業先</label>
            <select value={form.client_id||''} onChange={e=>set('client_id')(e.target.value)} style={{width:'100%',padding:'8px 10px',border:`1px solid ${DASH.border}`,borderRadius:7,fontSize:13,background:DASH.inputBg,color:DASH.textMain,fontFamily:'inherit'}}>
              <option value="">— 選択 —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <G2>
            <DarkField label="契約開始日" value={form.start_date} onChange={set('start_date')} type="date"/>
            <DarkField label="契約終了日" value={form.end_date} onChange={set('end_date')} type="date"/>
            <DarkField label="更新日" value={form.renewal_date} onChange={set('renewal_date')} type="date"/>
            <DarkSelect label="成果報酬率" value={form.commission_rate} onChange={set('commission_rate')} options={COMM_RATES}/>
            <DarkSelect label="車両貸与" value={form.car_loan} onChange={set('car_loan')} options={['なし','あり']}/>
            <DarkSelect label="保険確認" value={form.insurance_confirmed} onChange={set('insurance_confirmed')} options={['未確認','確認済']}/>
          </G2>
          <DarkField label="ファイル保存先（URLまたはパス）" value={form.file_location} onChange={set('file_location')}/>
          <DarkTextarea label="備考" value={form.notes} onChange={set('notes')} rows={3}/>
        </Modal>
      )}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </DarkPage>
  )
}

import { useState } from 'react'
import { useContracts, useClients } from '../hooks/useData'
import { useAuth } from '../contexts/AuthContext'
import { Btn, Badge, FI, FT, FS, G2, PageLoader, Empty, Toast } from '../ui'
import Modal from '../ui/Modal'
import { C, COMM_RATES } from '../lib/constants'

const EMPTY = {client_id:'',title:'',start_date:'',end_date:'',renewal_date:'',base_fee:0,commission_rate:'10%',car_loan:'なし',insurance_confirmed:'未確認',notes:'',file_location:''}

export default function Contracts() {
  const {contracts,loading,add,update,softDelete}=useContracts()
  const {clients}=useClients()
  const {permissions}=useAuth()
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({})
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState(null)
  const set=k=>v=>setForm(p=>({...p,[k]:v}))
  const showToast=(m,t='success')=>{setToast({message:m,type:t});setTimeout(()=>setToast(null),3000)}
  const getC=id=>clients.find(c=>c.id===id)?.company||'—'

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

  if(loading)return <PageLoader />
  return (
    <div style={{padding:'18px 16px',maxWidth:1000,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h1 style={{fontSize:16,fontWeight:700,color:C.navy,margin:0}}>契約管理</h1>
        {permissions.canWrite&&<Btn onClick={()=>{setForm({...EMPTY,client_id:clients[0]?.id||''});setModal(true)}} icon="ti-plus" label="契約を追加" color="#4CAF50"/>}
      </div>
      {contracts.length===0?<Empty icon="ti-file-check" title="契約情報がありません"/>:
        contracts.map(c=>(
          <div key={c.id} style={{background:'#fff',borderRadius:8,padding:'12px 14px',marginBottom:10,border:'1px solid #ECEFF1',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{c.title}</div>
                <div style={{fontSize:12,color:'#607D8B',marginTop:2}}>{getC(c.client_id)}</div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <Badge status={c.insurance_confirmed}/>
                <Badge status={c.car_loan==='あり'?'あり':'なし'}/>
                {permissions.canWrite&&<button onClick={()=>{setForm({...c});setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'#90A4AE',fontSize:14}}><i className="ti ti-edit"/></button>}
                {permissions.canDelete&&<button onClick={()=>del(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#BDBDBD',fontSize:14}}><i className="ti ti-trash"/></button>}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px 12px',fontSize:11,color:'#607D8B'}}>
              <div>開始: <span style={{color:C.navy,fontWeight:600}}>{c.start_date||'—'}</span></div>
              <div>終了: <span style={{color:C.navy,fontWeight:600}}>{c.end_date||'—'}</span></div>
              <div>更新: <span style={{color:'#E65100',fontWeight:600}}>{c.renewal_date||'—'}</span></div>
              <div>報酬率: <span style={{color:'#2E7D32',fontWeight:700}}>{c.commission_rate}</span></div>
            </div>
            {c.file_location&&<div style={{marginTop:5,fontSize:11,color:'#607D8B'}}>ファイル: <span style={{color:C.navyLight}}>{c.file_location}</span></div>}
          </div>
        ))
      }
      {modal&&(
        <Modal title="契約情報" icon="ti-file-check" onClose={()=>setModal(false)} onSave={save} saving={saving} width={520}>
          <FI label="契約名" value={form.title} onChange={set('title')} required placeholder="年間利用契約 など"/>
          <div style={{marginBottom:9}}>
            <label style={{fontSize:11,color:'#607D8B',display:'block',marginBottom:3,fontWeight:500}}>営業先</label>
            <select value={form.client_id||''} onChange={e=>set('client_id')(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #E0E0E0',borderRadius:5,fontSize:13,background:'#FFFDE7',fontFamily:'inherit'}}>
              <option value="">— 選択 —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <G2>
            <FI label="契約開始日" value={form.start_date} onChange={set('start_date')} type="date"/>
            <FI label="契約終了日" value={form.end_date} onChange={set('end_date')} type="date"/>
            <FI label="更新日" value={form.renewal_date} onChange={set('renewal_date')} type="date"/>
            <FS label="成果報酬率" value={form.commission_rate} onChange={set('commission_rate')} options={COMM_RATES}/>
            <FS label="車両貸与" value={form.car_loan} onChange={set('car_loan')} options={['なし','あり']}/>
            <FS label="保険確認" value={form.insurance_confirmed} onChange={set('insurance_confirmed')} options={['未確認','確認済']}/>
          </G2>
          <FI label="ファイル保存先（URLまたはパス）" value={form.file_location} onChange={set('file_location')}/>
          <FT label="備考" value={form.notes} onChange={set('notes')} rows={3}/>
        </Modal>
      )}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  )
}

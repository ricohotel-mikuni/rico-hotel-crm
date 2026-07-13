import { useState } from 'react'
import { useCases, useClients } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Btn, Badge, G2, AsyncBoundary, TableSkeleton, Empty, Toast } from '../../../ui'
import Modal from '../../../ui/Modal'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkField, DarkSelect, DarkTextarea } from '../../../ui/DesignSystemKit'
import { CASE_STATUS, COMM_RATES, PERSONS, fmt } from '../../../lib/constants'

// 案件管理 — Design System v1.0(承認済み提案書「Design System v1.0
// 仕様変更」)。DarkPage/Modal(dark)/DarkField等、Clients.jsxで確立
// 済みの同じ部品をそのまま使う。データ取得・保存・削除ロジックは
// 一切変更していない。
const EMPTY = { client_id:'', title:'', status:'営業中', probability:40, check_in_date:'', check_out_date:'', guests:0, rooms:0, revenue:0, commission_rate:'10%', source:PERSONS[0], notes:'' }
const SC = {'成約':DASH.green,'見積提出':DASH.orange,'検討中':DASH.gold,'営業中':DASH.blue,'キャンセル':DASH.textFaint}

export default function Cases() {
  const { cases, loading, error: loadError, refresh, add, update, softDelete } = useCases()
  const { clients } = useClients()
  const { permissions } = useAuth()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const set = k => v => setForm(p=>({...p,[k]:v}))
  const showToast = (m,t='success')=>{setToast({message:m,type:t});setTimeout(()=>setToast(null),3000)}
  const getC = id => clients.find(c=>c.id===id)?.company||'—'

  const save = async () => {
    if (!form.title) return showToast('案件名は必須です','error')
    setSaving(true)
    const d = {...form, revenue:Number(form.revenue)||0, guests:Number(form.guests)||0, rooms:Number(form.rooms)||0, probability:Number(form.probability)||0}
    const { error } = form.id ? await update(form.id,d) : await add(d)
    setSaving(false)
    if (error){showToast('保存に失敗しました','error');return}
    showToast(form.id?'更新しました':'案件を追加しました'); setModal(false)
  }
  const del = async id => {
    if (!confirm('削除しますか？'))return
    const {error}=await softDelete(id)
    if(error)showToast('削除に失敗しました','error'); else showToast('削除しました')
  }

  const wonRev = cases.filter(c=>c.status==='成約').reduce((s,c)=>s+(c.revenue||0),0)

  return (
    <DarkPage maxWidth={1000}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:16, fontWeight:700, color:DASH.textMain, margin:0 }}>案件管理</h1>
          <div style={{ fontSize:11, color:DASH.textFaint }}>全 {cases.length} 件 / 成約売上: {fmt(wonRev)}円</div>
        </div>
        {permissions.canWrite && <Btn onClick={()=>{setForm({...EMPTY,client_id:clients[0]?.id||''}); setModal(true)}} icon="ti-plus" label="案件を追加" color={DASH.green} />}
      </div>
      <AsyncBoundary loading={loading} error={loadError} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={4} />}>
        {cases.length===0 ? <Empty icon="ti-clipboard-list" title="案件がありません" /> :
          cases.map((c,i)=>(
            <div key={c.id} style={{ background:DASH.card, borderRadius:16, padding:'16px', marginBottom:10, border:`1px solid ${DASH.border}`, boxShadow:DASH.cardShadow }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flex:1, minWidth:0 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:DASH.textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</span>
                  <Badge status={c.status} />
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:DASH.textMain }}>{fmt(c.revenue)}円</span>
                  {permissions.canWrite && <button onClick={()=>{setForm({...c});setModal(true)}} style={{ background:'none',border:'none',cursor:'pointer',color:DASH.textFaint,fontSize:14 }}><i className="ti ti-edit"/></button>}
                  {permissions.canDelete && <button onClick={()=>del(c.id)} style={{ background:'none',border:'none',cursor:'pointer',color:DASH.textFaint,fontSize:14 }}><i className="ti ti-trash"/></button>}
                </div>
              </div>
              <div style={{ display:'flex', gap:12, fontSize:11, color:DASH.textFaint, marginBottom:7, flexWrap:'wrap' }}>
                <span>🏢 {getC(c.client_id)}</span>
                <span>📅 {c.check_in_date}〜{c.check_out_date}</span>
                <span>👥 {c.guests}名/{c.rooms}室</span>
                <span style={{ color:DASH.green, fontWeight:600 }}>報酬: {fmt(c.commission)}円 ({c.commission_rate})</span>
                <span>担当: {c.source}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, height:6, background:DASH.border, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:6, background:SC[c.status]||DASH.gold, borderRadius:3, width:(c.probability||0)+'%', transition:'width .3s' }} />
                </div>
                <span style={{ fontSize:11, color:DASH.textFaint, minWidth:30, textAlign:'right' }}>{c.probability}%</span>
              </div>
            </div>
          ))
        }
      </AsyncBoundary>
      {modal && (
        <Modal dark title="案件情報" icon="ti-clipboard-list" onClose={()=>setModal(false)} onSave={save} saving={saving} width={540}>
          <DarkField label="案件名" value={form.title} onChange={set('title')} required placeholder="○○ 研修旅行 30名" />
          <div style={{ marginBottom:9 }}>
            <label style={{ fontSize:11, color:DASH.textFaint, display:'block', marginBottom:3, fontWeight:500 }}>営業先</label>
            <select value={form.client_id||''} onChange={e=>set('client_id')(e.target.value)} style={{ width:'100%', padding:'8px 10px', border:`1px solid ${DASH.border}`, borderRadius:7, fontSize:13, background:DASH.inputBg, color:DASH.textMain, fontFamily:'inherit' }}>
              <option value="">— 選択 —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <G2>
            <DarkSelect label="ステータス" value={form.status} onChange={set('status')} options={CASE_STATUS} />
            <DarkField label="成約確率（%）" value={form.probability} onChange={v=>set('probability')(Number(v))} type="number" />
            <DarkField label="チェックイン日" value={form.check_in_date} onChange={set('check_in_date')} type="date" />
            <DarkField label="チェックアウト日" value={form.check_out_date} onChange={set('check_out_date')} type="date" />
            <DarkField label="宿泊人数" value={form.guests} onChange={v=>set('guests')(Number(v))} type="number" />
            <DarkField label="客室数" value={form.rooms} onChange={v=>set('rooms')(Number(v))} type="number" />
            <DarkField label="売上予定（円）" value={form.revenue} onChange={v=>set('revenue')(Number(v))} type="number" />
            <DarkSelect label="成果報酬率" value={form.commission_rate} onChange={set('commission_rate')} options={COMM_RATES} />
            <DarkSelect label="担当営業" value={form.source} onChange={set('source')} options={PERSONS} />
          </G2>
          <DarkTextarea label="備考" value={form.notes} onChange={set('notes')} rows={2} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
    </DarkPage>
  )
}

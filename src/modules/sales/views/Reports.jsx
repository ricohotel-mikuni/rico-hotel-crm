import { useState } from 'react'
import { useReports, useClients } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { Btn, Badge, G2, AsyncBoundary, TableSkeleton, Empty, Toast } from '../../../ui'
import Modal from '../../../ui/Modal'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkField, DarkSelect, DarkTextarea } from '../../../ui/DesignSystemKit'
import { PERSONS, PURPOSES, today } from '../../../lib/constants'

// 営業日報 — Design System v1.0(承認済み提案書「Design System v1.0
// 仕様変更」)。Cases.jsx/Contracts.jsx/Clients.jsxと同じ部品構成。
const EMPTY = { report_date: today(), client_id: '', contact_person: '', purpose: 'フォロー', card_exchanged: 'なし', proposal: '', reaction: '', estimate_requested: 'なし', booking_status: 'なし', next_action: '', next_visit_date: '', salesperson: PERSONS[0], memo: '' }

export default function Reports() {
  const { reports, loading, error: loadError, refresh, add, update, softDelete } = useReports()
  const { clients } = useClients()
  const { permissions } = useAuth()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const set = k => v => setForm(p => ({ ...p, [k]: v }))
  const showToast = (m, t='success') => { setToast({message:m,type:t}); setTimeout(()=>setToast(null),3000) }
  const getC = id => clients.find(c=>c.id===id)?.company || '—'

  const save = async () => {
    if (!form.report_date) return showToast('日付は必須です','error')
    setSaving(true)
    const { error } = form.id ? await update(form.id, form) : await add(form)
    setSaving(false)
    if (error) { showToast('保存に失敗しました','error'); return }
    showToast(form.id ? '更新しました' : '日報を追加しました'); setModal(false)
  }
  const openEdit = (r) => { setForm({...r}); setModal(true) }
  const del = async id => {
    if (!confirm('削除しますか？')) return
    const { error } = await softDelete(id)
    if (error) showToast('削除に失敗しました','error')
    else showToast('削除しました')
  }

  return (
    <DarkPage maxWidth={1000}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:16, fontWeight:700, color:DASH.textMain, margin:0 }}>営業日報</h1>
          <div style={{ fontSize:11, color:DASH.textFaint }}>全 {reports.length} 件</div>
        </div>
        {permissions.canWrite && <Btn onClick={()=>{setForm({...EMPTY,client_id:clients[0]?.id||''}); setModal(true)}} icon="ti-plus" label="日報を追加" color={DASH.green} />}
      </div>
      <AsyncBoundary loading={loading} error={loadError} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={4} />}>
        {reports.length===0 ? <Empty icon="ti-file-text" title="日報がありません。「日報を追加」から記録してください。" /> :
          reports.map(r => (
            <div key={r.id} style={{ background:DASH.card, borderRadius:16, padding:'16px', marginBottom:10, border:`1px solid ${DASH.border}`, boxShadow:DASH.cardShadow }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:DASH.textMain }}>{r.report_date}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:DASH.textMain }}>{getC(r.client_id)}</span>
                  <Badge status={r.purpose} />
                  <span style={{ fontSize:11, color:DASH.textFaint }}>/ {r.salesperson}</span>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <Badge status={r.booking_status} />
                  {permissions.canWrite && <button onClick={()=>openEdit(r)} style={{ background:'none', border:'none', cursor:'pointer', color:DASH.textFaint, fontSize:15, padding:'0 3px' }}><i className="ti ti-edit" /></button>}
                  {permissions.canDelete && <button onClick={()=>del(r.id)} style={{ background:'none', border:'none', cursor:'pointer', color:DASH.textFaint, fontSize:15 }}><i className="ti ti-trash" /></button>}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px', fontSize:12, color:DASH.textSub }}>
                <div><span style={{ color:DASH.textFaint }}>提案内容: </span>{r.proposal||'—'}</div>
                <div><span style={{ color:DASH.textFaint }}>相手の反応: </span>{r.reaction||'—'}</div>
                <div><span style={{ color:DASH.textFaint }}>次回アクション: </span><span style={{ fontWeight:600, color:DASH.blue }}>{r.next_action||'—'}</span></div>
                <div><span style={{ color:DASH.textFaint }}>次回訪問: </span><span style={{ color:DASH.green, fontWeight:600 }}>{r.next_visit_date||'—'}</span></div>
              </div>
              {r.memo && <div style={{ marginTop:6, fontSize:12, color:DASH.textSub, background:'rgba(212,175,55,.08)', padding:'5px 8px', borderRadius:4, borderLeft:`3px solid ${DASH.gold}` }}>メモ: {r.memo}</div>}
            </div>
          ))
        }
      </AsyncBoundary>
      {modal && (
        <Modal dark title={form.id ? '営業日報を編集' : '営業日報を追加'} icon="ti-file-text" onClose={()=>setModal(false)} onSave={save} saving={saving} width={540}>
          <G2>
            <DarkField label="日付" value={form.report_date} onChange={set('report_date')} type="date" required />
            <DarkSelect label="担当営業" value={form.salesperson} onChange={set('salesperson')} options={PERSONS} />
          </G2>
          <div style={{ marginBottom:9 }}>
            <label style={{ fontSize:11, color:DASH.textFaint, display:'block', marginBottom:3, fontWeight:500 }}>訪問先 *</label>
            <select value={form.client_id||''} onChange={e=>set('client_id')(e.target.value)} style={{ width:'100%', padding:'8px 10px', border:`1px solid ${DASH.border}`, borderRadius:7, fontSize:13, background:DASH.inputBg, color:DASH.textMain, fontFamily:'inherit' }}>
              <option value="">— 選択してください —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <G2>
            <DarkField label="面談者" value={form.contact_person} onChange={set('contact_person')} />
            <DarkSelect label="訪問目的" value={form.purpose} onChange={set('purpose')} options={PURPOSES} />
            <DarkSelect label="名刺交換" value={form.card_exchanged} onChange={set('card_exchanged')} options={['あり','なし']} />
            <DarkSelect label="見積依頼" value={form.estimate_requested} onChange={set('estimate_requested')} options={['なし','あり']} />
            <DarkSelect label="予約状況" value={form.booking_status} onChange={set('booking_status')} options={['なし','仮予約','本予約']} />
            <DarkField label="次回訪問予定日" value={form.next_visit_date} onChange={set('next_visit_date')} type="date" />
          </G2>
          <DarkTextarea label="提案内容" value={form.proposal} onChange={set('proposal')} rows={2} />
          <DarkTextarea label="相手の反応" value={form.reaction} onChange={set('reaction')} rows={2} />
          <DarkField label="次回アクション" value={form.next_action} onChange={set('next_action')} />
          <DarkTextarea label="メモ" value={form.memo} onChange={set('memo')} rows={2} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
    </DarkPage>
  )
}

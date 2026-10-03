import { useState } from 'react'
import { useLinenItems, useLinenTransactions } from '../../../hooks/useData'
import { usePermission } from '../../../permissions/PermissionContext'
import Modal from '../../../ui/Modal'
import { Toast } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkField } from '../../../ui/DesignSystemKit'
import { today } from '../../../lib/constants'

// リネン管理(今回のご依頼「システム構成の整理」③) — 添付Excel
// 「ホテルリネン_入出庫月次在庫管理」の構成(リネンマスタ/日々の
// 入出庫/月次在庫)をWeb化する。担当者マスタは既存のemployeesを
// そのまま使う(新規マスタを作らない)。月次在庫はDBに保存せず、
// マスタの期首在庫+トランザクションから都度計算する
// (useLinenTransactions().monthlySummary、useData.js参照)。
const TABS = [
  { key: 'master', label: 'リネンマスタ' },
  { key: 'transaction', label: '入出庫登録' },
  { key: 'monthly', label: '月次在庫' },
]
const TYPE_LABELS = { in: '入庫', out: '出庫', discard: '廃棄', damage: '破損' }

const inputStyle = {
  width: '100%', padding: '7px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 13,
  background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

export default function LinenManagement() {
  const [tab, setTab] = useState('master')
  return (
    <DarkPage maxWidth={1000}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>リネン管理</h1>
        <div style={{ fontSize: 13, color: DASH.textFaint }}>シーツ・タオル等のリネン在庫を管理します。</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${tab === t.key ? DASH.brandNavy : DASH.border}`,
            background: tab === t.key ? DASH.brandNavy : DASH.card,
            color: tab === t.key ? '#fff' : DASH.textSub,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'master' && <MasterPanel />}
      {tab === 'transaction' && <TransactionPanel />}
      {tab === 'monthly' && <MonthlyPanel />}
    </DarkPage>
  )
}

function MasterPanel() {
  const { items, loading, add, update } = useLinenItems()
  const canEdit = usePermission('hotel_management', 'edit')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ code: '', name: '', size: '', unit: '枚', opening_stock: 0, reorder_point: 0, storage_location: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm({ code: '', name: '', size: '', unit: '枚', opening_stock: 0, reorder_point: 0, storage_location: '' }); setEditing(null); setModalOpen(true) }
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id); setModalOpen(true) }

  const save = async () => {
    if (!form.code || !form.name) return showToast('リネンコードと種類は必須です', 'error')
    setSaving(true)
    const payload = { ...form, opening_stock: Number(form.opening_stock) || 0, reorder_point: Number(form.reorder_point) || 0 }
    const { error } = editing ? await update(editing, payload) : await add(payload)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast(editing ? '更新しました' : '追加しました')
    setModalOpen(false)
  }

  return (
    <>
      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        {canEdit && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${DASH.border}` }}>
            <button onClick={openNew} style={{ background: DASH.gold, color: DASH.onGold, border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ＋ リネンを追加
            </button>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                {['コード', '種類', 'サイズ', '単位', '期首在庫', '発注点', '保管場所', ''].map(c => (
                  <th key={c} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: DASH.textFaint }}>読み込み中…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: DASH.textFaint }}>データがありません</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
                  <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{item.code}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{item.name}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{item.size}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{item.unit}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{item.opening_stock}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{item.reorder_point}</td>
                  <td style={{ padding: '9px 14px', color: DASH.textSub }}>{item.storage_location}</td>
                  <td style={{ padding: '9px 14px' }}>
                    {canEdit && <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold }}><i className="ti ti-edit" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? 'リネンを編集' : 'リネンを追加'} icon="ti-wash" onClose={() => setModalOpen(false)} onSave={save} saving={saving} width={440}>
          <DarkField label="リネンコード" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} required />
          <DarkField label="種類" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required placeholder="シーツ・フェイスタオル等" />
          <DarkField label="サイズ" value={form.size} onChange={v => setForm(f => ({ ...f, size: v }))} />
          <DarkField label="単位" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} />
          <DarkField label="期首在庫" type="number" value={form.opening_stock} onChange={v => setForm(f => ({ ...f, opening_stock: v }))} />
          <DarkField label="発注点" type="number" value={form.reorder_point} onChange={v => setForm(f => ({ ...f, reorder_point: v }))} />
          <DarkField label="保管場所" value={form.storage_location} onChange={v => setForm(f => ({ ...f, storage_location: v }))} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}

function TransactionPanel() {
  const { items } = useLinenItems()
  const { transactions, loading, add } = useLinenTransactions()
  const [form, setForm] = useState({ itemId: '', txnDate: today(), type: 'in', quantity: 1, note: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const save = async () => {
    if (!form.itemId) return showToast('リネンを選択してください', 'error')
    setSaving(true)
    const { error } = await add({ ...form, quantity: Number(form.quantity) || 0 })
    setSaving(false)
    if (error) return showToast('登録に失敗しました: ' + error.message, 'error')
    showToast('登録しました')
    setForm(f => ({ ...f, quantity: 1, note: '' }))
  }

  return (
    <div>
      <div style={{ background: DASH.card, border: `1px solid ${DASH.border}`, borderRadius: 16, padding: 20, boxShadow: DASH.cardShadow, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 4 }}>日付</label>
            <input type="date" value={form.txnDate} onChange={e => setForm(f => ({ ...f, txnDate: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 4 }}>リネン</label>
            <select value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} style={inputStyle}>
              <option value="">選択してください</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}({i.size}) {i.code}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 4 }}>区分</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
              {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 4 }}>数量</label>
            <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 4 }}>備考</label>
        <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }} />
        <button onClick={save} disabled={saving} style={{ background: DASH.gold, color: DASH.onGold, border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
          {saving ? '登録中…' : '登録する'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 10 }}>最近の入出庫</div>
      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                {['日付', 'リネン', '区分', '数量', '担当者', '備考'].map(c => (
                  <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, color: DASH.gold, fontWeight: 700 }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: DASH.textFaint }}>読み込み中…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: DASH.textFaint }}>データがありません</td></tr>
              ) : transactions.slice(0, 30).map(t => (
                <tr key={t.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{t.txn_date}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{t.linen_items?.name}({t.linen_items?.size})</td>
                  <td style={{ padding: '8px 12px' }}>{TYPE_LABELS[t.type]}</td>
                  <td style={{ padding: '8px 12px' }}>{t.quantity}{t.linen_items?.unit}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textSub }}>{t.employees?.full_name || '—'}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textFaint }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function MonthlyPanel() {
  const [month, setMonth] = useState(today().slice(0, 7))
  const { items } = useLinenItems()
  const { monthlySummary } = useLinenTransactions(month)
  const rows = monthlySummary(items)

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...inputStyle, width: 160 }} />
      </div>
      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                {['リネン', '月初在庫', '入庫', '出庫', '廃棄', '破損', '月末在庫', '発注点', '判定'].map(c => (
                  <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: DASH.textFaint }}>データがありません</td></tr>
              ) : rows.map(r => (
                <tr key={r.item.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.item.name}({r.item.size})</td>
                  <td style={{ padding: '8px 12px' }}>{r.openingStock}</td>
                  <td style={{ padding: '8px 12px', color: DASH.green }}>+{r.inQty}</td>
                  <td style={{ padding: '8px 12px', color: DASH.alert }}>-{r.outQty}</td>
                  <td style={{ padding: '8px 12px', color: DASH.alert }}>-{r.discardQty}</td>
                  <td style={{ padding: '8px 12px', color: DASH.alert }}>-{r.damageQty}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>{r.closingStock}</td>
                  <td style={{ padding: '8px 12px', color: DASH.textFaint }}>{r.item.reorder_point}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.needsReorder ? (
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: `color-mix(in srgb, ${DASH.alert} 16%, transparent)`, color: DASH.alert }}>発注確認</span>
                    ) : (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: DASH.surface2, color: DASH.textFaint }}>正常</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

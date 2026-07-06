import { useState } from 'react'
import { useApprovalRequests, useMyEmployee, useRoles } from '../../hooks/useData'
import { usePermission } from '../../permissions/PermissionContext'
import HubShell from '../../layout/HubShell'
import Modal from '../../ui/Modal'
import { Btn, Badge, FI, FT, G2, Toast } from '../../ui'
import { C, fmt } from '../../lib/constants'

// 申請の種類 — 購入申請/経費申請/休暇申請/稟議書/契約は今後それぞれ
// 独自の画面を持つが、電子承認の土台としては同じ approval_requests に
// 自分の module タグでINSERTするだけで乗る(src/modules/registry.js の
// purchase/expenses と同じ id を使い、Hubの未読バッジとも自然に繋がる)。
const REQUEST_MODULES = [
  { module: 'purchase', label: '購入申請' },
  { module: 'expenses', label: '経費申請' },
  { module: 'leave', label: '休暇申請' },
  { module: 'ringi', label: '稟議書' },
  { module: 'contract', label: '契約' },
]

const STATUS_LABEL = { pending: '承認待ち', approved: '承認済み', rejected: '却下', cancelled: '取消' }

const EMPTY_REQUEST = { module: 'purchase', title: '', description: '', amount: '', approverRoleId: '' }

function ApprovalRow({ request, onDecide }) {
  const canApprove = usePermission(request.module, 'approve')
  const step = request.approval_steps?.[0]
  const moduleLabel = REQUEST_MODULES.find(m => m.module === request.module)?.label || request.module

  return (
    <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '12px 14px', marginBottom: 10, border: '1px solid #ECEFF1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#90A4AE', fontWeight: 700, letterSpacing: .5, marginBottom: 2 }}>{moduleLabel}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.navy }}>{request.title}</div>
          {request.description && <div style={{ fontSize: 12, color: '#607D8B', marginTop: 3 }}>{request.description}</div>}
          <div style={{ fontSize: 11, color: '#90A4AE', marginTop: 5 }}>
            申請者: {request.requester?.full_name || '—'} / {new Date(request.created_at).toLocaleDateString('ja-JP')}
            {request.amount != null && <> / 金額: {fmt(request.amount)}円</>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Badge status={STATUS_LABEL[request.status] || request.status} />
          {request.status === 'pending' && canApprove && step && (
            <>
              <Btn onClick={() => onDecide(request, step, 'approved')} icon="ti-check" label="承認" color="#4CAF50" sm />
              <Btn onClick={() => onDecide(request, step, 'rejected')} icon="ti-x" label="却下" color="#F44336" outline sm />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// 電子承認センター — 購入申請/経費申請/休暇申請/稟議書/契約などが
// 今後それぞれの画面を持った時、同じ承認フロー(approval_requests/
// approval_steps)にそのまま乗る。承認ボタンは usePermission(module,
// 'approve') でガードし、DBのcan_approve()も同じ判定を二重に守る。
export default function ApprovalCenter() {
  const { requests, loading, error, refresh, create, decide } = useApprovalRequests()
  const { employee } = useMyEmployee()
  const { roles } = useRoles()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_REQUEST)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }
  const set = k => v => setForm(p => ({ ...p, [k]: v }))

  const openNew = () => { setForm(EMPTY_REQUEST); setModalOpen(true) }

  const save = async () => {
    if (!form.title) return showToast('件名は必須です', 'error')
    if (!employee) return showToast('社員情報が見つかりません', 'error')
    setSaving(true)
    const { error } = await create({
      module: form.module, title: form.title, description: form.description,
      amount: form.amount === '' ? null : Number(form.amount),
      requestedBy: employee.id,
      approverRoleId: form.approverRoleId || null,
    })
    setSaving(false)
    if (error) { showToast('申請に失敗しました: ' + error, 'error'); return }
    showToast('申請しました')
    setModalOpen(false)
  }

  const onDecide = async (request, step, decision) => {
    const { error } = await decide(request, step, decision)
    if (error) showToast('処理に失敗しました', 'error')
    else showToast(decision === 'approved' ? '承認しました' : '却下しました')
  }

  const pending = requests.filter(r => r.status === 'pending')
  const done = requests.filter(r => r.status !== 'pending')

  return (
    <HubShell>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 56px' }}>
        {/* Page chrome always renders, regardless of data-fetch state. */}
        <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>電子承認</div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>承認センター</h1>
            <div style={{ fontSize: 13, color: '#90A4AE' }}>
              購入・経費・休暇・稟議・契約など、あらゆる申請がここに集まります
            </div>
          </div>
          <Btn onClick={openNew} icon="ti-plus" label="新規申請" color="#4CAF50" />
        </div>

        {/* This frame always renders — only its inner content reacts to
            loading/error, so a failed/slow fetch never removes the
            "承認待ち" section itself. */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>承認待ち（{loading || error ? '—' : pending.length}）</div>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', minHeight: 60 }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#90A4AE', fontSize: 12 }}>
                <i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…
              </div>
            ) : error ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ color: '#C62828', fontSize: 12, marginBottom: 8 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />申請データを取得できませんでした
                </div>
                <Btn onClick={refresh} icon="ti-refresh" label="再試行" color={C.navy} sm />
              </div>
            ) : pending.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>承認待ちの申請はありません</div>
            ) : (
              <div style={{ padding: 10 }}>{pending.map(r => <ApprovalRow key={r.id} request={r} onDecide={onDecide} />)}</div>
            )}
          </div>
        </div>

        {!loading && !error && done.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>履歴</div>
            {done.map(r => <ApprovalRow key={r.id} request={r} onDecide={onDecide} />)}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="新規申請" icon="ti-file-plus" onClose={() => setModalOpen(false)} onSave={save} saving={saving} width={480}>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>申請種別</label>
            <select
              value={form.module}
              onChange={e => set('module')(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 5, fontSize: 13, background: '#FFFDE7', fontFamily: 'inherit', outline: 'none' }}
            >
              {REQUEST_MODULES.map(m => <option key={m.module} value={m.module}>{m.label}</option>)}
            </select>
          </div>
          <FI label="件名" value={form.title} onChange={set('title')} required />
          <FT label="内容" value={form.description} onChange={set('description')} />
          <G2>
            <FI label="金額(任意)" value={form.amount} onChange={set('amount')} type="number" />
            <div style={{ marginBottom: 9 }}>
              <label style={{ fontSize: 11, color: '#607D8B', display: 'block', marginBottom: 3, fontWeight: 500 }}>承認者ロール</label>
              <select
                value={form.approverRoleId}
                onChange={e => set('approverRoleId')(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 5, fontSize: 13, background: '#FFFDE7', fontFamily: 'inherit', outline: 'none' }}
              >
                <option value="">未指定</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </G2>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </HubShell>
  )
}

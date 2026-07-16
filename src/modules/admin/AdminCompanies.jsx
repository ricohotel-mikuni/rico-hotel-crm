import { useState } from 'react'
import { useCompanies } from '../../hooks/useData'
import { useCurrentCompany } from '../../contexts/CompanyContext'
import { usePermission } from '../../permissions/PermissionContext'
import Modal from '../../ui/Modal'
import { Btn, Toast } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage, DarkField } from '../../ui/DesignSystemKit'

const EMPTY_FORM = { name: '', name_en: '' }

// 会社管理(Foundation v1.0是正) — 以前は会社を管理する画面が無く、
// DAIEI_COMPANY_IDというハードコードされた1社だけを前提にコードが
// 書かれていた。一覧・追加・編集・削除に加え、CompanyContext経由の
// 「切替」を提供する — 現状は1社のみのため切替先が1つしか無いが、
// 2社目を追加した瞬間、コード変更なしにこの画面から切り替えられる。
export default function AdminCompanies() {
  const { companies, loading, error, refresh, add, update, remove } = useCompanies()
  const { companyId: currentId, setCompanyId } = useCurrentCompany()
  const canEdit = usePermission('hotel_management', 'edit')
  const canDelete = usePermission('hotel_management', 'delete')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm(EMPTY_FORM); setEditing(null); setModalOpen(true) }
  const openEdit = (c) => { setForm({ name: c.name, name_en: c.name_en || '' }); setEditing(c.id); setModalOpen(true) }

  const save = async () => {
    if (!form.name) return showToast('会社名は必須です', 'error')
    setSaving(true)
    const { error } = editing ? await update(editing, form) : await add(form)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast(editing ? '更新しました' : '会社を追加しました')
    setModalOpen(false)
  }

  const del = async (c) => {
    if (!window.confirm(`「${c.name}」を削除しますか？ 配下にホテル・社員等のデータが残っている場合は削除できません`)) return
    const { error } = await remove(c.id)
    if (error) return showToast('削除に失敗しました: ' + error.message, 'error')
    showToast('削除しました')
  }

  return (
    <DarkPage maxWidth={860}>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>会社管理</h1>
          <div style={{ fontSize: 13, color: DASH.textFaint }}>HotelOS配下の会社を一覧・管理します(SaaS展開時は複数会社を扱えます)</div>
        </div>
        {canEdit && <Btn onClick={openNew} icon="ti-plus" label="会社を追加" color={DASH.green} />}
      </div>

      <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                {['', '会社名', '英語表記', '操作'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 28, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}><i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…</td></tr>
              ) : error ? (
                <tr><td colSpan={4} style={{ padding: 28, textAlign: 'center' }}>
                  <div style={{ color: DASH.alert, fontSize: 12, marginBottom: 8 }}><i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />取得できませんでした</div>
                  <Btn onClick={refresh} icon="ti-refresh" label="再試行" color={DASH.brandNavy} sm />
                </td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 28, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>会社が登録されていません</td></tr>
              ) : companies.map((c, i) => {
                const isCurrent = c.id === currentId
                return (
                  <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none', background: isCurrent ? 'rgba(22,163,74,.05)' : 'transparent' }}>
                    <td style={{ padding: '9px 14px' }}>
                      {isCurrent ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: DASH.green, background: 'rgba(22,163,74,.12)', padding: '2px 8px', borderRadius: 10 }}>選択中</span>
                      ) : (
                        <button onClick={() => setCompanyId(c.id)} style={{ fontSize: 10, fontWeight: 700, color: DASH.brandNavy, background: 'none', border: `1px solid ${DASH.border}`, borderRadius: 10, padding: '2px 8px', cursor: 'pointer' }}>
                          切替
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{c.name}</td>
                    <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{c.name_en || '—'}</td>
                    <td style={{ padding: '9px 14px' }}>
                      {canEdit && <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}><i className="ti ti-edit" style={{ fontSize: 15 }} /></button>}
                      {canDelete && <button onClick={() => del(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.alert, padding: 4 }}><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? '会社を編集' : '会社を追加'} icon="ti-building" onClose={() => setModalOpen(false)} onSave={save} saving={saving} dark width={420}>
          <DarkField label="会社名" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <DarkField label="英語表記" value={form.name_en} onChange={v => setForm({ ...form, name_en: v })} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}

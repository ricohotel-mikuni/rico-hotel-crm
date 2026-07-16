import { useState } from 'react'
import { useBusinessUnits, useDepartments, useRoles, useCompanies, useLocations, usePositions, useEmploymentTypes } from '../../hooks/useData'
import { usePermission } from '../../permissions/PermissionContext'
import Modal from '../../ui/Modal'
import { Btn, Toast } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage, DarkField } from '../../ui/DesignSystemKit'

const TABS = [
  { key: 'business_units', label: '事業' },
  { key: 'departments', label: '部署' },
  { key: 'positions', label: '役職' },
  { key: 'employment_types', label: '雇用区分' },
  { key: 'roles', label: 'ロール' },
]

// 共通マスター管理(Foundation v1.0是正⑤) — 以前は事業(business_units)
// ・部署(departments)・ロール(roles)を管理する画面が1つも無く、
// SQLを直接編集しない限り追加・変更できなかった。1,000施設SaaS
// では拠点ごとに部署構成が異なりうるため、この画面から管理画面
// 経由でいつでも追加できるようにする。ロールはemployee_roles/
// role_permissionsがON DELETE CASCADEのため削除は提供せず、追加・
// 編集のみとする(誤操作で権限マトリクスごと消える事故を避ける)。
export default function AdminCommonMasters() {
  const [tab, setTab] = useState('business_units')
  const canEdit = usePermission('hotel_management', 'edit')
  const canDelete = usePermission('hotel_management', 'delete')

  return (
    <DarkPage maxWidth={900}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>管理者専用</div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>共通マスター</h1>
        <div style={{ fontSize: 13, color: DASH.textFaint }}>事業・部署・ロールを管理します(SQLの直接編集は不要です)</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${tab === t.key ? DASH.brandNavy : DASH.border}`,
              background: tab === t.key ? DASH.brandNavy : DASH.card,
              color: tab === t.key ? '#fff' : DASH.textSub,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'business_units' && <BusinessUnitsPanel canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'departments' && <DepartmentsPanel canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'positions' && <SimpleNameMasterPanel canEdit={canEdit} canDelete={canDelete} useHook={usePositions} dataKey="positions" label="役職" icon="ti-id-badge-2" />}
      {tab === 'employment_types' && <SimpleNameMasterPanel canEdit={canEdit} canDelete={canDelete} useHook={useEmploymentTypes} dataKey="employmentTypes" label="雇用区分" icon="ti-file-certificate" />}
      {tab === 'roles' && <RolesPanel canEdit={canEdit} />}
    </DarkPage>
  )
}

function MasterTable({ columns, rows, renderRow, onAdd, addLabel, canEdit }) {
  return (
    <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, boxShadow: DASH.cardShadow, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${DASH.border}` }}>
        {canEdit && <Btn onClick={onAdd} icon="ti-plus" label={addLabel} color={DASH.green} sm />}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(212,175,55,.08)' }}>
              {columns.map(c => (
                <th key={c} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: 20, textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>データがありません</td></tr>
            ) : rows.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BusinessUnitsPanel({ canEdit, canDelete }) {
  const { businessUnits, add, update, remove } = useBusinessUnits()
  const { companies } = useCompanies()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ company_id: '', key: '', name: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm({ company_id: companies[0]?.id || '', key: '', name: '', sort_order: businessUnits.length }); setEditing(null); setModalOpen(true) }
  const openEdit = (bu) => { setForm({ company_id: bu.company_id, key: bu.key, name: bu.name, sort_order: bu.sort_order }); setEditing(bu.id); setModalOpen(true) }

  const save = async () => {
    if (!form.name || !form.key) return showToast('キーと名称は必須です', 'error')
    setSaving(true)
    const { error } = editing ? await update(editing, form) : await add(form)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast(editing ? '更新しました' : '追加しました')
    setModalOpen(false)
  }
  const del = async (bu) => {
    if (!window.confirm(`「${bu.name}」を削除しますか？`)) return
    const { error } = await remove(bu.id)
    if (error) showToast('削除に失敗しました: ' + error.message, 'error')
    else showToast('削除しました')
  }

  return (
    <>
      <MasterTable
        columns={['会社', 'キー', '名称', '並び順', '操作']} rows={businessUnits} addLabel="事業を追加" canEdit={canEdit} onAdd={openNew}
        renderRow={bu => (
          <tr key={bu.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{companies.find(c => c.id === bu.company_id)?.name || '—'}</td>
            <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{bu.key}</td>
            <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{bu.name}</td>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{bu.sort_order}</td>
            <td style={{ padding: '9px 14px' }}>
              {canEdit && <button onClick={() => openEdit(bu)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}><i className="ti ti-edit" style={{ fontSize: 15 }} /></button>}
              {canDelete && <button onClick={() => del(bu)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.alert, padding: 4 }}><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>}
            </td>
          </tr>
        )}
      />
      {modalOpen && (
        <Modal title={editing ? '事業を編集' : '事業を追加'} icon="ti-briefcase" onClose={() => setModalOpen(false)} onSave={save} saving={saving} dark width={420}>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>会社</label>
            <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}>
              <option value="">選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <DarkField label="キー(例: hotel, rental)" value={form.key} onChange={v => setForm({ ...form, key: v })} required />
          <DarkField label="名称" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <DarkField label="並び順" type="number" value={form.sort_order} onChange={v => setForm({ ...form, sort_order: Number(v) || 0 })} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}

function DepartmentsPanel({ canEdit, canDelete }) {
  const { departments, add, update, remove } = useDepartments()
  const { companies } = useCompanies()
  const { locations } = useLocations()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ company_id: '', location_id: '', name: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm({ company_id: companies[0]?.id || '', location_id: '', name: '', sort_order: departments.length }); setEditing(null); setModalOpen(true) }
  const openEdit = (d) => { setForm({ company_id: d.company_id, location_id: d.location_id || '', name: d.name, sort_order: d.sort_order }); setEditing(d.id); setModalOpen(true) }

  const save = async () => {
    if (!form.name) return showToast('名称は必須です', 'error')
    setSaving(true)
    const payload = { ...form, location_id: form.location_id || null }
    const { error } = editing ? await update(editing, payload) : await add(payload)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast(editing ? '更新しました' : '追加しました')
    setModalOpen(false)
  }
  const del = async (d) => {
    if (!window.confirm(`「${d.name}」を削除しますか？`)) return
    const { error } = await remove(d.id)
    if (error) showToast('削除に失敗しました: ' + error.message, 'error')
    else showToast('削除しました')
  }

  return (
    <>
      <MasterTable
        columns={['会社', '拠点', '部署名', '並び順', '操作']} rows={departments} addLabel="部署を追加" canEdit={canEdit} onAdd={openNew}
        renderRow={d => (
          <tr key={d.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{companies.find(c => c.id === d.company_id)?.name || '—'}</td>
            <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{locations.find(l => l.id === d.location_id)?.name || '(全社共通)'}</td>
            <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{d.name}</td>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{d.sort_order}</td>
            <td style={{ padding: '9px 14px' }}>
              {canEdit && <button onClick={() => openEdit(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}><i className="ti ti-edit" style={{ fontSize: 15 }} /></button>}
              {canDelete && <button onClick={() => del(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.alert, padding: 4 }}><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>}
            </td>
          </tr>
        )}
      />
      {modalOpen && (
        <Modal title={editing ? '部署を編集' : '部署を追加'} icon="ti-sitemap" onClose={() => setModalOpen(false)} onSave={save} saving={saving} dark width={420}>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>会社</label>
            <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}>
              <option value="">選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>拠点(任意、未選択で全社共通)</label>
            <select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}>
              <option value="">(全社共通)</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <DarkField label="部署名" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <DarkField label="並び順" type="number" value={form.sort_order} onChange={v => setForm({ ...form, sort_order: Number(v) || 0 })} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}

function RolesPanel({ canEdit }) {
  const { roles, add, update } = useRoles()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ key: '', label: '', description: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm({ key: '', label: '', description: '', sort_order: roles.length }); setEditing(null); setModalOpen(true) }
  const openEdit = (r) => { setForm({ key: r.key, label: r.label, description: r.description || '', sort_order: r.sort_order }); setEditing(r.id); setModalOpen(true) }

  const save = async () => {
    if (!form.key || !form.label) return showToast('キーと表示名は必須です', 'error')
    setSaving(true)
    // 既存ロールのkeyは権限マトリクス(role_permissions)・社員登録
    // フォームの選択肢と紐づくため、編集時は変更させない。
    const payload = editing ? { label: form.label, description: form.description, sort_order: form.sort_order } : form
    const { error } = editing ? await update(editing, payload) : await add(payload)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast(editing ? '更新しました' : '追加しました')
    setModalOpen(false)
  }

  return (
    <>
      <MasterTable
        columns={['キー', '表示名', '説明', '並び順', '操作']} rows={roles} addLabel="ロールを追加" canEdit={canEdit} onAdd={openNew}
        renderRow={r => (
          <tr key={r.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
            <td style={{ padding: '9px 14px', color: DASH.textFaint }}>{r.key}</td>
            <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{r.label}</td>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{r.description || '—'}</td>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{r.sort_order}</td>
            <td style={{ padding: '9px 14px' }}>
              {canEdit && <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}><i className="ti ti-edit" style={{ fontSize: 15 }} /></button>}
            </td>
          </tr>
        )}
      />
      <div style={{ fontSize: 11, color: DASH.textFaint, marginTop: 8 }}>
        ロールの削除はここでは行えません(権限マトリクス・社員の割り当てに影響するため)。不要になったロールは無効化ではなく運用で使用を停止してください。
      </div>
      {modalOpen && (
        <Modal title={editing ? 'ロールを編集' : 'ロールを追加'} icon="ti-shield" onClose={() => setModalOpen(false)} onSave={save} saving={saving} dark width={420}>
          <DarkField label="キー(英数字、社員登録フォーム等で使用)" value={form.key} onChange={v => setForm({ ...form, key: v })} required readOnly={!!editing} />
          <DarkField label="表示名" value={form.label} onChange={v => setForm({ ...form, label: v })} required />
          <DarkField label="説明" value={form.description} onChange={v => setForm({ ...form, description: v })} />
          <DarkField label="並び順" type="number" value={form.sort_order} onChange={v => setForm({ ...form, sort_order: Number(v) || 0 })} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}

// 役職・雇用区分は同じ形(company_id/name/sort_order)なので、フックだけ
// 差し替えられる汎用パネルにする(positions/employment_typesで共用)。
function SimpleNameMasterPanel({ canEdit, canDelete, useHook, dataKey, label, icon }) {
  const hookResult = useHook()
  const rows = hookResult[dataKey]
  const { add, update, remove } = hookResult
  const { companies } = useCompanies()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ company_id: '', name: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm({ company_id: companies[0]?.id || '', name: '', sort_order: rows.length }); setEditing(null); setModalOpen(true) }
  const openEdit = (r) => { setForm({ company_id: r.company_id, name: r.name, sort_order: r.sort_order }); setEditing(r.id); setModalOpen(true) }

  const save = async () => {
    if (!form.name) return showToast('名称は必須です', 'error')
    setSaving(true)
    const { error } = editing ? await update(editing, form) : await add(form)
    setSaving(false)
    if (error) return showToast('保存に失敗しました: ' + error.message, 'error')
    showToast(editing ? '更新しました' : '追加しました')
    setModalOpen(false)
  }
  const del = async (r) => {
    if (!window.confirm(`「${r.name}」を削除しますか？`)) return
    const { error } = await remove(r.id)
    if (error) showToast('削除に失敗しました: ' + error.message, 'error')
    else showToast('削除しました')
  }

  return (
    <>
      <MasterTable
        columns={['会社', '名称', '並び順', '操作']} rows={rows} addLabel={`${label}を追加`} canEdit={canEdit} onAdd={openNew}
        renderRow={r => (
          <tr key={r.id} style={{ borderTop: `1px solid ${DASH.border}` }}>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{companies.find(c => c.id === r.company_id)?.name || '—'}</td>
            <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain }}>{r.name}</td>
            <td style={{ padding: '9px 14px', color: DASH.textSub }}>{r.sort_order}</td>
            <td style={{ padding: '9px 14px' }}>
              {canEdit && <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}><i className="ti ti-edit" style={{ fontSize: 15 }} /></button>}
              {canDelete && <button onClick={() => del(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.alert, padding: 4 }}><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>}
            </td>
          </tr>
        )}
      />
      {modalOpen && (
        <Modal title={editing ? `${label}を編集` : `${label}を追加`} icon={icon} onClose={() => setModalOpen(false)} onSave={save} saving={saving} dark width={420}>
          <div style={{ marginBottom: 9 }}>
            <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>会社</label>
            <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${DASH.border}`, borderRadius: 8, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}>
              <option value="">選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <DarkField label="名称" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <DarkField label="並び順" type="number" value={form.sort_order} onChange={v => setForm({ ...form, sort_order: Number(v) || 0 })} />
        </Modal>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees, useLocations, useDepartments } from '../../hooks/useData'
import { useAuth } from '../../contexts/AuthContext'
import { uploadEmployeeFile } from '../../lib/storage'
import HubShell from '../../layout/HubShell'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeForm from './EmployeeForm'
import { Btn, Badge, Toast } from '../../ui'
import { C } from '../../lib/constants'

const STATUS_LABEL = { active: '在籍中', inactive: '退職済み' }

const EMPTY_EMPLOYEE = {
  employee_no: '', full_name: '', kana: '', status: 'active',
  employment_type: '正社員', hire_date: null, retirement_date: null,
  location_id: null, department_id: null, position: '',
  email: '', phone: '', address: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  social_insurance: {}, notes: '', photo_url: '',
}

// 社員管理 — 大栄商事株式会社に所属する社員の一覧+追加・編集。
// ホテルではなく会社(companies)に所属し、拠点/部署は
// employee_assignments 経由の配属として別管理(EmployeeForm参照)。
// 実際のロール・権限編集は既存のスタッフ設定画面(Settings.jsx)への
// 導線のみ用意し、そちらの挙動は変更しない。
export default function EmployeeDirectory() {
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const { employees, loading, error, refresh, add, update } = useEmployees()
  const { locations } = useLocations()
  const { departments } = useDepartments()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_EMPLOYEE)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }

  const openNew = () => { setForm(EMPTY_EMPLOYEE); setPendingPhoto(null); setModalOpen(true) }
  const openEdit = (e) => (ev) => { ev.stopPropagation(); setForm({ ...e }); setPendingPhoto(null); setModalOpen(true) }

  const save = async () => {
    if (!form.full_name) return showToast('氏名は必須です', 'error')
    setSaving(true)
    try {
      let photoUrl = form.photo_url
      if (pendingPhoto) photoUrl = await uploadEmployeeFile(pendingPhoto, 'photos')

      const { location_id, department_id, position, ...direct } = form
      const employeeFields = {
        employee_no: direct.employee_no, full_name: direct.full_name, kana: direct.kana,
        email: direct.email, phone: direct.phone, address: direct.address,
        emergency_contact_name: direct.emergency_contact_name, emergency_contact_phone: direct.emergency_contact_phone,
        hire_date: direct.hire_date, retirement_date: direct.retirement_date,
        employment_type: direct.employment_type, social_insurance: direct.social_insurance,
        notes: direct.notes, status: direct.status, photo_url: photoUrl,
      }
      const assignment = location_id ? { location_id, department_id, position } : null

      const isNew = !form.id
      const { error } = isNew ? await add(employeeFields, assignment) : await update(form.id, employeeFields, assignment)
      if (error) { showToast('保存に失敗しました: ' + error, 'error'); return }
      showToast(isNew ? '社員を登録しました' : '更新しました')
      setModalOpen(false)
      setPendingPhoto(null)
    } catch (e) {
      showToast('写真のアップロードに失敗しました: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <HubShell>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 56px' }}>
        {/* Page chrome always renders, regardless of data-fetch state —
            a failed/slow fetch must never blank the title or actions. */}
        <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
              社員管理
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
              社員ディレクトリ
            </h1>
            <div style={{ fontSize: 13, color: '#90A4AE' }}>
              大栄商事株式会社に所属する社員の一覧
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {permissions.canWrite && <Btn onClick={openNew} icon="ti-plus" label="社員を追加" color="#4CAF50" />}
            <Btn onClick={() => navigate('/hotels/rico-mikuni/sales/settings')} icon="ti-settings" label="スタッフ・権限設定へ" color={C.navy} outline />
          </div>
        </div>

        {/* The table frame (headers, borders) always renders — only the
            body row changes between loading/error/empty/data, so a
            failed or slow fetch never removes the table itself. */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECEFF1', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F5F7FA' }}>
                  {['', '社員番号', '氏名', '役職', '部署', '配属先', '状態', ''].map((h, i) => (
                    <th key={i} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: '#607D8B', fontWeight: 600, borderBottom: '1px solid #ECEFF1', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: '#90A4AE', fontSize: 12 }}>
                      <i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px', textAlign: 'center' }}>
                      <div style={{ color: '#C62828', fontSize: 12, marginBottom: 8 }}>
                        <i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />社員データを取得できませんでした
                      </div>
                      <Btn onClick={refresh} icon="ti-refresh" label="再試行" color={C.navy} sm />
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>
                      社員データがありません
                    </td>
                  </tr>
                ) : employees.map((e, i) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/employees/${e.id}`)}
                    style={{ background: i % 2 ? '#FAFAFA' : '#fff', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '9px 0 9px 14px' }}><EmployeeAvatar photoUrl={e.photo_url} name={e.full_name} size={28} /></td>
                    <td style={{ padding: '9px 14px', color: '#607D8B', whiteSpace: 'nowrap' }}>{e.employee_no || '—'}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: C.navy, whiteSpace: 'nowrap' }}>{e.full_name}</td>
                    <td style={{ padding: '9px 14px', color: '#607D8B' }}>{e.position || '—'}</td>
                    <td style={{ padding: '9px 14px', color: '#607D8B' }}>{e.department_name || '—'}</td>
                    <td style={{ padding: '9px 14px', color: '#607D8B' }}>{e.location_name || '—'}</td>
                    <td style={{ padding: '9px 14px' }}><Badge status={STATUS_LABEL[e.status] || e.status} /></td>
                    <td style={{ padding: '9px 14px' }}>
                      {permissions.canWrite && (
                        <button onClick={openEdit(e)} title="編集" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.navyLight, padding: 4 }}>
                          <i className="ti ti-edit" style={{ fontSize: 15 }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <EmployeeForm
          form={form}
          setForm={setForm}
          locations={locations}
          departments={departments}
          pendingPhoto={pendingPhoto}
          onPhotoFile={setPendingPhoto}
          onSave={save}
          onClose={() => setModalOpen(false)}
          saving={saving}
          isNew={!form.id}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </HubShell>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees, useLocations, useDepartments, useRoles, DAIEI_COMPANY_ID } from '../../hooks/useData'
import { useAuth } from '../../contexts/AuthContext'
import { uploadEmployeeFile } from '../../lib/storage'
import HubShell from '../../layout/HubShell'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeForm from './EmployeeForm'
import { Btn, Badge, Toast } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkPage } from '../../ui/DesignSystemKit'

const STATUS_LABEL = { active: '在籍中', inactive: '退職済み' }

const EMPTY_EMPLOYEE = {
  employee_no: '', full_name: '', kana: '', status: 'active',
  employment_type: '正社員', hire_date: null, retirement_date: null,
  location_id: null, department_id: null, position: '',
  email: '', phone: '', address: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  social_insurance: {}, notes: '', photo_url: '',
  password: '', pin: '', role_key: '',
}

// 社員管理 — 大栄商事株式会社に所属する社員の一覧+追加・編集。
// Design System v1.0(承認済み提案書「Design System v1.0 仕様変更」)。
// ホテルではなく会社(companies)に所属し、拠点/部署は
// employee_assignments 経由の配属として別管理(EmployeeForm参照)。
// 実際のロール・権限編集は既存のスタッフ設定画面(Settings.jsx)への
// 導線のみ用意し、そちらの挙動は変更しない。
export default function EmployeeDirectory() {
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const { employees, loading, error, refresh, createWithAuth, update } = useEmployees()
  const { locations } = useLocations()
  const { departments } = useDepartments()
  const { roles } = useRoles()

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
    const isNew = !form.id
    if (isNew && !form.email) return showToast('メールアドレスは必須です', 'error')
    if (isNew && (!form.password || form.password.length < 8)) return showToast('初期パスワードは8文字以上で入力してください', 'error')
    setSaving(true)
    try {
      let photoUrl = form.photo_url
      if (pendingPhoto) photoUrl = await uploadEmployeeFile(pendingPhoto, 'photos')

      const { location_id, department_id, position, ...direct } = form

      if (isNew) {
        // 社員登録の唯一の正規経路(ERP開発憲章第38条・第39条) —
        // Auth作成〜employees〜所属〜権限〜PINまでをEdge Function側で
        // まとめて完結させる。
        const { error } = await createWithAuth({
          full_name: direct.full_name, employee_no: direct.employee_no,
          email: direct.email, password: direct.password, pin: direct.pin || null,
          department_id, position, role_key: direct.role_key || null,
          company_id: DAIEI_COMPANY_ID, location_id,
          hire_date: direct.hire_date, status: direct.status,
        })
        if (error) { showToast('登録に失敗しました: ' + error, 'error'); return }
        showToast('社員を登録しました。メールアドレス+パスワードで直ちにログインできます')
      } else {
        const employeeFields = {
          employee_no: direct.employee_no, full_name: direct.full_name, kana: direct.kana,
          email: direct.email, phone: direct.phone, address: direct.address,
          emergency_contact_name: direct.emergency_contact_name, emergency_contact_phone: direct.emergency_contact_phone,
          hire_date: direct.hire_date, retirement_date: direct.retirement_date,
          employment_type: direct.employment_type, social_insurance: direct.social_insurance,
          notes: direct.notes, status: direct.status, photo_url: photoUrl,
        }
        const assignment = location_id ? { location_id, department_id, position } : null
        const { error } = await update(form.id, employeeFields, assignment)
        if (error) { showToast('保存に失敗しました: ' + error, 'error'); return }
        showToast('更新しました')
      }
      setModalOpen(false)
      setPendingPhoto(null)
    } catch (e) {
      showToast('保存に失敗しました: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <HubShell>
      <DarkPage maxWidth={960}>
        {/* Page chrome always renders, regardless of data-fetch state —
            a failed/slow fetch must never blank the title or actions. */}
        <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: DASH.gold, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>
              社員管理
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: DASH.textMain, margin: '0 0 5px' }}>
              社員ディレクトリ
            </h1>
            <div style={{ fontSize: 13, color: DASH.textFaint }}>
              大栄商事株式会社に所属する社員の一覧
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {permissions.canWrite && <Btn onClick={openNew} icon="ti-plus" label="社員を追加" color={DASH.green} />}
            <Btn onClick={() => navigate('/hotels/rico-mikuni/sales/settings')} icon="ti-settings" label="スタッフ・権限設定へ" color={DASH.gold} outline />
          </div>
        </div>

        {/* The table frame (headers, borders) always renders — only the
            body row changes between loading/error/empty/data, so a
            failed or slow fetch never removes the table itself. */}
        <div style={{ background: DASH.card, borderRadius: 16, border: `1px solid ${DASH.border}`, overflow: 'hidden', boxShadow: DASH.cardShadow }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(212,175,55,.08)' }}>
                  {['', '社員番号', '氏名', '役職', '部署', '配属先', '状態', ''].map((h, i) => (
                    <th key={i} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>
                      <i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px', textAlign: 'center' }}>
                      <div style={{ color: DASH.alert, fontSize: 12, marginBottom: 8 }}>
                        <i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />社員データを取得できませんでした
                      </div>
                      <Btn onClick={refresh} icon="ti-refresh" label="再試行" color={DASH.brandNavy} sm />
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: DASH.textFaint, fontSize: 12 }}>
                      社員データがありません
                    </td>
                  </tr>
                ) : employees.map((e, i) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/employees/${e.id}`)}
                    style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '9px 0 9px 14px' }}><EmployeeAvatar photoUrl={e.photo_url} name={e.full_name} size={28} /></td>
                    <td style={{ padding: '9px 14px', color: DASH.textFaint, whiteSpace: 'nowrap' }}>{e.employee_no || '—'}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: DASH.textMain, whiteSpace: 'nowrap' }}>{e.full_name}</td>
                    <td style={{ padding: '9px 14px', color: DASH.textSub }}>{e.position || '—'}</td>
                    <td style={{ padding: '9px 14px', color: DASH.textSub }}>{e.department_name || '—'}</td>
                    <td style={{ padding: '9px 14px', color: DASH.textSub }}>{e.location_name || '—'}</td>
                    <td style={{ padding: '9px 14px' }}><Badge status={STATUS_LABEL[e.status] || e.status} /></td>
                    <td style={{ padding: '9px 14px' }}>
                      {permissions.canWrite && (
                        <button onClick={openEdit(e)} title="編集" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DASH.gold, padding: 4 }}>
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
      </DarkPage>

      {modalOpen && (
        <EmployeeForm
          form={form}
          setForm={setForm}
          locations={locations}
          departments={departments}
          roles={roles}
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

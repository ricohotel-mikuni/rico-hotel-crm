import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmployees, useLocations, useDepartments, useTable } from '../../hooks/useData'
import { useAuth } from '../../contexts/AuthContext'
import { uploadEmployeeFile } from '../../lib/storage'
import HubShell from '../../layout/HubShell'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeForm from './EmployeeForm'
import { AsyncBoundary, TableSkeleton, Btn, Badge, Empty, FV, G2, Toast } from '../../ui'
import { C } from '../../lib/constants'

const STATUS_LABEL = { active: '在籍中', inactive: '退職済み' }

// 拡張タブの一覧。real=true の5つは今回の基盤で本当にテーブルがあり
// (空の状態から表示される)、false の4つは他モジュール(シフト管理・
// 書類管理・日報・AI)ができてから中身をつなぐ「準備中」プレースホルダー。
const TABS = [
  { id: 'qualifications', label: '資格・免許', icon: 'ti-certificate', real: true },
  { id: 'health',          label: '健康診断',   icon: 'ti-heart-rate-monitor', real: true },
  { id: 'evaluations',     label: '評価',       icon: 'ti-star',       real: true },
  { id: 'trainings',       label: '教育履歴',   icon: 'ti-school',     real: true },
  { id: 'interviews',      label: '面談履歴',   icon: 'ti-message-circle', real: true },
  { id: 'contracts',       label: '契約書',     icon: 'ti-file-text',  real: false },
  { id: 'shifts',          label: 'シフト',     icon: 'ti-calendar-time', real: false },
  { id: 'reports',         label: '日報',       icon: 'ti-notebook',   real: false },
  { id: 'ai',              label: 'AI分析',     icon: 'ti-sparkles',   real: false },
]

const TABLE_BY_TAB = {
  qualifications: 'employee_qualifications',
  health: 'employee_health_checks',
  evaluations: 'employee_evaluations',
  trainings: 'employee_trainings',
  interviews: 'employee_interviews',
}

function TabPanel({ tabId, employeeId }) {
  const table = TABLE_BY_TAB[tabId]
  const { data, loading, error, refresh } = useTable(table, q => q.select('*').eq('employee_id', employeeId).order('created_at', { ascending: false }))

  return (
    <AsyncBoundary loading={loading} error={error} onRetry={refresh} skeleton={<TableSkeleton rows={3} columns={3} />}>
      {data.length === 0
        ? <Empty icon={TABS.find(t => t.id === tabId).icon} title="まだデータがありません" />
        : (
          <div>
            {data.map(row => (
              <div key={row.id} style={{ background: '#F8F9FA', borderRadius: 7, padding: '10px 12px', marginBottom: 8, border: '1px solid #ECEFF1', fontSize: 12, color: '#455A64' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{JSON.stringify(row, null, 2)}</pre>
              </div>
            ))}
          </div>
        )
      }
    </AsyncBoundary>
  )
}

// 社員プロフィール(/employees/:id) — 将来 評価/資格/契約書/面談履歴/
// 日報/AI分析 を追加できるようタブ構造にした拡張前提の画面。
export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const { employees, loading, error, refresh, update } = useEmployees()
  const { locations } = useLocations()
  const { departments } = useDepartments()

  const [tab, setTab] = useState('qualifications')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({})
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }

  const emp = employees.find(e => e.id === id)
  const openEdit = () => { setForm({ ...emp }); setPendingPhoto(null); setModalOpen(true) }

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
      const { error } = await update(form.id, employeeFields, assignment)
      if (error) { showToast('保存に失敗しました: ' + error, 'error'); return }
      showToast('更新しました')
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 56px' }}>
        <button
          onClick={() => navigate('/employees')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#90A4AE', fontSize: 12, padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
        >
          <i className="ti ti-chevron-left" style={{ fontSize: 13 }} /> 社員一覧へ戻る
        </button>

        {/* Profile card frame always renders — the back button above and
            this frame stay visible through loading/error, only the
            content inside changes. */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECEFF1', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#90A4AE', fontSize: 12, padding: '24px 0' }}>
              <i className="ti ti-loader-2" style={{ fontSize: 15, marginRight: 6 }} />読み込み中…
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ color: '#C62828', fontSize: 12, marginBottom: 8 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />社員情報を取得できませんでした
              </div>
              <Btn onClick={refresh} icon="ti-refresh" label="再試行" color={C.navy} sm />
            </div>
          ) : !emp ? (
            <Empty icon="ti-user-off" title="社員が見つかりません" />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <EmployeeAvatar photoUrl={emp.photo_url} name={emp.full_name} size={72} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h1 style={{ fontSize: 19, fontWeight: 700, color: C.navy, margin: '0 0 3px' }}>{emp.full_name}</h1>
                  <div style={{ fontSize: 12, color: '#90A4AE', marginBottom: 6 }}>{emp.kana}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: '#607D8B' }}>
                    <span>{emp.position || '役職未設定'}</span>
                    <span>/ {emp.department_name || '部署未設定'}</span>
                    <span>/ {emp.location_name || '配属先未設定'}</span>
                    <Badge status={STATUS_LABEL[emp.status] || emp.status} />
                  </div>
                </div>
                {permissions.canWrite && <Btn onClick={openEdit} icon="ti-edit" label="編集" color={C.navy} outline sm />}
              </div>

              <div style={{ height: 1, background: '#ECEFF1', margin: '16px 0' }} />

              <G2>
                <FV label="社員番号" value={emp.employee_no} />
                <FV label="雇用区分" value={emp.employment_type} />
                <FV label="メールアドレス" value={emp.email} />
                <FV label="電話番号" value={emp.phone} />
                <FV label="入社日" value={emp.hire_date} />
                <FV label="退職日" value={emp.retirement_date} />
              </G2>
              <div style={{ height: 8 }} />
              <FV label="住所" value={emp.address} />
              <div style={{ height: 8 }} />
              <G2>
                <FV label="緊急連絡先(氏名)" value={emp.emergency_contact_name} />
                <FV label="緊急連絡先(電話)" value={emp.emergency_contact_phone} />
              </G2>
              <div style={{ height: 8 }} />
              <FV
                label="社会保険"
                value={['health', 'pension', 'employment']
                  .filter(k => emp.social_insurance?.[k])
                  .map(k => ({ health: '健康保険', pension: '厚生年金', employment: '雇用保険' }[k]))
                  .join(' / ') || undefined}
              />
              <div style={{ height: 8 }} />
              <FV label="メモ" value={emp.notes} />
            </>
          )}
        </div>

        {/* Extensible tabs — only meaningful once we actually have emp */}
        {!loading && !error && emp && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECEFF1', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #ECEFF1', overflowX: 'auto' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap',
                    color: tab === t.id ? C.navy : '#90A4AE',
                    borderBottom: tab === t.id ? `2px solid ${C.gold}` : '2px solid transparent',
                    marginBottom: -2, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
                  {t.label}
                  {!t.real && <span style={{ fontSize: 9, color: '#BDBDBD' }}>(準備中)</span>}
                </button>
              ))}
            </div>
            <div style={{ padding: 16 }}>
              {TABS.find(t => t.id === tab).real
                ? <TabPanel tabId={tab} employeeId={emp.id} />
                : <Empty icon={TABS.find(t => t.id === tab).icon} title="この項目は準備中です。今後のモジュール追加時に接続されます。" />
              }
            </div>
          </div>
        )}
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
          isNew={false}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </HubShell>
  )
}

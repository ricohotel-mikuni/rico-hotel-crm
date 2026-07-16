import Modal from '../../ui/Modal'
import { G2 } from '../../ui'
import { DASH } from '../../lib/designSystem'
import { DarkField, DarkSelect, DarkTextarea, DarkDivider, DarkImageUpload } from '../../ui/DesignSystemKit'

const STATUS_OPTIONS = ['active', 'inactive']
const INSURANCE_KEYS = [
  { key: 'health', label: '健康保険' },
  { key: 'pension', label: '厚生年金' },
  { key: 'employment', label: '雇用保険' },
]

function InsuranceCheckboxes({ value, onChange }) {
  const v = value || {}
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 5, fontWeight: 500 }}>
        社会保険
      </label>
      <div style={{ display: 'flex', gap: 16 }}>
        {INSURANCE_KEYS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: DASH.textSub, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!v[key]}
              onChange={e => onChange({ ...v, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}

// 社員追加・編集モーダル — Clients.jsx と同じ「1本の縦スクロールフォーム」
// パターンを踏襲(直接列は既存の DarkField/DarkTextarea/DarkSelectで、
// 配属先だけ locations/departments を参照する専用セレクトにしている)。
// Design System v1.0(承認済み提案書「Design System v1.0 仕様変更」)。
//
// isNew(新規登録)のときだけ「ログイン・権限」欄を表示する(ERP開発
// 憲章第38条・第39条) — 初期パスワード・PIN・権限・所属会社は、
// 保存と同時にAuthアカウント作成〜権限付与までを行う
// create-employee Edge Functionへそのまま渡す。既存社員の編集では
// Authアカウントを再作成しないため表示しない(権限変更は設定画面の
// ユーザー管理から行う)。
export default function EmployeeForm({
  form, setForm, locations, departments, roles = [], positions = [], employmentTypes = [], pendingPhoto, onPhotoFile,
  onSave, onClose, saving, isNew,
}) {
  const set = k => v => setForm(p => ({ ...p, [k]: v }))
  const deptOptions = departments.filter(d => !form.location_id || d.location_id === form.location_id)

  return (
    <Modal
      dark
      title={isNew ? '新規社員登録' : `編集: ${form.full_name || ''}`}
      icon="ti-user-plus"
      onClose={onClose}
      onSave={onSave}
      saving={saving}
      width={620}
    >
      <G2>
        <DarkField label="社員番号" value={form.employee_no} onChange={set('employee_no')} />
        <DarkSelect label="状態(有効/無効)" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
      </G2>
      <G2>
        <DarkField label="氏名" value={form.full_name} onChange={set('full_name')} required placeholder="山田 太郎" />
        <DarkField label="フリガナ" value={form.kana} onChange={set('kana')} placeholder="ヤマダ タロウ" />
      </G2>

      <DarkImageUpload label="顔写真" icon="ti-user" value={form.photo_url} file={pendingPhoto} onFile={onPhotoFile} />

      {isNew && (
        <>
          <DarkDivider />
          <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 8, fontWeight: 500 }}>ログイン・権限(新規登録時のみ設定)</div>
          <G2>
            <DarkField label="初期パスワード(8文字以上)" value={form.password} onChange={set('password')} type="password" required />
            <DarkField label="PIN(6桁・任意、後日本人が設定も可)" value={form.pin} onChange={v => set('pin')(v.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="123456" />
          </G2>
          <G2>
            <div style={{ marginBottom: 9 }}>
              <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>権限</label>
              <select
                value={form.role_key || ''}
                onChange={e => set('role_key')(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit', outline: 'none' }}
              >
                <option value="">選択してください</option>
                {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 9 }}>
              <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>所属会社</label>
              <select value="daiei" disabled style={{ width: '100%', padding: '8px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 13, background: DASH.inputBg, color: DASH.textFaint, fontFamily: 'inherit', opacity: .7 }}>
                <option value="daiei">大栄商事株式会社</option>
              </select>
            </div>
          </G2>
        </>
      )}

      <DarkDivider />
      <G2>
        <DarkSelect label="雇用区分" value={form.employment_type} onChange={set('employment_type')} options={employmentTypes.map(t => t.name)} />
        <DarkField label="入社日" value={form.hire_date} onChange={set('hire_date')} type="date" />
        <DarkField label="退職日" value={form.retirement_date} onChange={set('retirement_date')} type="date" />
      </G2>

      <DarkDivider />
      <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 8, fontWeight: 500 }}>配属先</div>
      <G2>
        <div style={{ marginBottom: 9 }}>
          <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>拠点</label>
          <select
            value={form.location_id || ''}
            onChange={e => setForm(p => ({ ...p, location_id: e.target.value || null, department_id: null }))}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit', outline: 'none' }}
          >
            <option value="">選択してください</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 9 }}>
          <label style={{ fontSize: 11, color: DASH.textFaint, display: 'block', marginBottom: 3, fontWeight: 500 }}>部署</label>
          <select
            value={form.department_id || ''}
            onChange={e => set('department_id')(e.target.value || null)}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 13, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit', outline: 'none' }}
          >
            <option value="">選択してください</option>
            {deptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </G2>
      <DarkSelect label="役職" value={form.position} onChange={set('position')} options={positions.map(p => p.name)} />

      <DarkDivider />
      <G2>
        <DarkField label="メールアドレス" value={form.email} onChange={set('email')} type="email" />
        <DarkField label="電話番号" value={form.phone} onChange={set('phone')} placeholder="090-XXXX-XXXX" />
      </G2>
      <DarkField label="住所" value={form.address} onChange={set('address')} />
      <G2>
        <DarkField label="緊急連絡先(氏名)" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
        <DarkField label="緊急連絡先(電話)" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
      </G2>

      <DarkDivider />
      <InsuranceCheckboxes value={form.social_insurance} onChange={set('social_insurance')} />
      <DarkTextarea label="メモ" value={form.notes} onChange={set('notes')} />
    </Modal>
  )
}

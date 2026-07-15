import { useState } from 'react'
import { useUsers, useRoles } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { AsyncBoundary, TableSkeleton, Toast } from '../../../ui'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkPanel } from '../../../ui/DesignSystemKit'

// 設定(ユーザー管理・システム情報) — Design System v1.0。
// ERP開発憲章第38条(社員マスタの一元化)に伴い、「新しいスタッフを
// 追加」機能はここから廃止した — 社員登録は社員ディレクトリ
// (EmployeeForm、create-employee Edge Function)の1経路に統一する。
// ユーザー管理テーブルもuser_profilesの直接参照をやめ、
// v_employee_accounts(employees + employee_rolesベース)を見る。
export default function Settings() {
  const { users, loading, error: loadError, refresh, updateRole } = useUsers()
  const { profile, permissions } = useAuth()
  const { roles } = useRoles()
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000) }

  const changeRole = async (employeeId, roleKey) => {
    const { error } = await updateRole(employeeId, roleKey)
    if (error) showToast('変更に失敗しました: ' + error, 'error')
    else showToast('権限を変更しました')
  }

  return (
    <DarkPage maxWidth={800}>
      <h1 style={{ fontSize: 16, fontWeight: 700, color: DASH.textMain, margin: '0 0 16px' }}>設定</h1>

      {/* User list — only this reacts to loading/error */}
      <AsyncBoundary loading={loading} error={loadError} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={4} />}>
      <div style={{ marginBottom: 16 }}>
        <DarkPanel title={<>ユーザー管理 <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: DASH.textFaint }}>全 {users.length} 名</span></>}>
          <div style={{ fontSize: 11, color: DASH.textFaint, marginBottom: 10 }}>
            社員登録(社員ディレクトリ)で作成された、ログイン資格を持つ社員のみ表示しています。新しい社員の追加は社員ディレクトリから行ってください。
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['氏名', 'メールアドレス', '権限', '変更'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: DASH.gold, fontWeight: 700, borderBottom: `1px solid ${DASH.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.employee_id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 600, color: DASH.textMain }}>{u.full_name}</div>
                    {u.user_id === profile?.id && <span style={{ fontSize: 10, color: DASH.green }}>（あなた）</span>}
                  </td>
                  <td style={{ padding: '10px', color: DASH.textFaint, fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: '10px', color: DASH.textSub, fontSize: 12 }}>
                    {u.role_labels?.length ? u.role_labels.join(' / ') : '未設定'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {permissions.canManageUsers && u.user_id !== profile?.id ? (
                      <select
                        value={u.role_keys?.[0] || ''}
                        onChange={e => changeRole(u.employee_id, e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 12, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
                      >
                        <option value="">選択してください</option>
                        {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, color: DASH.textFaint }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </DarkPanel>
      </div>
      </AsyncBoundary>

      {/* System info */}
      <DarkPanel title="システム情報">
        {[
          ['システム名', 'リコホテル三国 営業管理システム v5.0'],
          ['データベース', 'Supabase (PostgreSQL) — クラウド保存'],
          ['リアルタイム同期', '有効 — 全デバイスで自動同期'],
          ['データバックアップ', 'Supabase が毎日自動バックアップ'],
          ['対応デバイス', 'PC / Mac / iPhone / iPad / Android'],
        ].map(([l, v], i) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none', fontSize: 12 }}>
            <span style={{ color: DASH.textFaint, fontWeight: 500 }}>{l}</span>
            <span style={{ color: DASH.textMain, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </DarkPanel>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DarkPage>
  )
}

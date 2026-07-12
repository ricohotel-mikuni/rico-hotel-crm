import { useState } from 'react'
import { useUsers } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Btn, Badge, AsyncBoundary, TableSkeleton, Toast } from '../../../ui'
import { ROLES } from '../../../lib/constants'
import { DASH } from '../../../lib/designSystem'
import { DarkPage, DarkPanel, DarkField, DarkSelect } from '../../../ui/DesignSystemKit'

// 設定(ユーザー管理・システム情報) — Design System v1.0(承認済み
// 提案書「Design System v1.0 仕様変更」)。認証・ユーザー招待・権限
// 変更のロジックは一切変更していない。
export default function Settings() {
  const { users, loading, error: loadError, refresh, updateRole } = useUsers()
  const { profile, permissions } = useAuth()
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'sales' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000) }

  const inviteUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      return showToast('全ての項目を入力してください', 'error')
    }
    if (!permissions.canManageUsers) return showToast('管理者のみユーザーを追加できます', 'error')
    setSaving(true)
    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: { data: { full_name: newUser.full_name, role: newUser.role } },
    })
    if (error) { showToast('追加に失敗: ' + error.message, 'error'); setSaving(false); return }
    // Update profile role explicitly
    if (data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id, email: newUser.email,
        full_name: newUser.full_name, role: newUser.role,
      })
    }
    showToast(`${newUser.full_name} さんを追加しました`)
    setNewUser({ email: '', full_name: '', password: '', role: 'sales' })
    setSaving(false)
  }

  const changeRole = async (userId, role) => {
    const { error } = await updateRole(userId, role)
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
                <tr key={u.id} style={{ borderTop: i > 0 ? `1px solid ${DASH.border}` : 'none' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 600, color: DASH.textMain }}>{u.full_name}</div>
                    {u.id === profile?.id && <span style={{ fontSize: 10, color: DASH.green }}>（あなた）</span>}
                  </td>
                  <td style={{ padding: '10px', color: DASH.textFaint, fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: '10px' }}>
                    <Badge status={ROLES[u.role]?.label || u.role} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    {permissions.canManageUsers && u.id !== profile?.id ? (
                      <select
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${DASH.border}`, borderRadius: 7, fontSize: 12, background: DASH.inputBg, color: DASH.textMain, fontFamily: 'inherit' }}
                      >
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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

      {/* Add user */}
      {permissions.canManageUsers && (
        <div style={{ marginBottom: 16 }}>
          <DarkPanel title="新しいスタッフを追加">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              <DarkField label="氏名" value={newUser.full_name} onChange={v => setNewUser(p => ({ ...p, full_name: v }))} placeholder="山田 太郎" />
              <DarkField label="メールアドレス" value={newUser.email} onChange={v => setNewUser(p => ({ ...p, email: v }))} type="email" placeholder="yamada@example.com" />
              <DarkField label="初期パスワード（8文字以上）" value={newUser.password} onChange={v => setNewUser(p => ({ ...p, password: v }))} type="password" />
              <DarkSelect label="権限" value={newUser.role} onChange={v => setNewUser(p => ({ ...p, role: v }))} options={Object.entries(ROLES).map(([k]) => k)} />
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Btn onClick={inviteUser} icon={saving ? 'ti-loader' : 'ti-user-plus'} label={saving ? '追加中…' : 'スタッフを追加'} color={DASH.gold} disabled={saving} />
              <span style={{ fontSize: 11, color: DASH.textFaint }}>追加後、スタッフは上記のメール・パスワードでログインできます</span>
            </div>
          </DarkPanel>
        </div>
      )}

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

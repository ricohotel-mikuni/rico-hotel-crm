import { useState } from 'react'
import { useUsers } from '../../../hooks/useData'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Btn, Badge, FI, FS, AsyncBoundary, TableSkeleton, Toast } from '../../../ui'
import { C, ROLES } from '../../../lib/constants'

export default function Settings() {
  const { users, loading, error: loadError, refresh, updateRole } = useUsers()
  const { profile, permissions, refetchProfile } = useAuth()
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
    <div style={{ padding: '18px 16px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: '0 0 16px' }}>設定</h1>

      {/* User list — only this reacts to loading/error */}
      <AsyncBoundary loading={loading} error={loadError} onRetry={refresh} skeleton={<TableSkeleton rows={4} columns={4} />}>
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 16 }}>
        <div style={{ padding: '10px 16px', background: C.navy, fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-users" style={{ fontSize: 14 }} />
          ユーザー管理
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, opacity: .7 }}>全 {users.length} 名</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F5F7FA' }}>
              {['氏名', 'メールアドレス', '権限', '変更'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: '#607D8B', fontWeight: 600, borderBottom: '1px solid #ECEFF1' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 ? '#FAFAFA' : '#fff', borderBottom: '1px solid #F5F5F5' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: C.navy }}>{u.full_name}</div>
                  {u.id === profile?.id && <span style={{ fontSize: 10, color: '#4CAF50' }}>（あなた）</span>}
                </td>
                <td style={{ padding: '10px 14px', color: '#607D8B', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  <Badge status={ROLES[u.role]?.label || u.role} />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {permissions.canManageUsers && u.id !== profile?.id ? (
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      style={{ padding: '5px 8px', border: '1px solid #E0E0E0', borderRadius: 5, fontSize: 12, background: '#FFFDE7', fontFamily: 'inherit' }}
                    >
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: 11, color: '#BDBDBD' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </AsyncBoundary>

      {/* Add user */}
      {permissions.canManageUsers && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #ECEFF1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-user-plus" style={{ fontSize: 14 }} />
            新しいスタッフを追加
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            <FI label="氏名" value={newUser.full_name} onChange={v => setNewUser(p => ({ ...p, full_name: v }))} placeholder="山田 太郎" />
            <FI label="メールアドレス" value={newUser.email} onChange={v => setNewUser(p => ({ ...p, email: v }))} type="email" placeholder="yamada@example.com" />
            <FI label="初期パスワード（8文字以上）" value={newUser.password} onChange={v => setNewUser(p => ({ ...p, password: v }))} type="password" />
            <FS label="権限" value={newUser.role} onChange={v => setNewUser(p => ({ ...p, role: v }))} options={Object.entries(ROLES).map(([k, v]) => k)} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn onClick={inviteUser} icon={saving ? 'ti-loader' : 'ti-user-plus'} label={saving ? '追加中…' : 'スタッフを追加'} color={C.navy} disabled={saving} />
            <span style={{ fontSize: 11, color: '#90A4AE' }}>追加後、スタッフは上記のメール・パスワードでログインできます</span>
          </div>
        </div>
      )}

      {/* System info */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ECEFF1', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #ECEFF1' }}>システム情報</div>
        {[
          ['システム名', 'リコホテル三国 営業管理システム v5.0'],
          ['データベース', 'Supabase (PostgreSQL) — クラウド保存'],
          ['リアルタイム同期', '有効 — 全デバイスで自動同期'],
          ['データバックアップ', 'Supabase が毎日自動バックアップ'],
          ['対応デバイス', 'PC / Mac / iPhone / iPad / Android'],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F5F5F5', fontSize: 12 }}>
            <span style={{ color: '#90A4AE', fontWeight: 500 }}>{l}</span>
            <span style={{ color: C.navy, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

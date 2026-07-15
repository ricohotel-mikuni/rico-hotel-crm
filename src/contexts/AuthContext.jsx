import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/constants'

const AuthContext = createContext(null)

// PINの設計方針(2026-07-09、認証フロー不具合の根本修正で確定): 実際の
// @supabase/auth-js ソース(GoTrueClient.js `_signOut`)を確認したところ、
// signOut()は scope:'local' を指定してもサーバーの /logout を必ず呼び、
// 「今まさに使っているこのセッション」のrefresh tokenをscopeに関わらず
// 失効させることが分かった('local'は「他のセッションを巻き込まない」
// という意味でしかない)。そのため「ログアウトしたセッションのrefresh
// tokenを後でPINログイン時に再利用する」という以前の設計は、そもそも
// 両立し得なかった。
//
// 新方針: PINは「セッションを破棄して後で復元する」ものではなく、
// 「生きたままのセッションの上に被せるロック画面」とする。
// - `signOut()` は本当にSupabaseセッションを破棄する、正真正銘のログアウト。
// - `lock()`/`unlock()` はSupabaseへ一切アクセスしない、純粋にこのタブ内
//   だけの表示状態の切り替え。ロック中もSupabaseセッション自体は生きた
//   ままなので、PIN照合(verify_employee_pin RPC)に成功したら
//   unlock()を呼ぶだけでダッシュボードに戻れる — refresh_tokenの保存も
//   再提示も一切不要になり、トークンの失効・ローテーションに起因する
//   このクラスの不具合自体が発生しなくなる。
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [locked, setLocked] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
    if (error) console.error('Profile fetch error:', error)
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLocked(true) // 次回、セッションが復活したら改めてロック状態から始める
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'メールアドレスまたはパスワードが正しくありません'
        : error.message)
      return { error }
    }
    return { data }
  }

  // 正真正銘のサインアウト — Supabaseセッションを実際に破棄する。
  // 信頼済み端末が無いユーザーの通常ログアウト、またはPINが使えなく
  // なった場合(端末失効・繰り返し失敗等)のパスワードへの差し戻しに使う。
  const signOut = async () => {
    // 監査ログ(migration 015 record_logout)は auth.uid() が必要なため
    // 必ずsignOut()より先に呼ぶ — 失敗してもログアウト自体は続行する。
    await supabase.rpc('record_logout').catch(e => console.error('[AuthContext] record_logout failed:', e))
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[AuthContext] signOut error:', error)
    setUser(null)
    setProfile(null)
    setLocked(true)
  }

  // ロック(Supabaseへは触れない、表示状態の切り替えのみ)
  const lock = () => setLocked(true)
  const unlock = () => setLocked(false)

  const role = profile?.role ?? 'viewer'
  const permissions = ROLES[role] ?? ROLES.viewer

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      permissions,
      loading,
      error,
      locked,
      signIn,
      signOut,
      lock,
      unlock,
      refetchProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

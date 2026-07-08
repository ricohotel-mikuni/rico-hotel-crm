import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const signOut = async () => {
    // scope:'local' はこのブラウザのセッションだけを終了し、サーバー側の
    // refresh tokenを失効させない。デフォルト(scope:'global')は
    // refresh tokenをサーバー側で即座に失効させてしまい、信頼済み端末が
    // PINログイン用に保存している refresh_token まで道連れで無効化される
    // ため、ログアウト直後にPINが「端末登録期限切れ」になる不具合の
    // 原因になっていた。PINログインは「同じ端末に残る正規セッションの
    // 再提示」という設計(ERP開発憲章第16条)なので、通常のログアウトは
    // その再提示能力を壊してはならない。
    await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
    setProfile(null)
  }

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
      signIn,
      signOut,
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

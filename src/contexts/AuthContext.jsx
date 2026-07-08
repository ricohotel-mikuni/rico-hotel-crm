import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/constants'
import { updateRosterToken, findRosterEntry, maskToken } from '../auth/deviceTrust'

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

  // Supabaseのrefresh tokenは使い捨て(ローテーション)で、
  // autoRefreshToken:true(src/lib/supabase.js)により、アプリを開いた
  // ままでも裏側で定期的に新しいトークンへ入れ替わる。信頼済み端末の
  // roster(localStorage)にPIN登録時の1回分だけ保存していると、この
  // 裏側の入れ替わりに追従できず、時間が経つと保存済みトークンが
  // 「もう使われていない古い世代」になってしまう(refreshSession()が
  // 失敗する一因になり得る)。そこで、認証状態が変化するたび
  // (SIGNED_IN・TOKEN_REFRESHED等)に、今ログイン中の社員がこの端末の
  // rosterに載っていれば、常に最新のrefresh_tokenへ上書きしておく。
  const syncRosterToken = useCallback(async (session) => {
    if (!session?.user || !session?.refresh_token) return
    const { data: emp, error: empErr } = await supabase
      .from('employees').select('id').eq('user_id', session.user.id).maybeSingle()
    if (empErr) { console.error('[DAI-AUTH][AuthContext] syncRosterToken: employee lookup failed', empErr); return }
    if (!emp) return
    if (!findRosterEntry(emp.id)) return // この端末は信頼済みではない — 何もしない
    console.log('[DAI-AUTH][AuthContext] syncRosterToken: employee_id=%s refresh_token=%s',
      emp.id, maskToken(session.refresh_token))
    updateRosterToken(emp.id, session.refresh_token)
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
      syncRosterToken(session)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // 診断用: TOKEN_REFRESHED/SIGNED_IN/SIGNED_OUT等、いつrefresh_token
        // が入れ替わっているかを追うためのログ(PINログイン不具合の調査)。
        console.log('[DAI-AUTH][AuthContext] onAuthStateChange event=%s hasSession=%s', _event, Boolean(session))
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
        syncRosterToken(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, syncRosterToken])

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
    console.log('[DAI-AUTH][AuthContext] ③ signOut(scope:local) 呼び出し — PIN/端末登録情報(localStorage)には触れません')
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) console.error('[DAI-AUTH][AuthContext] signOut error:', error)
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

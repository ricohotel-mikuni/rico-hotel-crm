import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../ui'
import { C } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { getDeviceId, JUST_PASSWORD_SIGNED_IN_KEY, hasTrustedRoster } from './deviceTrust'
import AuthShell from './AuthShell'

// PC版NEOの吹き出し専用の自己紹介文(承認済み提案書Ver.5最終指示③)。
// スマホ版は文字数が多いと直前に直した下部の見切れが再発しかねない
// ため、スマホは従来どおり時間帯挨拶(daiGreeting())のままにしている
// — AuthShellのdesktopBubbleTextはPC左側の大きいNEOにしか効かない。
const NEO_INTRO = 'はじめまして！👋\n私はNEO（ネオ）です🤖\n大栄商事株式会社の公式AIとして、\n皆さまのお仕事をサポートします💪\n今日も一緒に最高の一日にしていきましょう！✨'

export default function Login({ notice, onLoggedIn }) {
  const { signIn, error, unlock } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [pinTapped, setPinTapped] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setLocalError('メールアドレスとパスワードを入力してください'); return }
    setLoading(true)
    setLocalError('')
    const { error: err } = await signIn(email, password)
    if (err) {
      setLocalError(err)
    } else {
      // App.jsx reads this flag once (right after mount, before the
      // employee's next PIN login) to decide whether to offer the
      // 「この端末を信頼する」+ PIN登録ステップ. It must NOT fire on
      // session restore (page reload) or on a PIN-based sign-in, only
      // on an actual password submit — sessionStorage (not localStorage)
      // makes it self-clearing per tab and PinLogin never sets it.
      sessionStorage.setItem(JUST_PASSWORD_SIGNED_IN_KEY, '1')
      supabase.rpc('record_password_login', { p_device_id: getDeviceId() })
        .then(({ error }) => { if (error) console.error('[Login] record_password_login failed:', error) })
        .catch(e => console.error('[Login] record_password_login threw:', e))
      // パスワードでの認証はPINより強い証明なので、このタブでは
      // 改めてPINロックを要求しない(次回起動時は通常どおりロックされる)。
      unlock()
      onLoggedIn?.()
    }
    setLoading(false)
  }

  // この画面が出ている時点で生きたSupabaseセッションは無い(App.jsxが
  // `!user`の場合しかLoginを出さない)ため、PINは検証しようがない
  // (PINは既存セッションの上に被せるロック画面 — AuthContext.jsx冒頭の
  // 設計コメント参照)。それでも切替ボタンは常に両方表示する(承認済み
  // 提案書Ver.4最終指示⑥)方針のため、押されたら実際には切り替えず、
  // その旨を案内するにとどめる。
  const pinNotice = hasTrustedRoster()
    ? 'この端末は登録済みですが、今セッションが有効でないためPINは使えません。まずパスワードでログインしてください。'
    : 'この端末はまだPINログインが設定されていません。ログイン後に設定できます。'

  return (
    <AuthShell
      mode={pinTapped ? 'pin' : 'password'}
      onSelectPassword={() => setPinTapped(false)}
      onSelectPin={() => setPinTapped(true)}
      desktopBubbleText={NEO_INTRO}
    >
      {notice && (
        <div className="auth-notice">
          <i className="ti ti-info-circle" style={{ flexShrink: 0 }} />
          {notice}
        </div>
      )}

      {pinTapped ? (
        <div className="auth-notice">{pinNotice}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="auth-label">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="auth-input"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="auth-label">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="auth-input"
            />
          </div>

          {(localError || error) && (
            <div className="auth-error">
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
              {localError || error}
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? <Spinner size={18} color={C.navyDark} /> : <i className="ti ti-login" />}
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      )}

      <style>{`
        .auth-label { font-size: 11px; color: rgba(255,255,255,.65); display: block; margin-bottom: 6px; font-weight: 600; }
        .auth-input {
          width: 100%; padding: 12px 14px; border-radius: 10px; font-size: 13.5px; outline: none;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.22); color: #fff;
          transition: border-color .15s, background .15s; font-family: inherit;
        }
        .auth-input::placeholder { color: rgba(255,255,255,.38); }
        .auth-input:focus { border-color: ${C.gold}; background: rgba(255,255,255,.12); }
        @media (min-width: 860px) {
          .auth-label { font-size: 12.5px; }
          .auth-input { padding: 14px 16px; font-size: 15px; }
          .auth-submit { padding: 15px; font-size: 16px; }
        }
        .auth-notice {
          background: rgba(255,255,255,.09); color: #fff; font-size: 12.5px; padding: 10px 14px; border-radius: 9px;
          margin-bottom: 18px; border: 1px solid rgba(255,255,255,.18); display: flex; align-items: center; gap: 8px;
          line-height: 1.6;
        }
        .auth-error {
          background: rgba(224,137,122,.16); color: #f4b5a8; font-size: 13px; padding: 10px 14px; border-radius: 9px;
          margin-bottom: 16px; border: 1px solid rgba(224,137,122,.35); display: flex; align-items: center; gap: 8px;
        }
        .auth-submit {
          width: 100%; padding: 13px; background: ${C.gold}; color: ${C.navyDark}; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 8px; transition: filter .2s; font-family: inherit;
        }
        .auth-submit:disabled { opacity: .6; cursor: not-allowed; }
        .auth-submit:not(:disabled):hover { filter: brightness(1.06); }
      `}</style>
    </AuthShell>
  )
}

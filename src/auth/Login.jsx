import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBrand } from '../branding/BrandContext'
import { Spinner } from '../ui'
import { C } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { getDeviceId, JUST_PASSWORD_SIGNED_IN_KEY } from './deviceTrust'
import Dai from '../ai/Dai'
import { daiGreeting } from '../ai/daiGreeting'

// 都会夜景のボケ味(ビルの灯り)を軽量なCSSだけで表現する — 写真素材を
// 使わず、金/白の柔らかい光点をぼかして重ねるだけの簡易版(AI開発憲章の
// 「簡易版実装指示書」に基づく今回のスコープ)。
function CityNightGlow() {
  const dots = [
    { l: '8%', t: '18%', s: 46, c: 'rgba(201,168,76,.35)' },
    { l: '22%', t: '58%', s: 30, c: 'rgba(255,255,255,.18)' },
    { l: '78%', t: '22%', s: 54, c: 'rgba(201,168,76,.25)' },
    { l: '88%', t: '64%', s: 34, c: 'rgba(255,255,255,.14)' },
    { l: '55%', t: '10%', s: 26, c: 'rgba(255,255,255,.16)' },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: d.l, top: d.t, width: d.s, height: d.s,
          borderRadius: '50%', background: d.c, filter: 'blur(6px)',
        }} />
      ))}
      <svg style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '32%', opacity: .5, filter: 'blur(.5px)' }} viewBox="0 0 400 100" preserveAspectRatio="none">
        {[
          [0, 28, 60], [30, 22, 45], [55, 26, 70], [84, 20, 38],
          [107, 30, 58], [140, 24, 80], [167, 26, 50], [196, 22, 65],
          [221, 28, 42], [252, 24, 85], [279, 30, 55], [312, 22, 40],
          [337, 26, 72], [366, 34, 52],
        ].map(([x, w, h], i) => (
          <rect key={i} x={x} y={100 - h} width={w} height={h} fill="rgba(31,56,100,.5)" />
        ))}
      </svg>
    </div>
  )
}

export default function Login({ notice, onLoggedIn }) {
  const { signIn, error, unlock } = useAuth()
  const brand = useBrand()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

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
      // パスワードでの認証はPINより強い証明なので、このタブでは
      // 改めてPINロックを要求しない(次回起動時は通常どおりロックされる)。
      unlock()
      onLoggedIn?.()
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '12px 14px',
    border: '1px solid #E0E0E0', borderRadius: 7,
    fontSize: 14, outline: 'none', background: '#FAFAFA',
    transition: 'border-color .15s',
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 60%, #2E5FA3 100%)`,
    }}>
      <CityNightGlow />

      {/* Left panel — DAI(会社専属AI)が時間帯挨拶とともに出迎える。
          正式ロゴは右パネル側に別途表示するため、DAIが置き換えることは
          ない(ERP開発憲章第12〜14条・ブランド規定)。 */}
      <div style={{
        flex: 1, flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, color: '#fff', position: 'relative', zIndex: 1,
        display: 'none',  /* hidden on mobile */
      }} className="login-brand">
        <Dai expr="smile" pose="wave" size={260} />
        <div style={{
          marginTop: 22, background: 'rgba(255,255,255,.96)', color: C.navyDark,
          borderRadius: 16, padding: '14px 20px', fontSize: 14, fontWeight: 500,
          maxWidth: 260, textAlign: 'center', boxShadow: '0 14px 34px rgba(0,0,0,.28)',
          whiteSpace: 'pre-line', lineHeight: 1.6,
        }}>
          {daiGreeting()}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%', maxWidth: 440,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        margin: '0 auto', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 16, padding: '44px 40px', border: '1px solid rgba(255,255,255,.5)',
          width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.3)',
        }}>
          {/* Logo — 正式ロゴ自体に社名・タグラインが含まれるため、
              重複するテキストは表示しない */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 192, height: 192, borderRadius: 32,
              background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyDark} 100%)`,
              marginBottom: 16,
              boxShadow: '0 12px 32px rgba(31,56,100,.35)',
            }}>
              <img src={brand.logo} alt={brand.name} style={{ width: 160, height: 160, objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: 12, color: '#90A4AE', letterSpacing: 2 }}>
              {brand.subtitle}
            </div>
            <div style={{
              width: 48, height: 2, background: C.gold,
              margin: '12px auto 0', borderRadius: 1,
            }} />
          </div>

          {notice && (
            <div style={{
              background: '#EEF3FB', color: C.navy, fontSize: 12.5,
              padding: '10px 14px', borderRadius: 7, marginBottom: 18,
              border: '1px solid #D5E1F2', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-info-circle" style={{ flexShrink: 0 }} />
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#607D8B', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                style={inp}
                onFocus={e => (e.target.style.borderColor = C.navy)}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#607D8B', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inp}
                onFocus={e => (e.target.style.borderColor = C.navy)}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>

            {/* Error */}
            {(localError || error) && (
              <div style={{
                background: '#FFEBEE', color: '#C62828', fontSize: 13,
                padding: '10px 14px', borderRadius: 7, marginBottom: 16,
                border: '1px solid #FFCDD2', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
                {localError || error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#90A4AE' : C.navy,
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background .2s',
                boxShadow: loading ? 'none' : '0 2px 8px rgba(31,56,100,.3)',
              }}
            >
              {loading ? <Spinner size={18} color="#fff" /> : <i className="ti ti-login" />}
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#BDBDBD' }}>
            © 2026 {brand.name} — {brand.subtitle}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-brand { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

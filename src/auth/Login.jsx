import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBrand } from '../branding/BrandContext'
import { Spinner } from '../ui'
import { C } from '../lib/constants'

export default function Login() {
  const { signIn, error } = useAuth()
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
    if (err) setLocalError(err)
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
      minHeight: '100dvh', display: 'flex',
      background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 60%, #2E5FA3 100%)`,
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, color: '#fff',
        display: 'none',  /* hidden on mobile */
      }} className="login-brand">
        <img src={brand.logo} alt={brand.name} style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 16 }} />
        {brand.nameLines ? (
          brand.nameLines.map((line, i) => (
            <div key={i} style={{ fontSize: i === 0 ? 28 : 18, fontWeight: i === 0 ? 700 : 400, opacity: i === 0 ? 1 : .8, letterSpacing: i === 0 ? 2 : 4 }}>
              {line}
            </div>
          ))
        ) : (
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, textAlign: 'center' }}>{brand.name}</div>
        )}
        <div style={{ width: 60, height: 2, background: C.gold, margin: '20px 0' }} />
        <div style={{ fontSize: 13, opacity: .6, textAlign: 'center', lineHeight: 1.8 }}>
          {brand.subtitle}<br />{brand.tagline}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%', maxWidth: 440,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        margin: '0 auto',
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '44px 40px',
          width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.3)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 16,
              background: C.navy, marginBottom: 14,
              boxShadow: '0 4px 16px rgba(31,56,100,.3)',
            }}>
              <img src={brand.logo} alt={brand.name} style={{ width: 44, height: 44, objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, letterSpacing: 1 }}>
              {brand.name}
            </div>
            <div style={{ fontSize: 12, color: '#90A4AE', marginTop: 4, letterSpacing: 2 }}>
              {brand.tagline}
            </div>
            <div style={{
              width: 48, height: 2, background: C.gold,
              margin: '12px auto 0', borderRadius: 1,
            }} />
          </div>

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

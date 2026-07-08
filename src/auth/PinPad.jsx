import { useEffect, useState } from 'react'
import { C } from '../lib/constants'

// iPhone風の6桁PIN入力 — 入力中は「●」表示、6桁揃うと自動で
// onComplete を呼ぶ(ログインボタンを押す必要がない、提案書⑪の仕様)。
// DeviceTrustSetup(PIN登録・白カード上)とPinLogin(復帰時・紺色の
// ステージ上)の両方で使うため、明暗2テーマに対応する。
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export default function PinPad({ length = 6, onComplete, disabled, shakeToken, theme = 'dark' }) {
  const [digits, setDigits] = useState('')
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (shakeToken == null) return
    setDigits('')
    setShaking(true)
    const t = setTimeout(() => setShaking(false), 400)
    return () => clearTimeout(t)
  }, [shakeToken])

  const press = (k) => {
    // 6桁揃った直後、onCompleteの呼び出し待ち(150ms)の間に連打されて
    // 二重送信になるのを防ぐ — 親がshakeToken/アンマウントでリセット
    // するまでこの入力は締め切る。
    if (disabled || digits.length >= length) return
    let next = digits
    if (k === 'del') next = digits.slice(0, -1)
    else next = digits + k
    setDigits(next)
    if (next.length === length) {
      setTimeout(() => onComplete(next), 150)
    }
  }

  const light = theme === 'light'
  const dotIdle = light ? '#c7d0d6' : 'rgba(255,255,255,.45)'
  const dotFill = light ? C.navy : C.gold
  const keyBorder = light ? '#dbe1e6' : 'rgba(255,255,255,.22)'
  const keyBg = light ? '#f7f9fa' : 'rgba(255,255,255,.06)'
  const keyColor = light ? C.navy : '#fff'

  return (
    <div style={{ textAlign: 'center' }}>
      <div className={shaking ? 'pinpad-shake' : ''} style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 24 }}>
        {Array.from({ length }).map((_, i) => (
          <span key={i} style={{
            width: 15, height: 15, borderRadius: '50%',
            border: `1.5px solid ${i < digits.length ? dotFill : dotIdle}`,
            background: i < digits.length ? dotFill : 'transparent',
            transition: 'background .12s, border-color .12s',
            display: 'inline-block',
          }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 220, margin: '0 auto' }}>
        {KEYS.map((k, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || k === ''}
            onClick={() => press(k)}
            style={{
              aspectRatio: '1', borderRadius: '50%',
              border: k === '' ? 'none' : `1px solid ${keyBorder}`,
              background: k === '' ? 'transparent' : keyBg,
              color: keyColor, fontSize: 18, cursor: k === '' ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: disabled ? 0.35 : 1,
            }}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>
      <style>{`
        @keyframes pinpadShake {
          10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); } 40%, 60% { transform: translateX(8px); }
        }
        .pinpad-shake { animation: pinpadShake .4s; }
        @media (prefers-reduced-motion: reduce) { .pinpad-shake { animation: none; } }
      `}</style>
    </div>
  )
}

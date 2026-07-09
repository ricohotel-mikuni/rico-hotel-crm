import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/constants'

// iPhone風の6桁PIN入力 — 入力中は「●」表示、6桁揃うと自動で
// onComplete を呼ぶ(ログインボタンを押す必要がない、提案書⑪の仕様)。
// DeviceTrustSetup(PIN登録・白カード上)とPinLogin(復帰時・紺色の
// ステージ上)の両方で使うため、明暗2テーマに対応する。
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

// 押下時の触感フィードバック(承認済み提案書Ver.2 ④) — 効果音・振動は
// 端末/ブラウザによって使えない場合があるため、必ずfeature detectして
// 例外を握りつぶし、鳴らない・震えない場合でも入力自体は支障なく続行
// できるようにする(AudioContextは初回のユーザー操作の中で生成する
// 必要があるため、キー押下ハンドラ内で遅延生成する)。
let sharedAudioCtx = null
function playKeyClick() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    sharedAudioCtx = sharedAudioCtx || new Ctx()
    const osc = sharedAudioCtx.createOscillator()
    const gain = sharedAudioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 620
    gain.gain.setValueAtTime(0.05, sharedAudioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, sharedAudioCtx.currentTime + 0.09)
    osc.connect(gain)
    gain.connect(sharedAudioCtx.destination)
    osc.start()
    osc.stop(sharedAudioCtx.currentTime + 0.09)
  } catch {
    // 音声が使えない環境 — 無音のまま続行する
  }
}

export default function PinPad({ length = 6, onComplete, disabled, shakeToken, theme = 'dark' }) {
  const [digits, setDigits] = useState('')
  const [shaking, setShaking] = useState(false)
  const [glowKey, setGlowKey] = useState(null)
  const glowTimer = useRef(null)

  useEffect(() => {
    if (shakeToken == null) return
    setDigits('')
    setShaking(true)
    const t = setTimeout(() => setShaking(false), 400)
    return () => clearTimeout(t)
  }, [shakeToken])

  useEffect(() => () => { if (glowTimer.current) clearTimeout(glowTimer.current) }, [])

  const press = (k, keyIndex) => {
    // 6桁揃った直後、onCompleteの呼び出し待ち(150ms)の間に連打されて
    // 二重送信になるのを防ぐ — 親がshakeToken/アンマウントでリセット
    // するまでこの入力は締め切る。
    if (disabled || digits.length >= length) return

    setGlowKey(keyIndex)
    if (glowTimer.current) clearTimeout(glowTimer.current)
    glowTimer.current = setTimeout(() => setGlowKey(null), 450)
    if (navigator.vibrate) navigator.vibrate(8)
    playKeyClick()

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
      <div className="pinpad-keys" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 190, margin: '0 auto' }}>
        {KEYS.map((k, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || k === ''}
            onClick={() => press(k, i)}
            className={glowKey === i ? 'pinpad-key-glow' : ''}
            style={{
              aspectRatio: '1', borderRadius: '50%',
              border: k === '' ? 'none' : `1px solid ${keyBorder}`,
              background: k === '' ? 'transparent' : keyBg,
              color: keyColor, fontSize: 16, cursor: k === '' ? 'default' : 'pointer',
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
        .pinpad-keys button { transition: transform .08s ease, box-shadow .18s ease, background .18s ease; }
        .pinpad-keys button:active:not(:disabled) {
          transform: scale(.88); background: rgba(201,168,76,.28) !important;
          box-shadow: 0 0 0 5px rgba(201,168,76,.22), inset 0 2px 5px rgba(0,0,0,.25);
        }
        .pinpad-key-glow { animation: pinpadKeyGlow .45s ease-out; }
        @keyframes pinpadKeyGlow { 0% { box-shadow: 0 0 0 0 rgba(201,168,76,.55); } 100% { box-shadow: 0 0 0 12px rgba(201,168,76,0); } }
        @media (prefers-reduced-motion: reduce) { .pinpad-shake, .pinpad-key-glow { animation: none; } }
      `}</style>
    </div>
  )
}

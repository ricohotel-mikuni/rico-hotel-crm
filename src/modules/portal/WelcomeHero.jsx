import { useEffect, useRef, useState } from 'react'
import { C } from '../../lib/constants'

export const GREETINGS = [
  { from: 5, to: 11, emoji: '🌅', text: 'おはようございます' },
  { from: 11, to: 17, emoji: '☀️', text: 'こんにちは' },
  { from: 17, to: 22, emoji: '🌇', text: 'こんばんは' },
  { from: 22, to: 29, emoji: '🌙', text: 'お疲れ様です' }, // 29 wraps past midnight to 5:00
]

// PinLogin(2回目以降のPINログイン画面)も同じ挨拶ロジックを使う —
// 「時間帯の挨拶」は会社ホームとログイン画面で1つの定義を共有する。
export function currentGreeting() {
  const h = new Date().getHours()
  const hh = h < 5 ? h + 24 : h
  return GREETINGS.find(g => hh >= g.from && hh < g.to) || GREETINGS[3]
}

// 世界各国の「ようこそ」— ユーザー指定の21パターンを国旗付きで巡回。
// PinLoginでも共有するためexportする。
export const WELCOME_WORDS = [
  { flag: '🇯🇵', text: 'ようこそ' },
  { flag: '🇺🇸', text: 'Welcome' },
  { flag: '🇬🇧', text: 'Welcome' },
  { flag: '🇫🇷', text: 'Bienvenue' },
  { flag: '🇩🇪', text: 'Willkommen' },
  { flag: '🇮🇹', text: 'Benvenuto' },
  { flag: '🇪🇸', text: 'Bienvenido' },
  { flag: '🇵🇹', text: 'Bem-vindo' },
  { flag: '🇹🇼', text: '歡迎' },
  { flag: '🇨🇳', text: '欢迎' },
  { flag: '🇰🇷', text: '환영합니다' },
  { flag: '🇻🇳', text: 'Xin chào' },
  { flag: '🇹🇭', text: 'ยินดีต้อนรับ' },
  { flag: '🇮🇩', text: 'Selamat Datang' },
  { flag: '🇵🇭', text: 'Mabuhay' },
  { flag: '🇮🇳', text: 'स्वागत है' },
  { flag: '🇦🇪', text: 'أهلاً وسهلاً' },
  { flag: '🇷🇺', text: 'Добро пожаловать' },
  { flag: '🇧🇷', text: 'Bem-vindo' },
  { flag: '🇲🇾', text: 'Selamat Datang' },
  { flag: '🇸🇬', text: 'Welcome' },
]

// ログイン後の会社ホームの「顔」。時間帯挨拶(1分ごとに再評価)の下に、
// 世界各国の「ようこそ」を約2秒ごとにクロスフェードで巡回表示する。
// 海外スタッフ・海外顧客も歓迎するという、このERPの国際指向を示す演出
// (承認済みの提案書 ⑰ セクション04/05/06 に基づく)。
export default function WelcomeHero({ fullName }) {
  const [greeting, setGreeting] = useState(currentGreeting)
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState('in') // 'in' | 'out'
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches).current

  useEffect(() => {
    const id = setInterval(() => setGreeting(currentGreeting()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => {
      setPhase('out')
      setTimeout(() => {
        setWordIdx(i => (i + 1) % WELCOME_WORDS.length)
        setPhase('in')
      }, 600)
    }, 2000)
    return () => clearInterval(id)
  }, [reduceMotion])

  const word = WELCOME_WORDS[wordIdx]

  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>{greeting.emoji}</span>
      <div style={{ fontSize: 18, fontWeight: 300, color: C.navy, marginBottom: 4 }}>{greeting.text}</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: '0 0 16px' }}>
        {fullName || '—'} 様
      </h1>
      <div className={`welcome-word ${phase === 'out' ? 'is-out' : 'is-in'}`}>
        <span className="welcome-word-flag">{word.flag}</span>
        <span>{reduceMotion ? 'ようこそ' : word.text}</span>
      </div>
      <style>{`
        .welcome-word {
          font-size: 26px; font-weight: 700; color: ${C.gold};
          display: flex; align-items: center; gap: 10px;
          transition: opacity .5s ease, transform .5s ease, filter .5s ease;
        }
        .welcome-word-flag { font-size: 20px; }
        .welcome-word.is-out { opacity: 0; transform: translateY(6px); filter: blur(4px); }
        .welcome-word.is-in { opacity: 1; transform: translateY(0); filter: blur(0); }
        @media (prefers-reduced-motion: reduce) {
          .welcome-word { transition: none; }
        }
      `}</style>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { C } from '../../lib/constants'

export const GREETINGS = [
  { from: 5, to: 11, emoji: '🌅', text: 'おはようございます' },
  { from: 11, to: 17, emoji: '☀️', text: 'こんにちは' },
  { from: 17, to: 22, emoji: '🌇', text: 'こんばんは' },
  { from: 22, to: 29, emoji: '🌙', text: 'お疲れ様です' }, // 29 wraps past midnight to 5:00
]

export function currentGreeting() {
  const h = new Date().getHours()
  const hh = h < 5 ? h + 24 : h
  return GREETINGS.find(g => hh >= g.from && hh < g.to) || GREETINGS[3]
}

// ログイン後の会社ホームの「顔」。以前はここに世界各国の「ようこそ」を
// 巡回表示していたが、承認済み提案書Ver.2 ⑧⑨に基づき廃止し、時間帯
// 挨拶と氏名のみの簡潔な表示にした(装飾のための巡回よりも、判断に
// つながる情報を優先するという方針)。
export default function WelcomeHero({ fullName }) {
  const [greeting, setGreeting] = useState(currentGreeting)

  useEffect(() => {
    const id = setInterval(() => setGreeting(currentGreeting()), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>{greeting.emoji}</span>
      <div style={{ fontSize: 18, fontWeight: 300, color: C.navy, marginBottom: 4 }}>{greeting.text}</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.navy, margin: 0 }}>
        {fullName || '—'} 様
      </h1>
    </div>
  )
}

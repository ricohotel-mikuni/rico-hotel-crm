import { useState } from 'react'
import { C } from '../lib/constants'
import Dai from './Dai'

// 常設チャット — 右下固定。閉じた状態も「待機中のDAI」カードとして
// 存在感を持たせ、円形の小アイコンにはしない(ユーザーからのフィード
// バックを反映)。今回の簡易版はダミー応答(AI開発憲章 第6章・第35条:
// ルールベース案Aを踏襲、外部AI APIは呼び出さない)。
const CANNED_REPLIES = [
  { match: /売上|稼働|レポート/, reply: '今日は売上、ええ感じで伸びてますよ😊' },
  { match: /予定|フォロー|案件/, reply: '本日のフォロー予定、まとめてお伝えできますよ！' },
  { match: /清掃|客室/, reply: '清掃の状況、確認しときますね🧹' },
  { match: /ありがとう|助かる/, reply: 'いえいえ、いつでも声かけてくださいね😊' },
]
function replyFor(text) {
  const hit = CANNED_REPLIES.find(r => r.match.test(text))
  return hit ? hit.reply : '承知しました！サポートしますね😊'
}

export default function DaiChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { from: 'dai', text: 'お疲れさまです😊\n何かお困りのことはありますか？' },
  ])

  const send = () => {
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { from: 'me', text }, { from: 'dai', text: replyFor(text) }])
    setInput('')
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 900, fontFamily: 'inherit' }}>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: 'none',
            background: `linear-gradient(160deg, ${C.navyDark}, ${C.navy} 70%, #2E5FA3 140%)`,
            borderRadius: 16, padding: '10px 16px 10px 10px', boxShadow: '0 12px 32px rgba(0,0,0,.35)',
            fontFamily: 'inherit',
          }}
        >
          <Dai expr="smile" size={56} />
          <span style={{ color: '#fff', fontSize: 12, textAlign: 'left', lineHeight: 1.5 }}>
            <b style={{ display: 'block', color: C.gold, fontSize: 11 }}>DAI</b>
            お手伝いできることありますか？
          </span>
        </button>
      )}

      {open && (
        <div style={{
          width: 300, maxWidth: 'calc(100vw - 40px)', background: '#fff', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', maxHeight: 440,
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Dai expr="talk" size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>DAI</div>
              <div style={{ color: C.gold, fontSize: 10.5 }}>● オンライン</div>
            </div>
            <button
              type="button" onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13 }}
            >✕</button>
          </div>

          <div style={{ padding: 14, flex: 1, overflowY: 'auto', minHeight: 160 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                background: m.from === 'me' ? C.navy : '#F5F7FA', color: m.from === 'me' ? '#fff' : C.navyDark,
                borderRadius: 10, padding: '8px 12px', marginBottom: 9, fontSize: 12.5, maxWidth: '85%',
                marginLeft: m.from === 'me' ? 'auto' : 0, whiteSpace: 'pre-line',
              }}>
                {m.text}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #ECEFF1' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="メッセージを入力してください…"
              style={{ flex: 1, border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              type="button" onClick={send}
              style={{ background: C.gold, border: 'none', borderRadius: 8, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <i className="ti ti-send" style={{ color: '#fff', fontSize: 15 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

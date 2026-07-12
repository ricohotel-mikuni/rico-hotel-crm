import { useState } from 'react'
import { DASH } from '../lib/designSystem'
import Dai from './Dai'

// 常設チャット — 右下固定。閉じた状態も「待機中のDAI」カードとして
// 存在感を持たせ、円形の小アイコンにはしない(ユーザーからのフィード
// バックを反映)。今回の簡易版はダミー応答(AI開発憲章 第6章・第35条:
// ルールベース案Aを踏襲、外部AI APIは呼び出さない)。Design System
// v1.0(承認済み提案書「Design System v1.0 仕様変更」)。
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

// ランチャーカードの一言 — 固定文言をやめ、状況に応じたヒントを毎回
// ランダムに1つ表示する(承認済み提案書「拠点ダッシュボードUI改善
// Ver.7」⑧)。日替わり判定が必要な訳ではない軽い誘い文句のため、
// PropertyHubのdailyPick(日付シード)とは違い、開くたびに単純に
// ランダム選択でよい。
const LAUNCHER_HINTS = [
  'VIP到着予定です',
  'レビュー返信があります',
  '朝食在庫を確認しますか？',
  '売上予測を表示できます',
  'お手伝いできることはありますか？',
]

export default function DaiChat() {
  const [open, setOpen] = useState(false)
  const [hint] = useState(() => LAUNCHER_HINTS[Math.floor(Math.random() * LAUNCHER_HINTS.length)])
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
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            border: `1px solid ${DASH.border}`,
            background: DASH.card,
            borderRadius: 14, padding: '8px 14px 8px 8px', boxShadow: '0 12px 32px rgba(0,0,0,.2)',
            fontFamily: 'inherit', maxWidth: 220,
          }}
        >
          <Dai expr="smile" size={46} />
          <span style={{ color: DASH.textSub, fontSize: 11.5, textAlign: 'left', lineHeight: 1.5 }}>
            <b style={{ display: 'block', color: DASH.gold, fontSize: 10.5 }}>NEO 何でも聞いてください</b>
            {hint}
          </span>
        </button>
      )}

      {open && (
        <div style={{
          width: 300, maxWidth: 'calc(100vw - 40px)', background: DASH.card, borderRadius: 16, overflow: 'hidden',
          border: `1px solid ${DASH.border}`, boxShadow: '0 24px 60px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', maxHeight: 440,
        }}>
          <div style={{
            background: DASH.card, borderBottom: `1px solid ${DASH.border}`, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Dai expr="talk" size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ color: DASH.textMain, fontSize: 13, fontWeight: 700 }}>NEO</div>
              <div style={{ color: DASH.green, fontSize: 10.5 }}>● オンライン</div>
            </div>
            <button
              type="button" onClick={() => setOpen(false)}
              style={{ background: DASH.surface2, border: 'none', color: DASH.textFaint, width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13 }}
            >✕</button>
          </div>

          <div style={{ padding: 14, flex: 1, overflowY: 'auto', minHeight: 160 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                background: m.from === 'me' ? DASH.gold : DASH.surface1, color: m.from === 'me' ? DASH.onGold : DASH.textMain,
                borderRadius: 10, padding: '8px 12px', marginBottom: 9, fontSize: 12.5, maxWidth: '85%',
                marginLeft: m.from === 'me' ? 'auto' : 0, whiteSpace: 'pre-line',
              }}>
                {m.text}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${DASH.border}` }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="メッセージを入力してください…"
              style={{ flex: 1, border: `1px solid ${DASH.border}`, borderRadius: 8, padding: '8px 11px', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', background: DASH.inputBg, color: DASH.textMain }}
            />
            <button
              type="button" onClick={send}
              style={{ background: DASH.gold, border: 'none', borderRadius: 8, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <i className="ti ti-send" style={{ color: DASH.onGold, fontSize: 15 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

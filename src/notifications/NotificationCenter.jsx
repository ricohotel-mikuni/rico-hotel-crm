import { C } from '../lib/constants'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}時間前`
  return `${Math.floor(hr / 24)}日前`
}

// The panel content shown by NotificationBell's dropdown — a combined
// list + history view (read and unread both shown, visually
// distinguished) since this is the foundation stage; a dedicated
// full-page history/archive can split out later without changing this
// component's data source (useMyNotifications).
export default function NotificationCenter({ items, loading, onMarkRead, onMarkAllRead }) {
  return (
    <div style={{ width: 340, maxHeight: 440, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #ECEFF1',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>通知</div>
        <button
          onClick={onMarkAllRead}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: C.navyLight, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          すべて既読にする
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: '28px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>読み込み中…</div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ padding: '28px', textAlign: 'center', color: '#BDBDBD', fontSize: 12 }}>
            通知はありません
          </div>
        )}
        {!loading && items.map(n => (
          <div
            key={n.id}
            onClick={() => !n.readByMe && onMarkRead(n.id)}
            style={{
              padding: '10px 16px', borderBottom: '1px solid #F5F5F5',
              cursor: n.readByMe ? 'default' : 'pointer',
              background: n.readByMe ? '#fff' : `${C.gold}0D`,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
              background: n.readByMe ? 'transparent' : '#E53935',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: n.readByMe ? 500 : 700, color: C.navy, lineHeight: 1.4 }}>
                {n.title}
              </div>
              {n.body && (
                <div style={{ fontSize: 11.5, color: '#90A4AE', marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>
              )}
              <div style={{ fontSize: 10.5, color: '#BDBDBD', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

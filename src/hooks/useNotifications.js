import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Unread notification counts per module, for the Hub badges.
// Fails soft to {} if the `notifications` table isn't migrated yet
// in a given environment, so the Hub never breaks because of it.
export function useUnreadCounts() {
  const [counts, setCounts] = useState({})
  const { user } = useAuth()

  const fetchCounts = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('module')
        .eq('is_read', false)
      if (error) { setCounts({}); return }
      const next = {}
      for (const row of data ?? []) next[row.module] = (next[row.module] || 0) + 1
      setCounts(next)
    } catch {
      // Table not migrated yet, or a flaky connection dropped the
      // request entirely (WebKit can reject rather than resolve with
      // an error field) — badges just stay hidden either way.
      setCounts({})
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchCounts()

    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchCounts())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id]) // eslint-disable-line

  return counts
}

// Call from feature code whenever staff add data or something needs
// approval, e.g.:
//   pushNotification({ module: 'sales', title: '新しい営業先が登録されました' })                      // broadcast (today's Hub-badge behavior)
//   pushNotification({ module: 'purchase', title: '承認待ちの購入申請があります', recipientRoleId })   // whoever holds that role
//   pushNotification({ module: 'expenses', title: '経費申請が承認されました', recipientEmployeeId })   // one specific person
export async function pushNotification({ module, title, body = '', link = '', recipientEmployeeId = null, recipientRoleId = null }) {
  const { error } = await supabase.from('notifications').insert({
    module, title, body, link,
    recipient_employee_id: recipientEmployeeId,
    recipient_role_id: recipientRoleId,
  })
  return { error }
}

// HotelOS Foundation v1.0 — 既存のpushNotificationはrecipientRoleIdに
// UUIDを直接要求する(承認依頼画面のように呼び出し元が既にロール選択
// 済みのケース向け)。ホテル運営フック側は'hotel_manager'/'front_desk'
// 等の固定ロールキーしか持たないため、キー→role_idの解決が必要。
// モジュールスコープの単純キャッシュ(ページ内で同じキーは1回だけ
// 問い合わせる)で十分 — roleは運用中に頻繁には変わらない。
const roleIdCache = {}
async function resolveRoleId(roleKey) {
  if (roleIdCache[roleKey]) return roleIdCache[roleKey]
  const { data, error } = await supabase.from('roles').select('id').eq('key', roleKey).maybeSingle()
  if (error || !data) { console.error('[resolveRoleId] failed for', roleKey, error); return null }
  roleIdCache[roleKey] = data.id
  return data.id
}

// ロールキー指定でそのまま呼べる薄いラッパー。ロール解決に失敗しても
// (未migration適用・キー誤り等)通知が飛ばないだけで、呼び出し元の
// 業務処理(予約登録・チェックイン等)自体は失敗させない。
export async function notifyRole(roleKey, { module, title, body = '', link = '' }) {
  const recipientRoleId = await resolveRoleId(roleKey)
  if (!recipientRoleId) return { error: `role not found: ${roleKey}` }
  return pushNotification({ module, title, body, link, recipientRoleId })
}

// Personal notification feed for the bell/Notification Center: mine +
// anything targeted at a role I currently hold + full broadcasts
// (both recipient columns null). Read state is tracked per-person in
// `notification_reads`, independent of the shared `is_read` column
// above, so one person reading a role/broadcast notification doesn't
// hide it from everyone else who received it.
export function useMyNotifications(limit = 50) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [employeeId, setEmployeeId] = useState(null)
  const [loading, setLoading] = useState(true)
  // Unique per call site: this hook is legitimately called from more
  // than one component on the same page at once (e.g. NotificationBell
  // in the header + a dashboard "unread count" widget), and Supabase
  // throws if a second `.channel()` with the same name gets `.on()`
  // calls after the first one has already subscribed.
  const instanceId = useRef(Math.random().toString(36).slice(2)).current

  const load = useCallback(async () => {
    if (!user) { setItems([]); setEmployeeId(null); setLoading(false); return }
    try {
      const { data: emp } = await supabase
        .from('employees').select('id').eq('user_id', user.id).maybeSingle()
      if (!emp) { setItems([]); setEmployeeId(null); setLoading(false); return }
      setEmployeeId(emp.id)

      const { data: roleRows } = await supabase
        .from('employee_roles').select('role_id').eq('employee_id', emp.id)
      const roleIds = (roleRows ?? []).map(r => r.role_id)

      const orParts = [
        `recipient_employee_id.eq.${emp.id}`,
        'and(recipient_employee_id.is.null,recipient_role_id.is.null)',
      ]
      if (roleIds.length) orParts.push(`recipient_role_id.in.(${roleIds.join(',')})`)

      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) { setItems([]); return }

      const { data: reads } = await supabase
        .from('notification_reads').select('notification_id').eq('employee_id', emp.id)
      const readIds = new Set((reads ?? []).map(r => r.notification_id))

      setItems((notifs ?? []).map(n => ({ ...n, readByMe: readIds.has(n.id) })))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, limit]) // eslint-disable-line

  useEffect(() => {
    setLoading(true)
    load()
    if (!user) return

    const channel = supabase
      .channel(`realtime:my-notifications:${user.id}:${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, load])

  // Foundation品質確認是正: 呼び出し元(NotificationCenter.jsx)は
  // どちらも戻り値を待たないクリックハンドラのため、ここでawaitして
  // ユーザー操作の応答を遅らせる理由が無かった。書き込み後の一覧更新も
  // 手動load()ではなく、上のuseEffectが購読しているnotification_reads
  // テーブルのrealtimeが自動的に行う(二重更新だったため削除)。
  const markRead = useCallback((notificationId) => {
    if (!employeeId) return
    supabase.from('notification_reads')
      .upsert({ notification_id: notificationId, employee_id: employeeId }, { onConflict: 'notification_id,employee_id' })
      .then(({ error }) => { if (error) console.error('[useMyNotifications] markRead failed:', error) })
      .catch(e => console.error('[useMyNotifications] markRead threw:', e))
  }, [employeeId])

  const markAllRead = useCallback(() => {
    if (!employeeId) return
    const unread = items.filter(n => !n.readByMe)
    if (!unread.length) return
    supabase.from('notification_reads')
      .upsert(unread.map(n => ({ notification_id: n.id, employee_id: employeeId })), { onConflict: 'notification_id,employee_id' })
      .then(({ error }) => { if (error) console.error('[useMyNotifications] markAllRead failed:', error) })
      .catch(e => console.error('[useMyNotifications] markAllRead threw:', e))
  }, [employeeId, items])

  const unreadCount = items.filter(n => !n.readByMe).length

  return { items, unreadCount, loading, markRead, markAllRead, refresh: load }
}

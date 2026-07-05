import { useState, useEffect, useCallback } from 'react'
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
// approval, e.g. pushNotification({ module: 'purchase', title: '新規購入申請', link: '/purchase/123' }).
export async function pushNotification({ module, title, body = '', link = '' }) {
  const { error } = await supabase.from('notifications').insert({ module, title, body, link })
  return { error }
}

export async function markModuleRead(module) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('module', module)
    .eq('is_read', false)
  return { error }
}

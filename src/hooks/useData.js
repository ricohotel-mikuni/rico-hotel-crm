import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Safari/WebKit takes far longer than Chromium to give up on a request over
// a bad connection (observed 7s+ just to fail DNS resolution, vs near-instant
// on Chromium) — on real flaky mobile networks it can take much longer still.
// Without a bound, that leaves the "読み込み中…" spinner stuck indefinitely,
// which is indistinguishable from the app being broken. This caps every
// table load at 15s so a retry UI always appears instead.
const FETCH_TIMEOUT_MS = 15000

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('通信がタイムアウトしました')), ms)),
  ])
}

// Generic hook for Supabase table with realtime
function useTable(table, query = null) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const channelRef = useRef(null)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const q = query
        ? query(supabase.from(table))
        : supabase.from(table).select('*').is('deleted_at', null).order('created_at', { ascending: false })
      const { data: rows, error: err } = await withTimeout(q, FETCH_TIMEOUT_MS)
      if (err) { setError(err.message); return }
      setData(rows ?? [])
    } catch (e) {
      setError(e?.message || '通信エラーが発生しました')
    }
  }, [user, table]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    setLoading(true)
    load().finally(() => setLoading(false))

    // Realtime subscription
    const channel = supabase
      .channel(`realtime:${table}:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => load())
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, table]) // eslint-disable-line

  return { data, loading, error, refresh: load }
}

// ── CLIENTS ──────────────────────────────────────────────
export function useClients() {
  const { data: clients, loading, error, refresh } = useTable(
    'clients',
    (q) => q.select('*, client_history(*)').is('deleted_at', null).order('created_at', { ascending: false })
  )
  const { user, permissions } = useAuth()

  const add = async (form) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('clients').insert({
      ...form, created_by: user.id, updated_by: user.id,
    }).select().single()
    return { data, error }
  }

  const update = async (id, form) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('clients').update({
      ...form, updated_by: user.id,
    }).eq('id', id).select().single()
    return { data, error }
  }

  const softDelete = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { error } = await supabase.from('clients').update({
      deleted_at: new Date().toISOString(), updated_by: user.id,
    }).eq('id', id)
    return { error }
  }

  const addHistory = async (clientId, historyItem) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { error } = await supabase.from('client_history').insert({
      client_id: clientId, ...historyItem, created_by: user.id,
    })
    return { error }
  }

  return { clients, loading, error, refresh, add, update, softDelete, addHistory }
}

// ── CASES ─────────────────────────────────────────────────
export function useCases() {
  const { data: cases, loading, error, refresh } = useTable('cases')
  const { user, permissions } = useAuth()

  const add = async (form) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const comm = Math.round((Number(form.revenue) || 0) * (parseInt(form.commission_rate || 0) / 100))
    const { data, error } = await supabase.from('cases').insert({
      ...form, commission: comm, created_by: user.id, updated_by: user.id,
    }).select().single()
    return { data, error }
  }

  const update = async (id, form) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const comm = Math.round((Number(form.revenue) || 0) * (parseInt(form.commission_rate || 0) / 100))
    const { data, error } = await supabase.from('cases').update({
      ...form, commission: comm, updated_by: user.id,
    }).eq('id', id).select().single()
    return { data, error }
  }

  const softDelete = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { error } = await supabase.from('cases').update({
      deleted_at: new Date().toISOString(),
    }).eq('id', id)
    return { error }
  }

  return { cases, loading, error, refresh, add, update, softDelete }
}

// ── DAILY REPORTS ──────────────────────────────────────────
export function useReports() {
  const { data: reports, loading, error, refresh } = useTable(
    'daily_reports',
    (q) => q.select('*').is('deleted_at', null).order('report_date', { ascending: false })
  )
  const { user, permissions } = useAuth()

  const add = async (form) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('daily_reports').insert({
      ...form, created_by: user.id, updated_by: user.id,
    }).select().single()
    return { data, error }
  }

  const update = async (id, form) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('daily_reports').update({
      ...form, updated_by: user.id,
    }).eq('id', id).select().single()
    return { data, error }
  }

  const softDelete = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { error } = await supabase.from('daily_reports').update({
      deleted_at: new Date().toISOString(),
    }).eq('id', id)
    return { error }
  }

  return { reports, loading, error, refresh, add, update, softDelete }
}

// ── CONTRACTS ─────────────────────────────────────────────
export function useContracts() {
  const { data: contracts, loading, error, refresh } = useTable('contracts')
  const { user, permissions } = useAuth()

  const add = async (form) => {
    const { data, error } = await supabase.from('contracts').insert({
      ...form, created_by: user.id, updated_by: user.id,
    }).select().single()
    return { data, error }
  }

  const update = async (id, form) => {
    const { data, error } = await supabase.from('contracts').update({
      ...form, updated_by: user.id,
    }).eq('id', id).select().single()
    return { data, error }
  }

  const softDelete = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { error } = await supabase.from('contracts').update({
      deleted_at: new Date().toISOString(),
    }).eq('id', id)
    return { error }
  }

  return { contracts, loading, error, refresh, add, update, softDelete }
}

// ── USER PROFILES ─────────────────────────────────────────
export function useUsers() {
  const { data: users, loading, error, refresh } = useTable(
    'user_profiles',
    (q) => q.select('*').eq('is_active', true).order('full_name')
  )
  const { user, permissions } = useAuth()

  const updateRole = async (id, role) => {
    if (!permissions.canManageUsers) return { error: '管理者のみ変更できます' }
    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id)
    return { error }
  }

  return { users, loading, error, refresh, updateRole }
}

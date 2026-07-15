import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pushNotification } from './useNotifications'

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

// Generic hook for a Supabase table (or view) with realtime.
// `table` is what gets SELECTed from. Realtime `postgres_changes` only
// fires on real tables — pass `realtimeTable` when `table` is a VIEW
// (e.g. v_employee_directory) so it still refreshes live off the
// underlying table's changes.
export function useTable(table, query = null, realtimeTable = table) {
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
      if (err) {
        // Log the full PostgREST error (code/details/hint) to the console —
        // e.g. PGRST205 "Could not find the table" carries a `hint` that's
        // invaluable for diagnosing a not-yet-applied migration, but the
        // UI-facing message alone doesn't show it.
        console.error(`[useTable:${table}] fetch failed:`, err)
        setError(err.hint ? `${err.message} (${err.hint})` : err.message)
        return
      }
      setData(rows ?? [])
    } catch (e) {
      console.error(`[useTable:${table}] fetch threw:`, e)
      setError(e?.message || '通信エラーが発生しました')
    }
  }, [user, table]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    setLoading(true)
    load().finally(() => setLoading(false))

    // Realtime subscription
    const channel = supabase
      .channel(`realtime:${realtimeTable}:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: realtimeTable }, () => load())
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, table, realtimeTable]) // eslint-disable-line

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
    // Proof-of-concept for the realtime notification infra: any staff
    // member watching the sales module's Hub tile/notification bell
    // sees this immediately — no F5/reload needed. Future modules
    // (purchase/expenses/shifts/etc.) follow this exact same pattern.
    if (!error) pushNotification({ module: 'sales', title: `新しい営業先が登録されました: ${data.company}` })
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
    if (!error) pushNotification({ module: 'sales', title: `新しい案件が登録されました: ${data.title}` })
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

// ── COMPANY (single-company assumption, matches HotelsApp.jsx's own
// hardcoded 'rico-mikuni' convention — see supabase/migrations/005) ──
export const DAIEI_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

// ── LOCATIONS / DEPARTMENTS (reference lists for the employee form) ──
export function useLocations() {
  const { data: locations, loading, error, refresh } = useTable(
    'locations', (q) => q.select('*').order('name')
  )
  return { locations, loading, error, refresh }
}

export function useDepartments() {
  const { data: departments, loading, error, refresh } = useTable(
    'departments', (q) => q.select('*').order('sort_order')
  )
  return { departments, loading, error, refresh }
}

export function useRoles() {
  const { data: roles, loading, error, refresh } = useTable(
    'roles', (q) => q.select('*').order('sort_order')
  )
  return { roles, loading, error, refresh }
}

// ── EMPLOYEES — company-wide master. `employees` itself never
// references a hotel; assignment (location/department/position) lives
// in employee_assignments and is upserted separately below so
// reassigning someone never touches their employees row.
export function useEmployees() {
  const { data: employees, loading, error, refresh } = useTable(
    'v_employee_directory', (q) => q.select('*'), 'employees',
  )
  const { permissions } = useAuth()

  // 既存社員の追加登録(employeesのみ、Authアカウントは作らない) —
  // 現在はcreateWithAuth()に一本化したため、通常のUIからは呼ばれない。
  // 過去データ移行など、ログイン資格を持たない社員行だけを作りたい
  // 特殊なケースのために残す(ERP開発憲章第38条: 通常の登録経路では
  // 使わない)。
  const add = async (form, assignment) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('employees').insert({
      ...form, company_id: DAIEI_COMPANY_ID,
    }).select().single()
    if (error) return { error }
    if (assignment?.location_id) {
      await supabase.from('employee_assignments').insert({
        employee_id: data.id, is_primary: true, ...assignment,
      })
    }
    pushNotification({ module: 'employees', title: `新しい社員が登録されました: ${data.full_name}` })
    return { data, error }
  }

  // 社員登録の唯一の正規経路(ERP開発憲章第38条・第39条) —
  // create-employee Edge Function(service-role)を呼び、Auth作成〜
  // employees〜employee_assignments〜employee_roles〜PINまでを
  // サーバー側でまとめて完結させる。呼び出し元(今ログイン中の管理者)
  // 自身のセッションは一切変更されない。
  const createWithAuth = async (payload) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.functions.invoke('create-employee', { body: payload })
    if (error) {
      const detail = error.context?.body ? await error.context.text?.().catch(() => null) : null
      return { error: detail || error.message || '社員登録に失敗しました' }
    }
    if (data?.error) return { error: data.error }
    pushNotification({ module: 'employees', title: `新しい社員が登録されました: ${payload.full_name}` })
    return { data }
  }

  const update = async (id, form, assignment) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('employees').update(form).eq('id', id).select().single()
    if (error) return { error }
    if (assignment?.location_id) {
      const { data: existing } = await supabase
        .from('employee_assignments').select('id')
        .eq('employee_id', id).eq('is_primary', true).is('end_date', null)
        .maybeSingle()
      if (existing) {
        await supabase.from('employee_assignments').update(assignment).eq('id', existing.id)
      } else {
        await supabase.from('employee_assignments').insert({ employee_id: id, is_primary: true, ...assignment })
      }
    }
    return { data, error }
  }

  const softDelete = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { error } = await supabase.from('employees').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    return { error }
  }

  return { employees, loading, error, refresh, add, createWithAuth, update, softDelete }
}

// ── MY EMPLOYEE RECORD — resolves the logged-in auth user to their
// employees row (needed to file an approval request "as yourself").
export function useMyEmployee() {
  const { user } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setEmployee(null); setLoading(false); return }
    let cancelled = false
    supabase.from('employees').select('id, full_name').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[useMyEmployee] fetch failed:', error)
        if (!cancelled) { setEmployee(data); setLoading(false) }
      })
      .catch(e => { console.error('[useMyEmployee] fetch threw:', e); if (!cancelled) { setEmployee(null); setLoading(false) } })
    return () => { cancelled = true }
  }, [user?.id])

  return { employee, loading }
}

// ── ELECTRONIC APPROVAL — a generic sequential-chain model any future
// module (purchase/expenses/leave/ringi/contract) plugs into by
// inserting a row tagged with its own `module`. This foundation round
// only wires a single-step chain (request -> one approver decides);
// advancing to the next step for multi-step chains is a documented
// future extension of `decide()` below, not built yet.
export function useApprovalRequests() {
  const { data: requests, loading, error, refresh } = useTable(
    'approval_requests',
    (q) => q.select('*, approval_steps(*), requester:employees!requested_by(full_name)').order('created_at', { ascending: false }),
  )

  const create = async ({ module, title, description = '', amount = null, requestedBy, approverRoleId = null, approverEmployeeId = null }) => {
    const { data: req, error } = await supabase.from('approval_requests').insert({
      company_id: DAIEI_COMPANY_ID, module, title, description, amount, requested_by: requestedBy,
    }).select().single()
    if (error) return { error }

    await supabase.from('approval_steps').insert({
      request_id: req.id, step_order: 1, approver_role_id: approverRoleId, approver_employee_id: approverEmployeeId,
    })
    await pushNotification({
      module, title: `承認依頼: ${title}`,
      recipientRoleId: approverRoleId, recipientEmployeeId: approverEmployeeId,
    })
    return { data: req }
  }

  const decide = async (request, step, decision, comment = '') => {
    const { error: stepError } = await supabase.from('approval_steps').update({
      status: decision, acted_at: new Date().toISOString(), comment,
    }).eq('id', step.id)
    if (stepError) return { error: stepError }

    const { error } = await supabase.from('approval_requests').update({ status: decision }).eq('id', request.id)
    if (!error) {
      await pushNotification({
        module: request.module,
        title: `「${request.title}」が${decision === 'approved' ? '承認' : '却下'}されました`,
        recipientEmployeeId: request.requested_by,
      })
    }
    return { error }
  }

  return { requests, loading, error, refresh, create, decide }
}

// ── ユーザー管理(設定画面) — employeesを唯一の正とする(ERP開発憲章
// 第38条)。旧来はuser_profilesを直接見ていたが、ログイン資格を持つ
// 社員(user_id IS NOT NULL)をv_employee_accounts経由で見る形に変更。
// 権限変更もemployee_rolesへ書き込む(新方式) — 書き込むと
// migration 014のトリガーがuser_profiles.roleへ自動的に同期するため、
// 旧来のRLSヘルパー(is_admin_or_manager()等)も引き続き正しく動く。
export function useUsers() {
  const { data: users, loading, error, refresh } = useTable(
    'v_employee_accounts', (q) => q.select('*').order('full_name'), 'employee_roles',
  )
  const { permissions } = useAuth()

  const updateRole = async (employeeId, roleKey) => {
    if (!permissions.canManageUsers) return { error: '管理者のみ変更できます' }
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles').select('id').eq('key', roleKey).maybeSingle()
    if (roleErr || !roleRow) return { error: '指定された権限が見つかりません' }

    // このUIは「1人1権限」の簡易表示のため、既存の割り当てを置き換える。
    const { error: delErr } = await supabase.from('employee_roles').delete().eq('employee_id', employeeId)
    if (delErr) return { error: delErr.message }
    const { error: insErr } = await supabase.from('employee_roles').insert({ employee_id: employeeId, role_id: roleRow.id })
    return { error: insErr?.message }
  }

  return { users, loading, error, refresh, updateRole }
}

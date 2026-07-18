import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCurrentCompany } from '../contexts/CompanyContext'
import { pushNotification, notifyRole } from './useNotifications'

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

// HotelOS共通監査ログ(migration 015 write_audit_log)の書き込みヘルパー。
// 実行者(actor)はサーバー側でauth.uid()から解決するため、クライアントは
// 何を・誰に対して行ったかだけを渡す。監査ログの失敗で業務本体を
// 止めないよう、常にbest-effort(呼び出し元へエラーを伝播しない)。
async function logAudit({ action, category = '', description = '', targetTable = null, targetId = null, targetLabel = '', targetEmployeeId = null, companyId = null, hotelId = null, before = null, after = null, success = true, failureReason = '' }) {
  try {
    const { error } = await supabase.rpc('write_audit_log', {
      p_action: action, p_category: category, p_description: description,
      p_target_table: targetTable, p_target_id: targetId, p_target_label: targetLabel,
      p_target_employee_id: targetEmployeeId, p_company_id: companyId, p_hotel_id: hotelId,
      p_before: before, p_after: after, p_success: success, p_failure_reason: failureReason,
    })
    if (error) console.error('[audit] write_audit_log failed:', error)
  } catch (e) {
    console.error('[audit] write_audit_log threw:', e)
  }
}

// Generic hook for a Supabase table (or view) with realtime.
// `table` is what gets SELECTed from. Realtime `postgres_changes` only
// fires on real tables — pass `realtimeTable` when `table` is a VIEW
// (e.g. v_employee_directory) so it still refreshes live off the
// underlying table's changes.
// `realtimeTable` accepts a single table name OR an array of table names —
// pass an array whenever a mutation this hook exposes writes to more than
// one table (e.g. a parent+child pair), so every session (this tab, other
// tabs, other browsers/devices) refreshes the instant ANY of them changes,
// not just by lucky write-ordering. Array literals are safe to pass inline
// at call sites: only the joined string (a stable primitive) drives the
// subscription effect's dependency, so a new array reference each render
// does not cause a resubscribe loop.
export function useTable(table, query = null, realtimeTable = table) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const channelRef = useRef(null)
  // 安定化是正(2026-07-18): チャンネル名が(realtimeKey, user.id)だけ
  // で決まっていたため、同じテーブルを購読する複数のフックインスタンス
  // が同じページ上に同時にマウントされると(例: PropertyHubが
  // useMealService(hotelId,'breakfast')とuseMealService(hotelId,
  // 'dinner')を同時に呼び、どちらも内部でuseTable('stays', ...)・
  // useTable('meal_services', ...)を同一realtimeKeyで呼ぶ)、
  // チャンネル名が完全に衝突し、Supabaseの「cannot add postgres_changes
  // callbacks after subscribe()」エラーでクラッシュしていた(過去に
  // useMyNotifications()で一度発見・修正済みの既知の不具合パターンが、
  // 朝食/夕食モジュール追加で別のフックに再発したもの)。全フック
  // インスタンスに固有のsuffixを付け、テーブル・ユーザーが同じでも
  // 衝突しないようにする。
  const instanceId = useRef(Math.random().toString(36).slice(2)).current
  const realtimeTables = Array.isArray(realtimeTable) ? realtimeTable : [realtimeTable]
  const realtimeKey = realtimeTables.join(',')

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

    // Realtime subscription — one channel, subscribed to every table in
    // realtimeTables, so any of them changing (this tab, another tab,
    // another browser/device) refreshes without F5 or navigating away.
    let channel = supabase.channel(`realtime:${realtimeKey}:${user.id}:${instanceId}`)
    realtimeTables.forEach(t => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => load())
    })
    channel.subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, table, realtimeKey]) // eslint-disable-line

  return { data, loading, error, refresh: load }
}

// ── CLIENTS ──────────────────────────────────────────────
export function useClients() {
  const { data: clients, loading, error, refresh } = useTable(
    'clients',
    (q) => q.select('*, client_history(*)').is('deleted_at', null).order('created_at', { ascending: false }),
    ['clients', 'client_history'],
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
    if (!error) {
      pushNotification({ module: 'sales', title: `新しい案件が登録されました: ${data.title}` })
      logAudit({ action: 'sales_case_created', category: 'hotel_ops', description: '営業案件を登録', targetTable: 'cases', targetId: data.id, targetLabel: data.title, after: data })
    }
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
    const { data: before } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('contracts').update({
      ...form, updated_by: user.id,
    }).eq('id', id).select().single()
    if (!error) {
      logAudit({ action: 'contract_updated', category: 'hotel_ops', description: '契約を変更', targetTable: 'contracts', targetId: id, targetLabel: data.title || data.contract_no || '', before, after: data })
    }
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

// ── LOCATIONS / DEPARTMENTS (reference lists for the employee form) ──
export function useLocations() {
  const { data: locations, loading, error, refresh } = useTable(
    'locations', (q) => q.select('*').order('name')
  )
  return { locations, loading, error, refresh }
}

// 共通マスター(Foundation v1.0是正⑤) — 以前はdepartments/roles/
// business_unitsを閲覧専用フックとしてしか公開しておらず、SQLを直接
// 編集しない限り部署・ロール・事業を追加/変更できなかった。CRUDを
// 追加し、書き込みはAdminCommonMasters.jsx(管理センター)から行う。
export function useDepartments() {
  const { data: departments, loading, error, refresh } = useTable(
    'departments', (q) => q.select('*').order('sort_order')
  )
  const add = async (form) => {
    const { data, error } = await supabase.from('departments').insert(form).select().single()
    if (!error) logAudit({ action: 'department_created', category: 'user', description: '部署を追加', targetTable: 'departments', targetId: data.id, targetLabel: data.name, companyId: data.company_id, after: data })
    return { data, error }
  }
  const update = async (id, form) => {
    const { data: before } = await supabase.from('departments').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('departments').update(form).eq('id', id).select().single()
    if (!error) logAudit({ action: 'department_updated', category: 'user', description: '部署を編集', targetTable: 'departments', targetId: id, targetLabel: data.name, companyId: data.company_id, before, after: data })
    return { data, error }
  }
  const remove = async (id) => {
    const { data: before } = await supabase.from('departments').select('*').eq('id', id).maybeSingle()
    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (!error) logAudit({ action: 'department_deleted', category: 'user', description: '部署を削除', targetTable: 'departments', targetId: id, targetLabel: before?.name, companyId: before?.company_id, before })
    return { error }
  }
  return { departments, loading, error, refresh, add, update, remove }
}

export function useBusinessUnits() {
  const { data: businessUnits, loading, error, refresh } = useTable(
    'business_units', (q) => q.select('*').order('sort_order')
  )
  const add = async (form) => {
    const { data, error } = await supabase.from('business_units').insert(form).select().single()
    if (!error) logAudit({ action: 'business_unit_created', category: 'user', description: '事業を追加', targetTable: 'business_units', targetId: data.id, targetLabel: data.name, companyId: data.company_id, after: data })
    return { data, error }
  }
  const update = async (id, form) => {
    const { data: before } = await supabase.from('business_units').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('business_units').update(form).eq('id', id).select().single()
    if (!error) logAudit({ action: 'business_unit_updated', category: 'user', description: '事業を編集', targetTable: 'business_units', targetId: id, targetLabel: data.name, companyId: data.company_id, before, after: data })
    return { data, error }
  }
  const remove = async (id) => {
    const { data: before } = await supabase.from('business_units').select('*').eq('id', id).maybeSingle()
    const { error } = await supabase.from('business_units').delete().eq('id', id)
    if (!error) logAudit({ action: 'business_unit_deleted', category: 'user', description: '事業を削除', targetTable: 'business_units', targetId: id, targetLabel: before?.name, companyId: before?.company_id, before })
    return { error }
  }
  return { businessUnits, loading, error, refresh, add, update, remove }
}

export function useRoles() {
  const { data: roles, loading, error, refresh } = useTable(
    'roles', (q) => q.select('*').order('sort_order')
  )
  // ロールの削除はemployee_roles/role_permissionsがON DELETE CASCADE
  // のため誤操作の被害が大きく、今回は追加/編集のみを提供する
  // (削除が必要な場合は個別対応とする)。
  const add = async (form) => {
    const { data, error } = await supabase.from('roles').insert(form).select().single()
    if (!error) logAudit({ action: 'role_master_created', category: 'user', description: 'ロールを追加', targetTable: 'roles', targetId: data.id, targetLabel: data.label, after: data })
    return { data, error }
  }
  const update = async (id, form) => {
    const { data: before } = await supabase.from('roles').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('roles').update(form).eq('id', id).select().single()
    if (!error) logAudit({ action: 'role_master_updated', category: 'user', description: 'ロールを編集', targetTable: 'roles', targetId: id, targetLabel: data.label, before, after: data })
    return { data, error }
  }
  return { roles, loading, error, refresh, add, update }
}

// 役職・雇用区分(migration 017、Foundation v1.0是正: 共通マスター拡張)
// — 以前はEmployeeForm.jsxの自由入力/ハードコード配列だった。
export function usePositions() {
  const { data: positions, loading, error, refresh } = useTable(
    'positions', (q) => q.select('*').order('sort_order')
  )
  const add = async (form) => {
    const { data, error } = await supabase.from('positions').insert(form).select().single()
    if (!error) logAudit({ action: 'position_created', category: 'user', description: '役職を追加', targetTable: 'positions', targetId: data.id, targetLabel: data.name, companyId: data.company_id, after: data })
    return { data, error }
  }
  const update = async (id, form) => {
    const { data: before } = await supabase.from('positions').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('positions').update(form).eq('id', id).select().single()
    if (!error) logAudit({ action: 'position_updated', category: 'user', description: '役職を編集', targetTable: 'positions', targetId: id, targetLabel: data.name, companyId: data.company_id, before, after: data })
    return { data, error }
  }
  const remove = async (id) => {
    const { data: before } = await supabase.from('positions').select('*').eq('id', id).maybeSingle()
    const { error } = await supabase.from('positions').delete().eq('id', id)
    if (!error) logAudit({ action: 'position_deleted', category: 'user', description: '役職を削除', targetTable: 'positions', targetId: id, targetLabel: before?.name, companyId: before?.company_id, before })
    return { error }
  }
  return { positions, loading, error, refresh, add, update, remove }
}

export function useEmploymentTypes() {
  const { data: employmentTypes, loading, error, refresh } = useTable(
    'employment_types', (q) => q.select('*').order('sort_order')
  )
  const add = async (form) => {
    const { data, error } = await supabase.from('employment_types').insert(form).select().single()
    if (!error) logAudit({ action: 'employment_type_created', category: 'user', description: '雇用区分を追加', targetTable: 'employment_types', targetId: data.id, targetLabel: data.name, companyId: data.company_id, after: data })
    return { data, error }
  }
  const update = async (id, form) => {
    const { data: before } = await supabase.from('employment_types').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('employment_types').update(form).eq('id', id).select().single()
    if (!error) logAudit({ action: 'employment_type_updated', category: 'user', description: '雇用区分を編集', targetTable: 'employment_types', targetId: id, targetLabel: data.name, companyId: data.company_id, before, after: data })
    return { data, error }
  }
  const remove = async (id) => {
    const { data: before } = await supabase.from('employment_types').select('*').eq('id', id).maybeSingle()
    const { error } = await supabase.from('employment_types').delete().eq('id', id)
    if (!error) logAudit({ action: 'employment_type_deleted', category: 'user', description: '雇用区分を削除', targetTable: 'employment_types', targetId: id, targetLabel: before?.name, companyId: before?.company_id, before })
    return { error }
  }
  return { employmentTypes, loading, error, refresh, add, update, remove }
}

// Foundation v1.0是正: 会社管理完成 — companiesを閲覧専用フックから
// CRUD対応へ拡張。SQL不要で会社の追加・編集・削除ができるようにする。
export function useCompanies() {
  const { data: companies, loading, error, refresh } = useTable(
    'companies', (q) => q.select('*').order('name')
  )
  const add = async (form) => {
    const { data, error } = await supabase.from('companies').insert(form).select().single()
    if (!error) logAudit({ action: 'company_created', category: 'user', description: '会社を追加', targetTable: 'companies', targetId: data.id, targetLabel: data.name, companyId: data.id, after: data })
    return { data, error }
  }
  const update = async (id, form) => {
    const { data: before } = await supabase.from('companies').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('companies').update(form).eq('id', id).select().single()
    if (!error) logAudit({ action: 'company_updated', category: 'user', description: '会社を編集', targetTable: 'companies', targetId: id, targetLabel: data.name, companyId: id, before, after: data })
    return { data, error }
  }
  const remove = async (id) => {
    const { data: before } = await supabase.from('companies').select('*').eq('id', id).maybeSingle()
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (!error) logAudit({ action: 'company_deleted', category: 'user', description: '会社を削除', targetTable: 'companies', targetId: id, targetLabel: before?.name, before })
    return { error }
  }
  return { companies, loading, error, refresh, add, update, remove }
}

// ── 統合ホテル管理(承認済み提案書「統合ホテル管理モジュール」) ──
// ホテルは locations(拠点の共通基底、type='hotel') と hotels(1:1拡張、
// 客室数等) の組。将来1,000施設規模のSaaS展開を前提に、画面①
// (一覧・追加・編集・削除・停止)からDB駆動化する — registry.js の
// 静的配列はここでは参照しない。書き込みはRLS側でcan_write_module
// ('hotel_management')により admin/ceo に限定されるため、ここでは
// クライアント側の権限チェックは行わない(usePermission側でボタン
// 表示を制御する)。
export function useHotels() {
  const { data: hotels, loading, error, refresh } = useTable(
    'locations',
    q => q.select('*, hotels(*), companies(name), business_units(name)').eq('type', 'hotel').is('deleted_at', null).order('name'),
    ['locations', 'hotels'],
  )

  const add = async (form) => {
    const { data: bu } = await supabase.from('business_units').select('id')
      .eq('company_id', form.company_id).eq('key', 'hotel').maybeSingle()

    const { data: location, error: locErr } = await supabase.from('locations').insert({
      company_id: form.company_id, business_unit_id: bu?.id ?? null, type: 'hotel',
      slug: form.slug, name: form.name, address: form.address || '', phone: form.phone || '',
      status: form.status || 'active',
    }).select().single()
    if (locErr) return { error: locErr.message }

    const { data: hotel, error: hotelErr } = await supabase.from('hotels').insert({
      location_id: location.id, room_count: form.room_count || 0,
      brand_name: form.name, brand_key: form.brand_key || 'ricoHotel',
    }).select().single()
    if (hotelErr) return { error: hotelErr.message }

    logAudit({
      action: 'hotel_created', category: 'hotel_ops', description: 'ホテルを新規追加',
      targetTable: 'locations', targetId: location.id, targetLabel: form.name,
      companyId: form.company_id, hotelId: location.id, after: { ...form },
    })
    return { data: { location, hotel } }
  }

  const update = async (locationId, hotelId, form) => {
    const { data: before } = await supabase.from('locations').select('*, hotels(*)').eq('id', locationId).maybeSingle()

    const { error: locErr } = await supabase.from('locations').update({
      name: form.name, address: form.address, phone: form.phone,
    }).eq('id', locationId)
    if (locErr) return { error: locErr.message }

    if (hotelId) {
      const { error: hotelErr } = await supabase.from('hotels').update({
        room_count: form.room_count, brand_key: form.brand_key,
      }).eq('id', hotelId)
      if (hotelErr) return { error: hotelErr.message }
    }

    logAudit({
      action: 'hotel_updated', category: 'hotel_ops', description: 'ホテル情報を編集',
      targetTable: 'locations', targetId: locationId, targetLabel: form.name,
      companyId: before?.company_id, hotelId: locationId, before, after: form,
    })
    return { error: null }
  }

  const setStatus = async (locationId, status) => {
    const { data: before } = await supabase.from('locations').select('status, name, company_id').eq('id', locationId).maybeSingle()
    const { error } = await supabase.from('locations').update({ status }).eq('id', locationId)
    if (!error) {
      logAudit({
        action: status === 'suspended' ? 'hotel_suspended' : 'hotel_reactivated',
        category: 'hotel_ops', description: status === 'suspended' ? 'ホテルを停止' : 'ホテルを再開',
        targetTable: 'locations', targetId: locationId, targetLabel: before?.name,
        companyId: before?.company_id, hotelId: locationId,
        before: { status: before?.status }, after: { status },
      })
    }
    return { error: error?.message }
  }

  const softDelete = async (locationId) => {
    const { data: before } = await supabase.from('locations').select('name, status, company_id').eq('id', locationId).maybeSingle()
    const { error } = await supabase.from('locations').update({ deleted_at: new Date().toISOString() }).eq('id', locationId)
    if (!error) {
      logAudit({
        action: 'hotel_deleted', category: 'hotel_ops', description: 'ホテルを削除',
        targetTable: 'locations', targetId: locationId, targetLabel: before?.name,
        companyId: before?.company_id, hotelId: locationId, before, after: { deleted: true },
      })
    }
    return { error: error?.message }
  }

  return { hotels, loading, error, refresh, add, update, setStatus, softDelete }
}

// ── フロント業務(migration 018) — 客室・宿泊(予約〜チェックイン〜
// チェックアウト)。書き込みはcan_write_module('front')でRLS制御
// (front_desk/hotel_manager/system_admin/ceoロール)。
export function useRooms(hotelId) {
  const { data: rooms, loading, error, refresh } = useTable(
    'rooms',
    q => hotelId ? q.select('*').eq('hotel_id', hotelId).order('room_number') : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
  )

  const setRoomStatus = async (roomId, status) => {
    const { data: before } = await supabase.from('rooms').select('status, room_number, hotel_id').eq('id', roomId).maybeSingle()
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
    if (!error) {
      logAudit({
        action: 'room_status_changed', category: 'hotel_ops', description: '客室ステータスを変更',
        targetTable: 'rooms', targetId: roomId, targetLabel: before?.room_number, hotelId: before?.hotel_id,
        before: { status: before?.status }, after: { status },
      })
      // Housekeeping.jsxの「清掃完了」もFrontDesk.jsxの手動変更も、
      // 同じこの関数を唯一の変更経路としているため(single source of
      // truth)、ここ1箇所への通知追加でどちらの画面から呼ばれても
      // 漏れなくフロントへ届く。
      if (status === 'vacant_clean' && before?.status !== 'vacant_clean') {
        notifyRole('front_desk', { module: 'cleaning', title: `清掃完了: ${before?.room_number ?? ''}号室` })
      }
    }
    return { error }
  }

  const add = async (form) => {
    const { data, error } = await supabase.from('rooms').insert(form).select().single()
    if (!error) logAudit({ action: 'room_created', category: 'hotel_ops', description: '客室を追加', targetTable: 'rooms', targetId: data.id, targetLabel: data.room_number, hotelId: data.hotel_id, after: data })
    return { data, error }
  }

  return { rooms, loading, error, refresh, add, setRoomStatus }
}

export function useStays(hotelId) {
  const { data: stays, loading, error, refresh } = useTable(
    'stays',
    q => hotelId
      ? q.select('*, rooms(room_number)').eq('hotel_id', hotelId).order('checkin_date', { ascending: false })
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
    ['stays', 'rooms'],
  )
  const { employee } = useMyEmployee()

  const add = async (form) => {
    const { data, error } = await supabase.from('stays').insert({ ...form, created_by: employee?.id ?? null, hotel_id: hotelId }).select().single()
    if (!error) {
      logAudit({ action: 'stay_created', category: 'hotel_ops', description: '宿泊予約を登録', targetTable: 'stays', targetId: data.id, targetLabel: data.guest_name, hotelId: data.hotel_id, after: data })
      notifyRole('front_desk', { module: 'front', title: `新しい予約: ${data.guest_name}様(${data.checkin_date}〜${data.checkout_date})` })
    }
    return { data, error }
  }

  // チェックイン — 宿泊ステータスを進め、客室を使用中にする(2テーブル
  // 更新のため1つのRPCではなく順番にawaitする、監査ログは両方に残す)。
  // チェックイン完了は朝食/夕食/清掃の各担当が「今日誰が滞在している
  // か」を知る起点になるため、この3ロールへ通知する。
  const checkIn = async (stay) => {
    const { error: stayErr } = await supabase.from('stays').update({
      status: 'checked_in', actual_checkin_at: new Date().toISOString(),
    }).eq('id', stay.id)
    if (stayErr) return { error: stayErr }
    if (stay.room_id) {
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', stay.room_id)
    }
    logAudit({
      action: 'checkin', category: 'hotel_ops', description: 'チェックイン',
      targetTable: 'stays', targetId: stay.id, targetLabel: stay.guest_name, hotelId: stay.hotel_id,
      before: { status: stay.status }, after: { status: 'checked_in' },
    })
    const roomLabel = stay.rooms?.room_number ? `${stay.rooms.room_number}号室` : ''
    // role key ('breakfast'/'dinner'/'cleaning') は各モジュールの
    // registry id と一致(migrations 012/019参照)。
    for (const roleKey of ['breakfast', 'dinner', 'cleaning']) {
      notifyRole(roleKey, { module: roleKey, title: `チェックイン: ${stay.guest_name}様(${roomLabel})` })
    }
    return { error: null }
  }

  // チェックアウト — 客室はvacant_dirty(清掃前)へ。将来の清掃モジュール
  // はこの状態の部屋をそのまま清掃待ちキューとして使う設計にしている。
  const checkOut = async (stay) => {
    const { error: stayErr } = await supabase.from('stays').update({
      status: 'checked_out', actual_checkout_at: new Date().toISOString(),
    }).eq('id', stay.id)
    if (stayErr) return { error: stayErr }
    if (stay.room_id) {
      await supabase.from('rooms').update({ status: 'vacant_dirty' }).eq('id', stay.room_id)
    }
    logAudit({
      action: 'checkout', category: 'hotel_ops', description: 'チェックアウト',
      targetTable: 'stays', targetId: stay.id, targetLabel: stay.guest_name, hotelId: stay.hotel_id,
      before: { status: stay.status }, after: { status: 'checked_out' },
    })
    return { error: null }
  }

  // キャンセル(HotelOS Foundation v1.0是正) — stays.statusのCHECK制約
  // には元からcancelledが含まれていたが(migration 018)、これを設定
  // するUI・関数がどこにも無かった(実質デッドの状態値)。チェックイン
  // 前(reserved)の予約のみキャンセル対象とする — チェックイン後は
  // チェックアウト操作が正規の終了経路のため。
  const cancelStay = async (stay) => {
    const { error } = await supabase.from('stays').update({ status: 'cancelled' }).eq('id', stay.id)
    if (error) return { error }
    logAudit({
      action: 'stay_cancelled', category: 'hotel_ops', description: '予約をキャンセル',
      targetTable: 'stays', targetId: stay.id, targetLabel: stay.guest_name, hotelId: stay.hotel_id,
      before: { status: stay.status }, after: { status: 'cancelled' },
    })
    notifyRole('front_desk', { module: 'front', title: `予約キャンセル: ${stay.guest_name}様(${stay.checkin_date}〜${stay.checkout_date})` })
    return { error: null }
  }

  // 宿泊延長(HotelOS Foundation v1.0是正) — チェックアウト予定日を
  // 変更する。清掃は「予定していた退室日に清掃準備をしていたら実は
  // 延泊だった」という事故を防ぐため、延長が決まった時点で通知を
  // 受け取る必要がある。
  const extendStay = async (stay, newCheckoutDate) => {
    const { error } = await supabase.from('stays').update({ checkout_date: newCheckoutDate }).eq('id', stay.id)
    if (error) return { error }
    logAudit({
      action: 'stay_extended', category: 'hotel_ops', description: '宿泊を延長',
      targetTable: 'stays', targetId: stay.id, targetLabel: stay.guest_name, hotelId: stay.hotel_id,
      before: { checkout_date: stay.checkout_date }, after: { checkout_date: newCheckoutDate },
    })
    const roomLabel = stay.rooms?.room_number ? `${stay.rooms.room_number}号室` : ''
    notifyRole('cleaning', { module: 'cleaning', title: `宿泊延長: ${stay.guest_name}様(${roomLabel}) → ${newCheckoutDate}まで` })
    return { error: null }
  }

  return { stays, loading, error, refresh, add, checkIn, checkOut, cancelStay, extendStay }
}

// ── 食事提供(migration 020) — 朝食/夕食共通。meal_typeで切り替える
// ため、夕食モジュール実装時もこのフックをそのまま再利用できる
// (rooms→清掃と同じ「テーブル・フックの使い回し」設計)。対象者は
// meal_servicesではなくstaysから毎回算出する(本日チェックイン済み
// で宿泊中の滞在) — 「提供済」を押した瞬間にだけ1行作成/更新される
// ため、事前のレコード作成は不要。
export function useMealService(hotelId, mealType) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: stays, loading: staysLoading, error: staysError, refresh: refreshStays } = useTable(
    'stays',
    q => hotelId
      ? q.select('*, rooms(room_number)').eq('hotel_id', hotelId).eq('status', 'checked_in')
          .lte('checkin_date', today).gte('checkout_date', today).order('checkin_date')
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
  )
  const { data: services, loading: servicesLoading, error: servicesError, refresh: refreshServices } = useTable(
    'meal_services',
    q => hotelId
      ? q.select('*, employees(full_name)').eq('hotel_id', hotelId).eq('meal_type', mealType).eq('service_date', today)
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
  )
  // 提供履歴(Dinner要求⑤で追加) — 本日分はroster側で既に表示している
  // ため、重複を避けて過去日(service_date < today)のserved=trueのみを
  // 直近20件表示する。stays経由でゲスト名・部屋番号を結合する。
  const { data: history, loading: historyLoading, error: historyError, refresh: refreshHistory } = useTable(
    'meal_services',
    q => hotelId
      ? q.select('*, stays(guest_name, rooms(room_number)), employees(full_name)').eq('hotel_id', hotelId).eq('meal_type', mealType)
          .eq('served', true).lt('service_date', today).order('service_date', { ascending: false }).limit(20)
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
    ['meal_services', 'stays'],
  )
  const { employee } = useMyEmployee()

  const roster = stays.map(s => ({ ...s, service: services.find(sv => sv.stay_id === s.id) || null }))

  const toggleServed = async (stay, served) => {
    const existing = services.find(sv => sv.stay_id === stay.id)
    const payload = {
      hotel_id: hotelId, stay_id: stay.id, meal_type: mealType, service_date: today,
      served, served_at: served ? new Date().toISOString() : null, served_by: served ? (employee?.id ?? null) : null,
    }
    const { data, error } = existing
      ? await supabase.from('meal_services').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('meal_services').insert(payload).select().single()
    if (!error) {
      logAudit({
        action: served ? `${mealType}_served` : `${mealType}_unserved`, category: 'hotel_ops',
        description: served ? '食事を提供済みに変更' : '食事を未提供に変更',
        targetTable: 'meal_services', targetId: data.id, targetLabel: stay.guest_name, hotelId,
        before: { served: existing?.served ?? false }, after: { served },
      })
    }
    return { error }
  }

  return {
    roster, loading: staysLoading || servicesLoading, error: staysError || servicesError,
    refresh: () => { refreshStays(); refreshServices() }, toggleServed,
    history, historyLoading, historyError, refreshHistory,
  }
}

// ── 日次売上(migration 023) — 客室/朝食/夕食/駐車場のいずれにも
// 金額を持つ列が存在しない(rooms/stays/meal_services/parking_usages
// はいずれも実際の請求額を持たない)ため、宿泊・提供件数からの自動
// 計算は行わない(割引・追加料金を考慮すると実額の"推測"になる)。
// 実際のホテル現場の締め作業と同じく、フロント/支配人がレジ締め
// 時点の実額を日次で記録する手入力方式。合計はDB側のGENERATED
// ALWAYS ASで保証済み(アプリ側では再計算しない)。
export function useDailySales(hotelId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: history, loading, error, refresh } = useTable(
    'daily_sales',
    q => hotelId
      ? q.select('*, employees(full_name)').eq('hotel_id', hotelId).order('sales_date', { ascending: false }).limit(30)
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
  )
  const { employee } = useMyEmployee()

  const todayRecord = history.find(r => r.sales_date === today) || null

  const save = async (form) => {
    const payload = {
      room_revenue: Number(form.room_revenue) || 0,
      breakfast_revenue: Number(form.breakfast_revenue) || 0,
      dinner_revenue: Number(form.dinner_revenue) || 0,
      parking_revenue: Number(form.parking_revenue) || 0,
      notes: form.notes || '',
      recorded_by: employee?.id ?? null,
    }
    const { data, error } = todayRecord
      ? await supabase.from('daily_sales').update(payload).eq('id', todayRecord.id).select().single()
      : await supabase.from('daily_sales').insert({ ...payload, hotel_id: hotelId, sales_date: today }).select().single()
    if (!error) {
      logAudit({
        action: todayRecord ? 'daily_sales_updated' : 'daily_sales_recorded', category: 'hotel_ops',
        description: '日次売上を記録', targetTable: 'daily_sales', targetId: data.id, targetLabel: data.sales_date,
        hotelId: data.hotel_id, before: todayRecord || undefined, after: data,
      })
      notifyRole('hotel_manager', { module: 'revenue', title: `本日の売上が${todayRecord ? '更新' : '登録'}されました: ¥${Number(data.total_revenue).toLocaleString()}` })
    }
    return { data, error }
  }

  return { history, todayRecord, loading, error, refresh, save }
}

// ── 日次締め(Night Audit、migration 024) — 既存の売上管理
// (daily_sales)テーブル・フックには一切手を加えない(「既存設計を
// 変更しない」指示のため)。night_auditsは締め処理の瞬間にdaily_sales
// の当日レコードをスナップショットする別テーブル。1日1回・1レコード
// につき1回のみ(DB側のUNIQUE制約2本で保証)、UPDATE/DELETEポリシー
// は存在しないため一度記録した締めは訂正できない(確定記録)。
export function useNightAudit(hotelId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: history, loading, error, refresh } = useTable(
    'night_audits',
    q => hotelId
      ? q.select('*, employees(full_name)').eq('hotel_id', hotelId).order('audit_date', { ascending: false }).limit(30)
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
  )
  const { employee } = useMyEmployee()

  const todayAudit = history.find(a => a.audit_date === today) || null

  // dailySalesは呼び出し元(NightAudit.jsx)がuseDailySales()から渡す
  // — 当日の売上が未入力(dailySales === null)の場合は締め処理自体を
  // 実行できない(推測でゼロ円締めを作らない)。
  const closeDay = async (dailySales) => {
    if (!dailySales) return { error: { message: '本日の売上が未入力です。売上管理画面で入力してください。' } }
    if (todayAudit) return { error: { message: '本日は既に締め処理済みです。' } }
    const payload = {
      hotel_id: hotelId, audit_date: today, daily_sales_id: dailySales.id,
      room_revenue: dailySales.room_revenue, breakfast_revenue: dailySales.breakfast_revenue,
      dinner_revenue: dailySales.dinner_revenue, parking_revenue: dailySales.parking_revenue,
      closed_by: employee?.id ?? null,
    }
    const { data, error } = await supabase.from('night_audits').insert(payload).select().single()
    if (!error) {
      logAudit({
        action: 'night_audit_closed', category: 'hotel_ops', description: '日次締めを実行',
        targetTable: 'night_audits', targetId: data.id, targetLabel: data.audit_date, hotelId, after: data,
      })
      notifyRole('hotel_manager', { module: 'night-audit', title: `本日の締め処理が完了しました: ¥${Number(data.total_revenue).toLocaleString()}` })
    }
    return { data, error }
  }

  return { history, todayAudit, loading, error, refresh, closeDay }
}

// ── 駐車場(migration 021) — parking_spotsが駐車位置そのもの(rooms
// 相当)、parking_usagesが宿泊者の駐車利用(stays相当)。区画は同時刻
// 1台が前提のため、rooms/staysと異なり利用登録の時点で区画を
// 'reserved'にする(予約しても区画状態を変えないroomsとは意図的に
// 異なる設計 — 駐車場は空き区画の可視化がそのまま現場の判断材料に
// なるため)。
export function useParkingSpots(hotelId) {
  const { data: spots, loading, error, refresh } = useTable(
    'parking_spots',
    q => hotelId ? q.select('*').eq('hotel_id', hotelId).order('spot_number') : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
  )

  const setSpotStatus = async (spotId, status) => {
    const { data: before } = await supabase.from('parking_spots').select('status, spot_number, hotel_id').eq('id', spotId).maybeSingle()
    const { error } = await supabase.from('parking_spots').update({ status }).eq('id', spotId)
    if (!error) {
      logAudit({
        action: 'parking_spot_status_changed', category: 'hotel_ops', description: '駐車位置ステータスを変更',
        targetTable: 'parking_spots', targetId: spotId, targetLabel: before?.spot_number, hotelId: before?.hotel_id,
        before: { status: before?.status }, after: { status },
      })
    }
    return { error }
  }

  const add = async (form) => {
    const { data, error } = await supabase.from('parking_spots').insert(form).select().single()
    if (!error) logAudit({ action: 'parking_spot_created', category: 'hotel_ops', description: '駐車位置を追加', targetTable: 'parking_spots', targetId: data.id, targetLabel: data.spot_number, hotelId: data.hotel_id, after: data })
    return { data, error }
  }

  return { spots, loading, error, refresh, add, setSpotStatus }
}

export function useParkingUsages(hotelId) {
  const { data: usages, loading, error, refresh } = useTable(
    'parking_usages',
    q => hotelId
      ? q.select('*, parking_spots(spot_number), stays(guest_name)').eq('hotel_id', hotelId).order('created_at', { ascending: false })
      : q.select('*').eq('hotel_id', '00000000-0000-0000-0000-000000000000'),
    ['parking_usages', 'parking_spots'],
  )
  const { employee } = useMyEmployee()

  // 利用登録と同時に区画を'reserved'にする(rooms/staysと異なる設計、
  // ファイル冒頭のコメント参照)。spot_id/stay_idはmigration 021で
  // NOT NULL — 区画未定・宿泊者未紐付けの状態は最初から発生しない。
  const add = async (form) => {
    const { data, error } = await supabase.from('parking_usages').insert({ ...form, created_by: employee?.id ?? null, hotel_id: hotelId }).select().single()
    if (!error) {
      await supabase.from('parking_spots').update({ status: 'reserved' }).eq('id', data.spot_id)
      logAudit({ action: 'parking_usage_created', category: 'hotel_ops', description: '駐車利用を登録', targetTable: 'parking_usages', targetId: data.id, targetLabel: data.license_plate, hotelId: data.hotel_id, after: data })
    }
    return { data, error }
  }

  const startUsage = async (usage) => {
    const { error: usageErr } = await supabase.from('parking_usages').update({
      status: 'active', start_at: new Date().toISOString(),
    }).eq('id', usage.id)
    if (usageErr) return { error: usageErr }
    await supabase.from('parking_spots').update({ status: 'occupied' }).eq('id', usage.spot_id)
    logAudit({
      action: 'parking_usage_started', category: 'hotel_ops', description: '駐車利用を開始',
      targetTable: 'parking_usages', targetId: usage.id, targetLabel: usage.license_plate, hotelId: usage.hotel_id,
      before: { status: usage.status }, after: { status: 'active' },
    })
    return { error: null }
  }

  const endUsage = async (usage) => {
    const { error: usageErr } = await supabase.from('parking_usages').update({
      status: 'completed', end_at: new Date().toISOString(),
    }).eq('id', usage.id)
    if (usageErr) return { error: usageErr }
    await supabase.from('parking_spots').update({ status: 'vacant' }).eq('id', usage.spot_id)
    logAudit({
      action: 'parking_usage_ended', category: 'hotel_ops', description: '駐車利用を終了',
      targetTable: 'parking_usages', targetId: usage.id, targetLabel: usage.license_plate, hotelId: usage.hotel_id,
      before: { status: usage.status }, after: { status: 'completed' },
    })
    return { error: null }
  }

  return { usages, loading, error, refresh, add, startUsage, endUsage }
}

// スラッグから1件のホテルを解決する — HotelsApp.jsxの動的ルーティング
// (`/hotels/:hotelSlug`)がここを使う。以前はregistry.jsの静的配列
// との文字列一致だったが、これによりホテル管理画面から追加した
// ホテルが、コード変更なしにそのままアクセス可能になる。
export function useHotelBySlug(slug) {
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) { setHotel(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase.from('locations').select('*, hotels(*)')
      .eq('slug', slug).eq('type', 'hotel').is('deleted_at', null).maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { console.error('[useHotelBySlug] fetch failed:', err); setError(err.message); setHotel(null) }
        else { setHotel(data); setError(data ? null : 'not_found') }
        setLoading(false)
      })
      .catch(e => {
        console.error('[useHotelBySlug] fetch threw:', e)
        if (!cancelled) { setError(e.message); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [slug])

  return { hotel, loading, error }
}

// ── EMPLOYEES — company-wide master. `employees` itself never
// references a hotel; assignment (location/department/position) lives
// in employee_assignments and is upserted separately below so
// reassigning someone never touches their employees row.
export function useEmployees() {
  const { data: employees, loading, error, refresh } = useTable(
    'v_employee_directory', (q) => q.select('*'), ['employees', 'employee_assignments'],
  )
  const { permissions } = useAuth()
  const { companyId } = useCurrentCompany()

  // 既存社員の追加登録(employeesのみ、Authアカウントは作らない) —
  // 現在はcreateWithAuth()に一本化したため、通常のUIからは呼ばれない。
  // 過去データ移行など、ログイン資格を持たない社員行だけを作りたい
  // 特殊なケースのために残す(ERP開発憲章第38条: 通常の登録経路では
  // 使わない)。
  const add = async (form, assignment) => {
    if (!permissions.canWrite) return { error: '権限がありません' }
    const { data, error } = await supabase.from('employees').insert({
      ...form, company_id: form.company_id || companyId,
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
    const { data: before } = await supabase.from('employees').select('*').eq('id', id).maybeSingle()
    const { data, error } = await supabase.from('employees').update(form).eq('id', id).select().single()
    if (error) return { error }

    let assignmentBefore = null
    if (assignment?.location_id) {
      const { data: existing } = await supabase
        .from('employee_assignments').select('*')
        .eq('employee_id', id).eq('is_primary', true).is('end_date', null)
        .maybeSingle()
      assignmentBefore = existing
      if (existing) {
        await supabase.from('employee_assignments').update(assignment).eq('id', existing.id)
      } else {
        await supabase.from('employee_assignments').insert({ employee_id: id, is_primary: true, ...assignment })
      }
      if (!assignmentBefore || assignmentBefore.location_id !== assignment.location_id) {
        logAudit({
          action: 'hotel_assignment_changed', category: 'user', description: 'ホテル所属を変更',
          targetEmployeeId: id, targetLabel: data.full_name, hotelId: assignment.location_id,
          before: assignmentBefore ? { location_id: assignmentBefore.location_id } : null,
          after: { location_id: assignment.location_id },
        })
      }
    }

    logAudit({ action: 'employee_updated', category: 'user', description: '社員情報を編集', targetEmployeeId: id, targetLabel: data.full_name, before, after: data })
    return { data, error }
  }

  // 退職処理(第①④是正) — 以前はemployeesテーブルを直接UPDATEする
  // だけで、退職者のAuthログイン資格が生きたまま残る不具合があった。
  // Authのban(無効化)はservice-roleでしかできないため、
  // create-employee Edge Function(action:'deactivate')に集約する
  // (監査ログはEdge Function側で書き込み済み、ここでは呼ばない)。
  const softDelete = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: { action: 'deactivate', employee_id: id },
    })
    if (error) {
      const detail = error.context?.body ? await error.context.text?.().catch(() => null) : null
      return { error: detail || error.message || '退職処理に失敗しました' }
    }
    if (data?.error) return { error: data.error }
    return { error: null }
  }

  // 復職処理 — softDeleteの逆(Authログイン資格も復元する)。
  const reactivate = async (id) => {
    if (!permissions.canDelete) return { error: '権限がありません' }
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: { action: 'reactivate', employee_id: id },
    })
    if (error) {
      const detail = error.context?.body ? await error.context.text?.().catch(() => null) : null
      return { error: detail || error.message || '復職処理に失敗しました' }
    }
    if (data?.error) return { error: data.error }
    return { error: null }
  }

  return { employees, loading, error, refresh, add, createWithAuth, update, softDelete, reactivate }
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
    ['approval_requests', 'approval_steps'],
  )
  const { companyId } = useCurrentCompany()

  const create = async ({ module, title, description = '', amount = null, requestedBy, approverRoleId = null, approverEmployeeId = null }) => {
    const { data: req, error } = await supabase.from('approval_requests').insert({
      company_id: companyId, module, title, description, amount, requested_by: requestedBy,
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
    'v_employee_accounts', (q) => q.select('*').order('full_name'), ['employee_roles', 'employees'],
  )
  const { permissions } = useAuth()

  const updateRole = async (employeeId, roleKey) => {
    if (!permissions.canManageUsers) return { error: '管理者のみ変更できます' }
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles').select('id').eq('key', roleKey).maybeSingle()
    if (roleErr || !roleRow) return { error: '指定された権限が見つかりません' }

    const before = users.find(u => u.employee_id === employeeId)

    // このUIは「1人1権限」の簡易表示のため、既存の割り当てを置き換える。
    const { error: delErr } = await supabase.from('employee_roles').delete().eq('employee_id', employeeId)
    if (delErr) return { error: delErr.message }
    const { error: insErr } = await supabase.from('employee_roles').insert({ employee_id: employeeId, role_id: roleRow.id })
    if (!insErr) {
      logAudit({
        action: 'role_changed', category: 'user', description: '権限を変更',
        targetEmployeeId: employeeId, targetLabel: before?.full_name || '',
        before: { role_keys: before?.role_keys || [] }, after: { role_keys: [roleKey] },
      })
    }
    return { error: insErr?.message }
  }

  return { users, loading, error, refresh, updateRole }
}

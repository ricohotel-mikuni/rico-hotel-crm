import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// General-purpose, module-agnostic permission engine — separate from
// (and additive to) the legacy `permissions.canWrite`/`canDelete` in
// AuthContext, which stays wired to user_profiles.role for the sales
// module only. This is what any *new* module (approvals, employee
// management writes, future modules) should check instead.
//
// `module` is a free-text string matching a module registry `id`
// (src/modules/registry.js / src/modules/portal/registry.js), and
// `action` is one of view/edit/delete/approve/download/csv/print —
// see role_permissions in supabase/migrations/006_hr_permissions_approvals.sql.
// 'system_admin' and 'ceo' role keys are special-cased here (mirroring
// the DB seed strategy) so neither ever needs a role_permissions row
// added when a new module ships.
const PermissionContext = createContext({
  loading: true,
  isSystemAdmin: false,
  isCeo: false,
  can: () => false,
})

const EMPTY_STATE = { loading: false, isSystemAdmin: false, isCeo: false, map: {} }

export function PermissionProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState({ ...EMPTY_STATE, loading: true })

  const load = useCallback(async () => {
    if (!user) { setState(EMPTY_STATE); return }

    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!emp) { setState(EMPTY_STATE); return }

      const { data: rows } = await supabase
        .from('employee_roles')
        .select('roles(key, role_permissions(module, can_view, can_edit, can_delete, can_approve, can_download, can_csv, can_print))')
        .eq('employee_id', emp.id)

      let isSystemAdmin = false
      let isCeo = false
      const map = {}

      for (const row of rows ?? []) {
        const role = row.roles
        if (!role) continue
        if (role.key === 'system_admin') isSystemAdmin = true
        if (role.key === 'ceo') isCeo = true
        for (const perm of role.role_permissions ?? []) {
          const existing = map[perm.module] || {}
          map[perm.module] = {
            view: existing.view || perm.can_view,
            edit: existing.edit || perm.can_edit,
            delete: existing.delete || perm.can_delete,
            approve: existing.approve || perm.can_approve,
            download: existing.download || perm.can_download,
            csv: existing.csv || perm.can_csv,
            print: existing.print || perm.can_print,
          }
        }
      }

      setState({ loading: false, isSystemAdmin, isCeo, map })
    } catch (e) {
      // Network hiccup or migration not applied yet in this environment —
      // fail closed (no extra permissions granted) rather than crash.
      console.error('[PermissionContext] load failed:', e)
      setState(EMPTY_STATE)
    }
  }, [user?.id]) // eslint-disable-line

  useEffect(() => {
    if (!user) { setState(EMPTY_STATE); return }
    setState(s => ({ ...s, loading: true }))
    load()

    // Realtime: if an admin changes my roles, or edits a role's grants,
    // refetch so the permission map never stays stale for the rest of
    // the session (same pattern as useTable's realtime subscription).
    const channel = supabase
      .channel(`realtime:permissions:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_roles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, load])

  const can = useCallback((module, action) => {
    if (state.isSystemAdmin) return true
    if (state.isCeo && (action === 'view' || action === 'approve')) return true
    return Boolean(state.map[module]?.[action])
  }, [state])

  return (
    <PermissionContext.Provider value={{ loading: state.loading, isSystemAdmin: state.isSystemAdmin, isCeo: state.isCeo, can }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission(module, action) {
  const { can } = useContext(PermissionContext)
  return can(module, action)
}

export function usePermissions() {
  return useContext(PermissionContext)
}

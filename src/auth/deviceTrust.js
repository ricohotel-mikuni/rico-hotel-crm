// この端末が「信頼済み」かどうかをlocalStorageだけで判定するための
// 薄いヘルパー。サーバー側の真実(public.trusted_devices)は
// register_trusted_device()/revoke_trusted_device()/verify_employee_pin()
// (supabase/migrations/012_pin_auth_departments.sql, 013で有効期限追加)
// が管理する。ここは「この端末に誰が登録されているか」の表示用
// ローカルキャッシュ(ユーザー選択画面に名前を出すため)を持つだけ。
//
// 2026-07-09の設計変更: 以前はここにSupabaseのrefresh_tokenも保存し、
// PINログイン成功時にrefreshSession()で再提示していたが、
// signOut()はscope指定に関わらず「今使っているセッション」のrefresh
// tokenを必ず失効させる(@supabase/auth-js の実装で確認済み)ため、
// この設計は原理的に成立しなかった。現在のPINは
// AuthContext.jsx の lock()/unlock() による「生きたセッションの上の
// ロック画面」であり、トークンの保存・再提示は一切不要になった。
const DEVICE_ID_KEY = 'daiei_pin_device_id'
const ROSTER_KEY = 'daiei_pin_device_roster'
export const JUST_PASSWORD_SIGNED_IN_KEY = 'daiei_just_password_signed_in'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getRoster() {
  try {
    const raw = localStorage.getItem(ROSTER_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    console.error('[deviceTrust] getRoster: JSON.parse failed, treating as empty', e)
    return []
  }
}

function saveRoster(list) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(list))
}

export function hasTrustedRoster() {
  return getRoster().length > 0
}

export function findRosterEntry(employeeId) {
  return getRoster().find(r => r.employee_id === employeeId) || null
}

// entry: { employee_id, full_name, department_name, position }
export function upsertRosterEntry(entry) {
  const list = getRoster().filter(r => r.employee_id !== entry.employee_id)
  list.push(entry)
  saveRoster(list)
}

export function removeRosterEntry(employeeId) {
  saveRoster(getRoster().filter(r => r.employee_id !== employeeId))
}

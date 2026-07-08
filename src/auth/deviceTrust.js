// この端末が「信頼済み」かどうかをlocalStorageだけで判定するための
// 薄いヘルパー。サーバー側の真実(public.trusted_devices)は
// register_trusted_device()/revoke_trusted_device()/verify_employee_pin()
// (supabase/migrations/012_pin_auth_departments.sql)が管理し、ここは
// 「この端末に誰が登録されているか」の表示用ローカルキャッシュと、
// PINログイン成立に使う refresh_token の保管場所を持つだけ。
//
// refresh_tokenをlocalStorageへ保存することについて: Supabaseの標準の
// persistSession:true も同じくlocalStorageへセッション(refresh_token
// 込み)を保存しており、これはそれと同等のリスク水準 — 新たな脆弱性
// を持ち込むものではない(提案書「メリット・デメリット」参照)。

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
  } catch {
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

// entry: { employee_id, full_name, department_name, position, refresh_token }
export function upsertRosterEntry(entry) {
  const list = getRoster().filter(r => r.employee_id !== entry.employee_id)
  list.push(entry)
  saveRoster(list)
}

export function updateRosterToken(employeeId, refreshToken) {
  const list = getRoster()
  const idx = list.findIndex(r => r.employee_id === employeeId)
  if (idx === -1) return
  list[idx] = { ...list[idx], refresh_token: refreshToken }
  saveRoster(list)
}

export function removeRosterEntry(employeeId) {
  saveRoster(getRoster().filter(r => r.employee_id !== employeeId))
}

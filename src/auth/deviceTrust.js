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

// 診断用 — トークンを丸ごとconsoleへ出さず、先頭/末尾数文字とlengthだけ
// 見せる(コンソールログからの秘密情報漏えいを避けつつ、値の有無・
// 取り違え・空文字は判別できるようにする)。
export function maskToken(t) {
  if (t === undefined) return '(undefined)'
  if (t === null) return '(null)'
  if (typeof t !== 'string') return `(non-string:${typeof t})`
  if (t.length === 0) return '(empty string)'
  if (t.length <= 10) return `${t}(len=${t.length})`
  return `${t.slice(0, 6)}…${t.slice(-4)}(len=${t.length})`
}

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
    console.log('[DAI-AUTH][deviceTrust] generated new device_id:', id)
  }
  return id
}

export function getRoster() {
  try {
    const raw = localStorage.getItem(ROSTER_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    console.error('[DAI-AUTH][deviceTrust] getRoster: JSON.parse failed, treating as empty', e)
    return []
  }
}

function saveRoster(list) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(list))
  console.log('[DAI-AUTH][deviceTrust] saveRoster ->', list.map(r => ({
    employee_id: r.employee_id, full_name: r.full_name, refresh_token: maskToken(r.refresh_token),
  })))
}

export function hasTrustedRoster() {
  return getRoster().length > 0
}

export function findRosterEntry(employeeId) {
  return getRoster().find(r => r.employee_id === employeeId) || null
}

// entry: { employee_id, full_name, department_name, position, refresh_token }
export function upsertRosterEntry(entry) {
  console.log('[DAI-AUTH][deviceTrust] upsertRosterEntry called with employee_id=%s refresh_token=%s',
    entry.employee_id, maskToken(entry.refresh_token))
  if (typeof entry.refresh_token !== 'string' || entry.refresh_token.length === 0) {
    // JSON.stringifyはundefinedのキーを黙って捨てるため、ここで検知しない
    // と「保存に成功したように見えて実は端末情報にトークンが無い」状態が
    // 次のPINログインまで気付かれない。ここで必ず大きな声で失敗させる。
    console.error('[DAI-AUTH][deviceTrust] REFUSING to store roster entry — refresh_token is missing/invalid.', entry)
    throw new Error('信頼済み端末の登録に失敗しました(セッション情報を取得できませんでした)。もう一度お試しください。')
  }
  const list = getRoster().filter(r => r.employee_id !== entry.employee_id)
  list.push(entry)
  saveRoster(list)
}

export function updateRosterToken(employeeId, refreshToken) {
  console.log('[DAI-AUTH][deviceTrust] updateRosterToken employee_id=%s refresh_token=%s',
    employeeId, maskToken(refreshToken))
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    console.error('[DAI-AUTH][deviceTrust] updateRosterToken called with missing/invalid token — leaving existing stored token untouched.')
    return
  }
  const list = getRoster()
  const idx = list.findIndex(r => r.employee_id === employeeId)
  if (idx === -1) {
    console.error('[DAI-AUTH][deviceTrust] updateRosterToken: no roster entry found for employee_id=%s', employeeId)
    return
  }
  list[idx] = { ...list[idx], refresh_token: refreshToken }
  saveRoster(list)
}

export function removeRosterEntry(employeeId) {
  console.log('[DAI-AUTH][deviceTrust] removeRosterEntry employee_id=%s', employeeId)
  saveRoster(getRoster().filter(r => r.employee_id !== employeeId))
}

// create-employee — 社員登録の唯一の入口(ERP開発憲章 第38条・第39条)。
//
// なぜEdge Functionが必要か: クライアントから直接 `auth.signUp()` を
// 呼ぶと、(1) メール確認が有効なプロジェクト設定では新しい社員が
// 確認メールをクリックするまでログインできない、(2) 確認が無効な
// 設定では signUp() が呼び出した管理者自身のブラウザのセッションを
// 新しい社員のものへ入れ替えてしまう、という2つの問題がある。
// service-role(管理者API)を使えるのはサーバー側だけのため、この
// 処理だけはEdge Functionを唯一の入口とする(ERP開発憲章第17条
// Ver.1.4改定)。
//
// 呼び出し元は「管理者/マネージャー」権限を持つログイン中の社員に
// 限定する(呼び出し元のJWTをservice-roleクライアントで検証する)。
//
// 保存順序: ①Auth作成 → ②employees作成(user_id紐付け) →
// ③employee_assignments(所属) → ④employee_roles(権限) →
// ⑤PIN(任意) → ⑥user_profiles(トリガーで自動生成される。念のため
// full_name/roleを明示的にも同期する)。途中で失敗した場合は、
// 直前までに作成したAuthユーザーを削除して後始末する(社員データが
// 中途半端な状態で残らないようにするため)。

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 新方式(employee_roles)のロールキー → 旧方式(user_profiles.role)の
// 4値への最善マッピング。既存のRLSヘルパー(is_admin_or_manager() /
// can_write())は引き続きuser_profiles.roleを見ているため、新方式で
// 権限を作成するのと同時にこの対応表で同期し、2つの方式の食い違いを
// 防ぐ(根本統合は別途の機能提案とする、ERP開発憲章第20条参照)。
const LEGACY_ROLE_MAP: Record<string, string> = {
  system_admin: 'admin',
  ceo: 'admin',
  hotel_manager: 'manager',
  sales: 'sales',
  front_desk: 'sales',
  accounting: 'sales',
  cleaning: 'viewer',
  admin: 'admin',
  manager: 'manager',
  viewer: 'viewer',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }
  const fail = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerJwt = authHeader.replace('Bearer ', '')
    if (!callerJwt) return fail(401, 'ログインが必要です')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // 呼び出し元の本人確認
    const { data: callerData, error: callerErr } = await admin.auth.getUser(callerJwt)
    if (callerErr || !callerData?.user) return fail(401, 'ログイン情報を確認できませんでした')

    // 呼び出し元が管理者/マネージャーであることを確認(旧方式の
    // user_profiles.roleで判定 — 既存のRLSヘルパーと同じ基準)。
    const { data: callerProfile } = await admin
      .from('user_profiles').select('role').eq('id', callerData.user.id).maybeSingle()
    if (!callerProfile || !['admin', 'manager'].includes(callerProfile.role)) {
      return fail(403, '社員登録には管理者権限が必要です')
    }

    const body = await req.json()
    const {
      full_name, employee_no, email, password, pin,
      department_id, position, role_key, company_id, location_id,
      hire_date, status,
    } = body ?? {}

    if (!full_name || !email || !password) {
      return fail(400, '氏名・メールアドレス・初期パスワードは必須です')
    }
    if (password.length < 8) {
      return fail(400, '初期パスワードは8文字以上にしてください')
    }
    if (pin && !/^[0-9]{6}$/.test(pin)) {
      return fail(400, 'PINは6桁の数字で入力してください')
    }

    // ① Auth作成 — email_confirm:true により確認メール待ちなしで
    // 直ちにログイン可能にする(第39条)。
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name },
    })
    if (createErr || !created?.user) {
      return fail(400, 'アカウント作成に失敗しました: ' + (createErr?.message ?? '不明なエラー'))
    }
    const userId = created.user.id

    // 後始末: 途中で失敗したら作成済みのAuthユーザーを削除する。
    const rollback = async () => { await admin.auth.admin.deleteUser(userId) }

    // ② employees作成(社員マスタ、第38条)
    const { data: employee, error: empErr } = await admin.from('employees').insert({
      company_id, user_id: userId, employee_no, full_name, email,
      hire_date: hire_date || null,
      status: status || 'active',
    }).select().single()
    if (empErr) { await rollback(); return fail(400, '社員情報の作成に失敗しました: ' + empErr.message) }

    // ③ 所属(拠点・部署・役職)
    if (location_id) {
      const { error: asgErr } = await admin.from('employee_assignments').insert({
        employee_id: employee.id, location_id, department_id: department_id || null,
        position: position || '', is_primary: true,
      })
      if (asgErr) { await rollback(); return fail(400, '所属の登録に失敗しました: ' + asgErr.message) }
    }

    // ④ 権限(employee_roles、新方式)
    if (role_key) {
      const { data: roleRow, error: roleLookupErr } = await admin
        .from('roles').select('id').eq('key', role_key).maybeSingle()
      if (roleLookupErr || !roleRow) { await rollback(); return fail(400, '指定された権限が見つかりません: ' + role_key) }
      const { error: erErr } = await admin.from('employee_roles').insert({
        employee_id: employee.id, role_id: roleRow.id,
      })
      if (erErr) { await rollback(); return fail(400, '権限の付与に失敗しました: ' + erErr.message) }

      // 旧方式(user_profiles.role)にも同時反映 — 第20条の移行期間中、
      // 既存のRLSヘルパー(is_admin_or_manager()/can_write())が
      // 新方式の権限を正しく認識できるようにするための橋渡し。
      const legacyRole = LEGACY_ROLE_MAP[role_key] ?? 'viewer'
      await admin.from('user_profiles').update({ role: legacyRole }).eq('id', userId)
    }

    // ⑤ PIN(任意 — 未入力なら本人が後日ログイン後に設定できる)
    if (pin) {
      const { error: pinErr } = await admin.rpc('admin_set_employee_pin', {
        p_employee_id: employee.id, p_pin: pin,
      })
      if (pinErr) { await rollback(); return fail(400, 'PINの登録に失敗しました: ' + pinErr.message) }
    }

    return new Response(JSON.stringify({ employee_id: employee.id, user_id: userId }), {
      status: 200, headers: jsonHeaders,
    })
  } catch (e) {
    return fail(500, '予期しないエラーが発生しました: ' + (e instanceof Error ? e.message : String(e)))
  }
})

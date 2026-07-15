-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 014: 社員マスタ・認証の一元化(ERP開発憲章第十二章)
-- Created: 2026-07-15
--
-- 背景: 「社員登録」(employeesのみに書き込み、Authアカウントを
-- 作らない)と「営業設定のスタッフ追加」(Auth+user_profilesのみ
-- 作成、employeesには書き込まない)が同一人物を別々に登録しており、
-- 後者で作られたアカウントはメール確認待ちのままログインできない、
-- または確認が無効な設定では作成者(管理者)自身のセッションを
-- 奪ってしまうという不具合があった。
--
-- 対応: 社員登録専用のEdge Function(supabase/functions/
-- create-employee)を唯一の入口とし、employeesを社員情報の唯一の
-- 正とする(第38条)。このマイグレーションは、そのEdge Functionが
-- 使うPIN登録関数と、新方式(employee_roles)⇄旧方式
-- (user_profiles.role)を自動的に同期させるトリガーを追加する
-- (第20条: 新旧2方式の並行運用に対する橋渡し)。
-- ============================================================

-- ============================================================
-- 1. admin_set_employee_pin — Edge Function(service-role)専用。
--    set_employee_pin()と違い、呼び出し元本人ではなく管理者が
--    「他の社員のPIN」を初期設定するためのもの。service_roleにしか
--    実行権限を与えないため、クライアントから直接呼ばれることはない
--    (service-roleキーはEdge Function内にしか存在しない)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_employee_pin(p_employee_id UUID, p_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PINは6桁の数字で入力してください';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION '社員情報が見つかりません';
  END IF;

  INSERT INTO public.employee_pin_credentials (employee_id, pin_hash, failed_attempts, locked_until)
  VALUES (p_employee_id, crypt(p_pin, gen_salt('bf')), 0, NULL)
  ON CONFLICT (employee_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.admin_set_employee_pin(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_employee_pin(UUID, TEXT) TO service_role;

-- ============================================================
-- 2. 新方式(employee_roles)→ 旧方式(user_profiles.role)の
--    最善対応表。既存のRLSヘルパー(is_admin_or_manager()/
--    can_write())は引き続きuser_profiles.roleを見ているため、
--    権限が変わるたびに自動で橋渡しする。1人が複数ロールを持つ
--    場合は最も強い権限を採用する(第21条: 複数役割対応)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.legacy_role_for_employee(p_employee_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_keys TEXT[];
BEGIN
  SELECT array_agg(r.key) INTO v_keys
  FROM public.employee_roles er
  JOIN public.roles r ON r.id = er.role_id
  WHERE er.employee_id = p_employee_id;

  IF v_keys IS NULL THEN RETURN 'viewer'; END IF;
  IF v_keys && ARRAY['system_admin','ceo','admin'] THEN RETURN 'admin'; END IF;
  IF v_keys && ARRAY['hotel_manager','manager'] THEN RETURN 'manager'; END IF;
  IF v_keys && ARRAY['sales','front_desk','accounting'] THEN RETURN 'sales'; END IF;
  RETURN 'viewer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.sync_legacy_role_from_employee_roles()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_user_id UUID;
BEGIN
  v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
  SELECT user_id INTO v_user_id FROM public.employees WHERE id = v_employee_id;
  IF v_user_id IS NOT NULL THEN
    UPDATE public.user_profiles
      SET role = public.legacy_role_for_employee(v_employee_id)
      WHERE id = v_user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS employee_roles_sync_legacy ON public.employee_roles;
CREATE TRIGGER employee_roles_sync_legacy
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_role_from_employee_roles();

-- ============================================================
-- 3. employees の氏名・在籍状況が変わったら user_profiles にも反映
--    (表示名のズレ防止。employee_assignments/companiesは
--    user_profilesに対応列が無いため同期対象外)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_user_profile_from_employee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.user_profiles
      SET full_name = NEW.full_name,
          is_active = (NEW.status = 'active') AND NEW.deleted_at IS NULL
      WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS employees_sync_user_profile ON public.employees;
CREATE TRIGGER employees_sync_user_profile
  AFTER INSERT OR UPDATE OF full_name, status, deleted_at, user_id ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile_from_employee();

COMMENT ON FUNCTION public.admin_set_employee_pin IS
  '社員登録Edge Function(create-employee)専用。service_roleのみ実行可。管理者が他人のPINを初期設定する。';
COMMENT ON FUNCTION public.legacy_role_for_employee IS
  '新方式(employee_roles)の権限から、旧方式(user_profiles.role)の4値へのベストマッチを計算する橋渡し関数(第20条)。';

-- ============================================================
-- 4. v_employee_accounts — 設定画面「ユーザー管理」が参照する view。
--    ログイン資格(user_id)を持つ社員のみを対象とし、employee_roles
--    (新方式)を正として表示する(第38条: employeesを唯一の正とする)。
--    旧来のuser_profiles直接参照はSettings.jsxから廃止する。
-- ============================================================
CREATE OR REPLACE VIEW public.v_employee_accounts AS
SELECT
  e.id AS employee_id, e.user_id, e.full_name, e.email, e.status,
  COALESCE(array_agg(r.key) FILTER (WHERE r.key IS NOT NULL), '{}') AS role_keys,
  COALESCE(array_agg(r.label) FILTER (WHERE r.label IS NOT NULL), '{}') AS role_labels
FROM public.employees e
LEFT JOIN public.employee_roles er ON er.employee_id = e.id
LEFT JOIN public.roles r ON r.id = er.role_id
WHERE e.deleted_at IS NULL AND e.user_id IS NOT NULL
GROUP BY e.id, e.user_id, e.full_name, e.email, e.status
ORDER BY e.full_name;

GRANT SELECT ON public.v_employee_accounts TO authenticated;

NOTIFY pgrst, 'reload schema';

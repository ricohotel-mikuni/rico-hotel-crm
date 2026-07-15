-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 015: HotelOS共通監査ログ機能
-- Created: 2026-07-15
--
-- 背景: audit_logsテーブル自体は009(2026-07-06)で既に設計済みだった
-- が、当時はservice-role/Edge Function基盤が無く「書き込みはservice-
-- role経由を前提とし、今回は意図的に空のまま」としていた。014で
-- create-employee Edge Functionが稼働したことでその前提が満たされた
-- ため、本migrationで書き込み経路を実装する。
--
-- 設計方針: クライアントが自分の操作ログを直接偽装できないという
-- 既存方針(login_history/audit_logsのRLS)を維持したまま、
-- write_audit_log() を「HotelOS全体で共通の書き込み入口」として
-- 新設する。将来のモジュール(料金・在庫・OTA・競合ホテル・設備・
-- 予約・AI提案等、いずれも本migration時点では未実装)は、実装時に
-- この関数を呼ぶだけで監査ログに乗る — テーブル/権限設計の変更は
-- 不要な想定。
-- ============================================================

-- ============================================================
-- 1. audit_logs — 列追加
-- ============================================================
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS category          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS target_label      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_id        UUID REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS hotel_id          UUID REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS before_state      JSONB,
  ADD COLUMN IF NOT EXISTS after_state       JSONB,
  ADD COLUMN IF NOT EXISTS success           BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS failure_reason    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ip_address        TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_category_idx ON public.audit_logs (category);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_employee_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_employee_idx ON public.audit_logs (target_employee_id);

COMMENT ON TABLE public.audit_logs IS 'HotelOS全社共通監査ログ。書き込みはwrite_audit_log()経由のみ(クライアント直接INSERT不可)。閲覧は管理者のみ(audit_logs_select_admin)';

-- ============================================================
-- 2. write_audit_log — HotelOS全体で共通の書き込み入口。
--    実行者(actor)はauth.uid()から解決するため呼び出し元が
--    偽装できない。IPアドレスはPostgRESTのリクエストヘッダー
--    (x-forwarded-for)から自動取得(取得できない場合はNULL)。
--    company_id/hotel_idを明示しない呼び出しでは、実行者の主配属先
--    (employee_assignments)から自動補完する。
-- ============================================================
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action             TEXT,
  p_category           TEXT DEFAULT '',
  p_description        TEXT DEFAULT '',
  p_target_table       TEXT DEFAULT NULL,
  p_target_id          UUID DEFAULT NULL,
  p_target_label       TEXT DEFAULT '',
  p_target_employee_id UUID DEFAULT NULL,
  p_company_id         UUID DEFAULT NULL,
  p_hotel_id           UUID DEFAULT NULL,
  p_before             JSONB DEFAULT NULL,
  p_after              JSONB DEFAULT NULL,
  p_success            BOOLEAN DEFAULT TRUE,
  p_failure_reason     TEXT DEFAULT '',
  p_ip_address         TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_actor_id      UUID;
  v_ip            TEXT;
  v_company_id    UUID := p_company_id;
  v_hotel_id      UUID := p_hotel_id;
  v_actor_company UUID;
  v_actor_hotel   UUID;
  v_id            UUID;
BEGIN
  SELECT id INTO v_actor_id FROM public.employees WHERE user_id = auth.uid();

  v_ip := p_ip_address;
  IF v_ip IS NULL THEN
    BEGIN
      v_ip := NULLIF(current_setting('request.headers', true), '')::json->>'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  IF (v_company_id IS NULL OR v_hotel_id IS NULL) AND v_actor_id IS NOT NULL THEN
    SELECT e.company_id, ea.location_id INTO v_actor_company, v_actor_hotel
      FROM public.employees e
      LEFT JOIN public.employee_assignments ea
        ON ea.employee_id = e.id AND ea.is_primary = TRUE AND ea.end_date IS NULL
      WHERE e.id = v_actor_id
      LIMIT 1;
    v_company_id := COALESCE(v_company_id, v_actor_company);
    v_hotel_id := COALESCE(v_hotel_id, v_actor_hotel);
  END IF;

  INSERT INTO public.audit_logs (
    actor_employee_id, action, category, description,
    target_table, target_id, target_label, target_employee_id,
    company_id, hotel_id, before_state, after_state,
    success, failure_reason, ip_address
  ) VALUES (
    v_actor_id, p_action, p_category, p_description,
    p_target_table, p_target_id, p_target_label, p_target_employee_id,
    v_company_id, v_hotel_id, p_before, p_after,
    p_success, p_failure_reason, v_ip
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.write_audit_log(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, UUID, UUID, JSONB, JSONB, BOOLEAN, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, UUID, UUID, JSONB, JSONB, BOOLEAN, TEXT, TEXT
) TO authenticated, service_role;

-- ============================================================
-- 3. record_logout — ログアウト直前にクライアントから呼ぶ
--    (signOut()後はauth.uid()が失われるため、必ず先に呼ぶこと)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_logout()
RETURNS VOID AS $$
DECLARE v_employee_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT id INTO v_employee_id FROM public.employees WHERE user_id = auth.uid();
  PERFORM public.write_audit_log(
    p_action := 'logout', p_category := 'user', p_description := 'ログアウト',
    p_target_employee_id := v_employee_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.record_logout() TO authenticated;

-- ============================================================
-- 4. record_password_login — 監査ログへの記録を追加(既存の
--    login_history書き込みはそのまま維持)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_password_login(p_device_id TEXT DEFAULT '')
RETURNS VOID AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT id INTO v_employee_id FROM public.employees WHERE user_id = auth.uid();
  IF v_employee_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
  VALUES (v_employee_id, 'password', p_device_id, TRUE, '');

  PERFORM public.write_audit_log(
    p_action := 'login', p_category := 'user', p_description := 'パスワードでログイン',
    p_target_employee_id := v_employee_id, p_success := TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.record_password_login(TEXT) TO authenticated;

-- ============================================================
-- 5. verify_employee_pin — 各分岐(未信頼端末/未登録/ロック中/成功/
--    失敗)ごとに監査ログを追加。未ログイン状態から呼ばれるため
--    write_audit_log内のactor解決はNULLになる(target_employee_idで
--    本人を特定できるため問題ない)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_employee_pin(p_employee_id UUID, p_device_id TEXT, p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
  v_cred RECORD;
  v_device RECORD;
  v_ok BOOLEAN;
  v_hotel_id UUID;
BEGIN
  SELECT ea.location_id INTO v_hotel_id
    FROM public.employee_assignments ea
    WHERE ea.employee_id = p_employee_id AND ea.is_primary = TRUE AND ea.end_date IS NULL
    LIMIT 1;

  SELECT * INTO v_device FROM public.trusted_devices
    WHERE employee_id = p_employee_id AND device_id = p_device_id AND revoked_at IS NULL;
  IF NOT FOUND THEN
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, FALSE, 'device_not_trusted');
    PERFORM public.write_audit_log(
      p_action := 'login', p_category := 'user', p_description := 'PINログイン失敗(未信頼端末)',
      p_target_employee_id := p_employee_id, p_hotel_id := v_hotel_id,
      p_success := FALSE, p_failure_reason := 'device_not_trusted'
    );
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'device_not_trusted');
  END IF;

  SELECT * INTO v_cred FROM public.employee_pin_credentials WHERE employee_id = p_employee_id;
  IF NOT FOUND THEN
    PERFORM public.write_audit_log(
      p_action := 'login', p_category := 'user', p_description := 'PINログイン失敗(PIN未登録)',
      p_target_employee_id := p_employee_id, p_hotel_id := v_hotel_id,
      p_success := FALSE, p_failure_reason := 'not_enrolled'
    );
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_enrolled');
  END IF;

  IF v_cred.locked_until IS NOT NULL AND v_cred.locked_until <= NOW() THEN
    UPDATE public.employee_pin_credentials SET failed_attempts = 0, locked_until = NULL
      WHERE employee_id = p_employee_id;
    v_cred.failed_attempts := 0;
    v_cred.locked_until := NULL;
  END IF;

  IF v_cred.locked_until IS NOT NULL AND v_cred.locked_until > NOW() THEN
    PERFORM public.write_audit_log(
      p_action := 'login', p_category := 'user', p_description := 'PINログイン失敗(ロック中)',
      p_target_employee_id := p_employee_id, p_hotel_id := v_hotel_id,
      p_success := FALSE, p_failure_reason := 'locked'
    );
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'locked', 'locked_until', v_cred.locked_until);
  END IF;

  v_ok := (v_cred.pin_hash = crypt(p_pin, v_cred.pin_hash));

  IF v_ok THEN
    UPDATE public.employee_pin_credentials SET failed_attempts = 0, locked_until = NULL
      WHERE employee_id = p_employee_id;
    UPDATE public.trusted_devices SET last_used_at = NOW()
      WHERE employee_id = p_employee_id AND device_id = p_device_id;
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, TRUE, '');
    PERFORM public.write_audit_log(
      p_action := 'login', p_category := 'user', p_description := 'PINでログイン',
      p_target_employee_id := p_employee_id, p_hotel_id := v_hotel_id, p_success := TRUE
    );
    RETURN jsonb_build_object('ok', TRUE);
  ELSE
    UPDATE public.employee_pin_credentials
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 seconds' ELSE NULL END
      WHERE employee_id = p_employee_id
      RETURNING failed_attempts, locked_until INTO v_cred;
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, FALSE, 'wrong_pin');
    PERFORM public.write_audit_log(
      p_action := 'login', p_category := 'user', p_description := 'PINログイン失敗(PIN誤り)',
      p_target_employee_id := p_employee_id, p_hotel_id := v_hotel_id,
      p_success := FALSE, p_failure_reason := 'wrong_pin'
    );
    IF v_cred.locked_until IS NOT NULL THEN
      RETURN jsonb_build_object('ok', FALSE, 'reason', 'locked', 'locked_until', v_cred.locked_until);
    END IF;
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'wrong_pin', 'failed_attempts', v_cred.failed_attempts);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_employee_pin(UUID, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- 6. set_employee_pin — PIN変更(値自体は記録せず、変更した事実
--    のみ監査ログに残す)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_employee_pin(p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;
  IF p_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PINは6桁の数字で入力してください';
  END IF;

  SELECT id INTO v_employee_id FROM public.employees WHERE user_id = auth.uid();
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION '社員情報が見つかりません';
  END IF;

  INSERT INTO public.employee_pin_credentials (employee_id, pin_hash, failed_attempts, locked_until)
  VALUES (v_employee_id, crypt(p_pin, gen_salt('bf')), 0, NULL)
  ON CONFLICT (employee_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = NOW();

  PERFORM public.write_audit_log(
    p_action := 'pin_changed', p_category := 'user', p_description := 'PINを変更',
    p_target_employee_id := v_employee_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_employee_pin(TEXT) TO authenticated;

-- ============================================================
-- 7. PostgRESTにスキーマ変更を確実に伝える
-- ============================================================
NOTIFY pgrst, 'reload schema';

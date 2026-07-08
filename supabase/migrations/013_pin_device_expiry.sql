-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 013: 信頼済み端末の30日有効期限(スライディング)
-- Created: 2026-07-09
--
-- 背景: PINログイン不具合の修正の一環。信頼済み端末は無期限では
-- なく、最終利用から30日経過(スライディング — 使うたびに30日延長)
-- または管理者による失効(trusted_devices.revoked_at)でのみ、
-- パスワード再認証を要求する設計とする(ユーザー提示の完成仕様どおり)。
-- ============================================================

ALTER TABLE public.trusted_devices
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- 既存行(本修正より前に登録された端末)にも期限を設定しておく —
-- 未設定のままだと期限チェックが常にスルーされてしまうため。
UPDATE public.trusted_devices SET expires_at = NOW() + INTERVAL '30 days' WHERE expires_at IS NULL;

-- ============================================================
-- register_trusted_device — 登録・再登録のたびに有効期限を
-- 30日先へスライドさせる。
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_trusted_device(p_device_id TEXT, p_device_label TEXT DEFAULT '')
RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;
  SELECT id INTO v_employee_id FROM public.employees WHERE user_id = auth.uid();
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION '社員情報が見つかりません';
  END IF;

  INSERT INTO public.trusted_devices (employee_id, device_id, device_label, last_used_at, revoked_at, expires_at)
  VALUES (v_employee_id, p_device_id, p_device_label, NOW(), NULL, NOW() + INTERVAL '30 days')
  ON CONFLICT (employee_id, device_id) DO UPDATE
    SET revoked_at = NULL, device_label = EXCLUDED.device_label, last_used_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days'
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.register_trusted_device(TEXT, TEXT) TO authenticated;

-- ============================================================
-- verify_employee_pin — 有効期限切れの端末を明確な理由
-- ('device_expired')で拒否し、成功時は有効期限を30日先へ
-- スライドさせる(使い続けている限り切れない)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_employee_pin(p_employee_id UUID, p_device_id TEXT, p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
  v_cred RECORD;
  v_device RECORD;
  v_ok BOOLEAN;
BEGIN
  SELECT * INTO v_device FROM public.trusted_devices
    WHERE employee_id = p_employee_id AND device_id = p_device_id AND revoked_at IS NULL;
  IF NOT FOUND THEN
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, FALSE, 'device_not_trusted');
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'device_not_trusted');
  END IF;

  IF v_device.expires_at IS NOT NULL AND v_device.expires_at <= NOW() THEN
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, FALSE, 'device_expired');
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'device_expired');
  END IF;

  SELECT * INTO v_cred FROM public.employee_pin_credentials WHERE employee_id = p_employee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_enrolled');
  END IF;

  -- ロック期間が過ぎていれば自動解除してから判定する
  IF v_cred.locked_until IS NOT NULL AND v_cred.locked_until <= NOW() THEN
    UPDATE public.employee_pin_credentials SET failed_attempts = 0, locked_until = NULL
      WHERE employee_id = p_employee_id;
    v_cred.failed_attempts := 0;
    v_cred.locked_until := NULL;
  END IF;

  IF v_cred.locked_until IS NOT NULL AND v_cred.locked_until > NOW() THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'locked', 'locked_until', v_cred.locked_until);
  END IF;

  v_ok := (v_cred.pin_hash = crypt(p_pin, v_cred.pin_hash));

  IF v_ok THEN
    UPDATE public.employee_pin_credentials SET failed_attempts = 0, locked_until = NULL
      WHERE employee_id = p_employee_id;
    UPDATE public.trusted_devices SET last_used_at = NOW(), expires_at = NOW() + INTERVAL '30 days'
      WHERE employee_id = p_employee_id AND device_id = p_device_id;
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, TRUE, '');
    RETURN jsonb_build_object('ok', TRUE);
  ELSE
    UPDATE public.employee_pin_credentials
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 seconds' ELSE NULL END
      WHERE employee_id = p_employee_id
      RETURNING failed_attempts, locked_until INTO v_cred;
    INSERT INTO public.login_history (employee_id, method, device_id, success, reason)
      VALUES (p_employee_id, 'pin', p_device_id, FALSE, 'wrong_pin');
    IF v_cred.locked_until IS NOT NULL THEN
      RETURN jsonb_build_object('ok', FALSE, 'reason', 'locked', 'locked_until', v_cred.locked_until);
    END IF;
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'wrong_pin', 'failed_attempts', v_cred.failed_attempts);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_employee_pin(UUID, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

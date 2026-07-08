-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 012: 6桁PIN認証・信頼済み端末・ログイン履歴・部署マスタ整備
-- Created: 2026-07-08
--
-- 背景(提案書「6桁PIN認証・部署別複数権限ログイン」承認分):
--   ⑪ 信頼済み端末でのPINログイン
--   ⑫ PINを起点にユーザー・部署・権限を呼び出す
--   ⑬ 複数部署・複数役割の兼務(employee_roles/employee_assignments は
--      既に多対多・複数行対応済みのため、本ファイルではスキーマ変更
--      不要。department マスタと role_permissions の拡充のみ行う)
--
-- 設計方針: このプロジェクトにはEdge Function/service-role基盤が無い
-- (009のaudit_logsコメント参照)。そのためPIN照合はクライアントに
-- ハッシュを一切渡さない SECURITY DEFINER 関数(RPC)で行う —
-- 006のcan_approve()と同じ確立済みパターンを踏襲する。PIN自体は
-- Supabase Authを置き換えるものではなく、信頼済み端末に既に残っている
-- 正規セッション(refresh token)を再提示するための追加ゲートとして
-- 機能する(パスワードそのものより弱い認証のため、範囲を信頼済み端末に
-- 限定する設計— 提案書「メリット・デメリット」参照)。
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. 部署マスタ整備 — 現状「営業部」1件のみだったところに、
--    提案書⑫で挙げた部署例を追加する(冪等・重複防止のため name+location_id
--    の組で存在チェック)
-- ============================================================
INSERT INTO public.departments (company_id, location_id, name, sort_order)
SELECT '00000000-0000-0000-0000-000000000001', l.id, d.name, d.sort_order
FROM public.locations l
CROSS JOIN (VALUES
  ('社長', 0), ('支配人', 1), ('フロント', 3), ('清掃', 4),
  ('朝食', 5), ('夕食', 6), ('設備', 7), ('経理', 8), ('総務', 9)
) AS d(name, sort_order)
WHERE l.slug = 'rico-mikuni'
  AND NOT EXISTS (
    SELECT 1 FROM public.departments ex WHERE ex.location_id = l.id AND ex.name = d.name
  );

-- ============================================================
-- 2. ロールマスタ整備 — 部署例に対応するロールで、まだ無いものだけ追加
--    (front_desk/cleaning/accounting/hotel_manager/ceo は011で既に存在)
-- ============================================================
INSERT INTO public.roles (key, label, description, sort_order) VALUES
  ('breakfast',       '朝食',   '朝食提供・在庫・発注の閲覧・編集', 16),
  ('dinner',          '夕食',   '夕食提供・在庫・発注の閲覧・編集', 17),
  ('maintenance',     '設備',   '設備の修繕・点検の閲覧・編集',     18),
  ('general_affairs', '総務',   '全社書類・総務業務の閲覧・編集',   19)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit)
SELECT r.id, 'breakfast', TRUE, TRUE FROM public.roles r WHERE r.key = 'breakfast'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit)
SELECT r.id, 'dinner', TRUE, TRUE FROM public.roles r WHERE r.key = 'dinner'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit)
SELECT r.id, 'maintenance', TRUE, TRUE FROM public.roles r WHERE r.key = 'maintenance'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_download, can_csv, can_print)
SELECT r.id, 'documents', TRUE, TRUE, TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'general_affairs'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

-- 011で 'cleaning' ロールに付与された module は 'housekeeping' だったが、
-- 実際のモジュールレジストリ(src/modules/registry.js)のidは 'cleaning'。
-- 旧行はそのまま残し(削除しない)、正しいmoduleでも閲覧・編集できるよう
-- 補完しておく — Phase 2のホーム画面タイル絞り込みが実idを見るため。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit)
SELECT r.id, 'cleaning', TRUE, TRUE FROM public.roles r WHERE r.key = 'cleaning'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

-- ============================================================
-- 3. employee_pin_credentials — PINは平文はもちろんハッシュも
--    クライアントへは一切返さない。読み書きともRPC経由のみを想定し、
--    テーブル自体への直接SELECT/INSERT/UPDATEポリシーは与えない。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_pin_credentials (
  employee_id     UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  pin_hash        TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER employee_pin_credentials_updated_at
  BEFORE UPDATE ON public.employee_pin_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.employee_pin_credentials ENABLE ROW LEVEL SECURITY;
-- 意図的にSELECT/INSERT/UPDATE/DELETEポリシーを一切作らない —
-- 全てのアクセスは下記のSECURITY DEFINER関数経由に限定する。

-- ============================================================
-- 4. trusted_devices — 端末ごとに「この従業員はこの端末を信頼した」
--    を記録する。device_id はクライアントが生成しlocalStorageに保持する
--    UUID(サーバーには一切の秘密情報を送らない、識別子のみ)。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id   UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  device_id     TEXT NOT NULL,
  device_label  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  UNIQUE (employee_id, device_id)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trusted_devices_select_own_or_admin" ON public.trusted_devices;
CREATE POLICY "trusted_devices_select_own_or_admin" ON public.trusted_devices
  FOR SELECT USING (
    public.is_admin_or_manager()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trusted_devices_write_admin" ON public.trusted_devices;
CREATE POLICY "trusted_devices_write_admin" ON public.trusted_devices
  FOR ALL USING (public.is_admin_or_manager());
-- 通常の登録/失効はクライアントから直接テーブルを書かず、下記の
-- register_trusted_device()/revoke_trusted_device() 関数を使う
-- (関数はSECURITY DEFINERなのでこのポリシーの制約を受けない)。
-- 管理者は端末一覧の閲覧・強制失効のため直接操作もできるようにしておく。

-- ============================================================
-- 5. login_history — 管理者が確認できるログイン履歴。クライアントから
--    の直接INSERTポリシーは与えない(audit_logsと同じ考え方) — 書き込み
--    は必ず下記のSECURITY DEFINER関数を経由させ、自己申告での偽装を防ぐ。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_history (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  method      TEXT NOT NULL CHECK (method IN ('password', 'pin')),
  device_id   TEXT DEFAULT '',
  success     BOOLEAN NOT NULL,
  reason      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_history_employee_created_idx
  ON public.login_history (employee_id, created_at DESC);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_history_select_own_or_admin" ON public.login_history;
CREATE POLICY "login_history_select_own_or_admin" ON public.login_history
  FOR SELECT USING (
    public.is_admin_or_manager()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- ============================================================
-- 6. set_employee_pin — ログイン済み本人が自分のPINを設定/変更する。
--    平文PINはこの関数呼び出しの引数としてのみ一瞬使われ、
--    pgcryptoでハッシュ化した状態でしか保存しない。
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

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_employee_pin(TEXT) TO authenticated;

-- ============================================================
-- 7. register_trusted_device / revoke_trusted_device — ログイン済み
--    本人が「この端末を信頼する」を選んだ/取り消した時に呼ぶ。
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

  INSERT INTO public.trusted_devices (employee_id, device_id, device_label, last_used_at, revoked_at)
  VALUES (v_employee_id, p_device_id, p_device_label, NOW(), NULL)
  ON CONFLICT (employee_id, device_id) DO UPDATE
    SET revoked_at = NULL, device_label = EXCLUDED.device_label, last_used_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.register_trusted_device(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_trusted_device(p_device_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;
  SELECT id INTO v_employee_id FROM public.employees WHERE user_id = auth.uid();

  UPDATE public.trusted_devices
    SET revoked_at = NOW()
    WHERE employee_id = v_employee_id AND device_id = p_device_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.revoke_trusted_device(TEXT) TO authenticated;

-- ============================================================
-- 8. record_password_login — パスワードでログインした直後に呼び、
--    ログイン履歴へ記録する(PINだけでなくパスワードログインも
--    管理者が一覧で追えるようにするため)。
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.record_password_login(TEXT) TO authenticated;

-- ============================================================
-- 9. verify_employee_pin — 信頼済み端末でのPIN照合の唯一の入口。
--    未ログイン状態(anon)から呼べる必要がある(2回目以降のPINログインは
--    セッション確立前に行うため)。employee_id はクライアントが
--    信頼済み端末登録時にローカルへ保存済みの値のみを渡す前提
--    (ユーザー選択画面に出す本人のIDであり、秘密情報ではない)。
--    ロックは employee_id 単位(device_idは詐称され得るため信用しない)。
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
    UPDATE public.trusted_devices SET last_used_at = NOW()
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

-- ============================================================
-- 10. PostgRESTにスキーマ変更を確実に伝える
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 009: 社員書類・ログイン履歴・承認履歴/コメント・
--                 監査ログ・アクティビティログ
-- Created: 2026-07-06
--
-- 背景: 社員管理(v_employee_directory)に続き電子承認(approval_requests)
-- でも「Could not find the table」が発生。両方とも005/006で既に定義
-- 済みのため、これはコード側/スキーマ設計の不足ではなく「005以降が
-- 対象のSupabaseプロジェクトへ未適用」であるとほぼ断定できる
-- (007/008参照)。そのためこのmigrationは"欠けていたテーブルの穴埋め"
-- ではなく、v1.2.3で新たに要望された近い将来使う空テーブル群を
-- 追加するもの。company_master/hotel_master/property_master/
-- employee_profiles/employee_permissions は要望されたが、実体は
-- companies/hotels/locations/employees/role_permissions+employee_roles
-- と同じ役割のため重複作成しない(最終報告でマッピングを説明)。
--
-- 「ログ系」テーブルが本migrationで4種類(+既存client_history)になる
-- ため、混同/重複作成を防ぐためここで役割を整理する:
--   - client_history      (001, 既存) … 営業先(clients)の対応履歴
--   - approval_history     (本ファイル) … 1つの承認申請の状態遷移ログ
--   - audit_logs           (本ファイル) … 全社的なコンプライアンス/
--                            セキュリティ監査証跡。管理者のみ閲覧可、
--                            クライアントからの直接書き込みは不可
--                            (偽装防止。書き込みはservice-role/トリガー
--                            経由を前提とし、今回は意図的に空のまま)
--   - activity_logs        (本ファイル) … ダッシュボード等に出す
--                            軽量な「最近の操作」フィード。閲覧・
--                            書き込みとも authenticated に開放
--
-- approval_templates/approval_routes は今回あえて作成しない: 現状の
-- can_approve()(006)はrole_permissions.can_approveのみで承認者を
-- 判定しており、ステップ単位のapprover_role_id/approver_employee_id
-- を一切参照しないため、今これらを作っても承認ロジックには反映されず
-- 「空の骨組み」以上の価値が無い。2つ目の承認利用モジュール(購入申請
-- 等)が実装される際に、承認ロジックの拡張と合わせて設計する。
-- ============================================================

-- ============================================================
-- 1. employee_documents — 社員に紐づく汎用書類(既存の
--    employee_qualifications等と違い、差し替え・削除が起きる
--    可変リストのため partners/vendors と同じソフトデリート方式)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  category    TEXT DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  file_url    TEXT DEFAULT '',
  uploaded_by UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_documents_select_authenticated" ON public.employee_documents
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "employee_documents_write_admin" ON public.employee_documents
  FOR ALL USING (public.is_admin_or_manager());

COMMENT ON TABLE public.employee_documents IS '社員に紐づく汎用書類(社員スコープのみ)。将来の会社全体の書類管理モジュール(hq-documents)とは別物 — テーブルを共用/統合しないこと';

-- ============================================================
-- 2. employee_login_history — ログイン履歴。IPアドレス等の機微情報
--    を含むため SELECT は本人または管理者のみ。INSERT/UPDATE/DELETEは
--    authenticated に一切許可しない(クライアントに自分のログイン
--    履歴を偽装させないため)。実際の記録は auth.users.last_sign_in_at
--    の更新を捉える SECURITY DEFINER トリガーで自動的に行う
--    (handle_new_user() と同じ方式)。ip_address/user_agent は
--    現時点のトリガーからは取得できないため NULL のまま — 将来
--    Edge Function 等でリクエストヘッダーから補完する拡張点として
--    残す。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_login_history (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id  UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  logged_in_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address   TEXT,
  user_agent   TEXT
);

ALTER TABLE public.employee_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_login_history_select" ON public.employee_login_history
  FOR SELECT USING (
    public.is_admin_or_manager()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.employee_login_history IS 'ログイン履歴(自動記録・読み取り専用)。ip_address/user_agentは将来のEdge Function拡張まで常にNULL';

CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    INSERT INTO public.employee_login_history (employee_id, logged_in_at)
    SELECT id, NEW.last_sign_in_at FROM public.employees WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();

-- ============================================================
-- 3. approval_history — 1つの承認申請(approval_requests)の状態
--    遷移を追記していく監査証跡。approval_steps(現在のステップの
--    可変な状態)とは別物。client_historyと同じく履歴はUPDATE/DELETE
--    不可、親削除時も証跡を握りつぶさないようRESTRICT(CASCADEにしない)。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_history (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id        UUID REFERENCES public.approval_requests(id) NOT NULL,
  event             TEXT NOT NULL DEFAULT '',
  actor_employee_id UUID REFERENCES public.employees(id),
  note              TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_history_select_authenticated" ON public.approval_history
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "approval_history_insert_authenticated" ON public.approval_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.approval_history IS '承認申請1件の状態遷移ログ(追記専用)。現在のステップ状態はapproval_stepsを参照';

-- ============================================================
-- 4. approval_comments — 承認申請へのコメント(追記専用)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_comments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id  UUID REFERENCES public.approval_requests(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) NOT NULL,
  comment     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_comments_select_authenticated" ON public.approval_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "approval_comments_insert_authenticated" ON public.approval_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. audit_logs — 全社的なコンプライアンス/セキュリティ監査証跡。
--    target_table/target_idはFKを持たないポリモーフィックな汎用ログ
--    (どの既存/将来テーブルへの変更も1つのログテーブルで扱える)。
--    SELECTは管理者限定、INSERT/UPDATE/DELETEポリシーは意図的に
--    一切与えない — クライアントから自分の操作ログを偽装/改ざん
--    できないようにするため。実際の書き込みはservice-role経由の
--    処理(将来実装)を前提とする。このプロジェクトには現時点で
--    service-role/Edge Function基盤が無いため、今回は空のまま。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_employee_id UUID REFERENCES public.employees(id),
  action            TEXT NOT NULL DEFAULT '',
  target_table      TEXT DEFAULT '',
  target_id         UUID,
  changes           JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (public.is_admin_or_manager());

COMMENT ON TABLE public.audit_logs IS '全社監査ログ(コンプライアンス用)。management閲覧のみ、クライアントからの直接書き込みは不可 — 書き込みはservice-role/トリガー実装まで意図的に空のまま';

-- ============================================================
-- 6. activity_logs — ダッシュボード等に出す軽量な「最近の操作」
--    フィード。audit_logsと異なり閲覧・書き込みともauthenticatedに
--    開放(厳格な監査証跡ではなくUI表示用のため)。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  module      TEXT DEFAULT '',
  action      TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_select_authenticated" ON public.activity_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "activity_logs_insert_authenticated" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PostgRESTにスキーマ変更を確実に伝える(007/008と同じ理由)
NOTIFY pgrst, 'reload schema';

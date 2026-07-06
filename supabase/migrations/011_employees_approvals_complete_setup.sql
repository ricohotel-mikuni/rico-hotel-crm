-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 011: 社員管理・電子承認 完結セットアップ(単独実行可能)
-- Created: 2026-07-06
--
-- 【これだけ実行してください】これまで005〜010と複数のファイルに
-- 分かれていたため、どの順番で何を実行すべきか分かりにくくなって
-- いました。このファイル1つだけで、社員管理・電子承認に必要な
-- テーブル・View・関数・RLS・初期データを全て揃えます。
--
-- 安全性: 005・006を一度も実行していない場合はこのファイルだけで
-- 完結します。005・006が既に(全部/一部)実行済みの場合も、
-- CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
-- ON CONFLICT DO NOTHING / DROP POLICY IF EXISTS を徹底しているため、
-- 何度実行しても・どんな状態から実行してもエラーにならず安全です。
-- 005・006本体はこのファイルで置き換えるものではなく、今後の履歴・
-- 参照用にそのまま残します(hotels/rentals/partners/vendors/banks/
-- assets など、今回のエラーに無関係なテーブルは005側のみが対象なので
-- このファイルには含めていません)。
--
-- 【PGRST205について】ブラウザNetworkログで
--   code: PGRST205, message: Could not find the table 'public.employees'
--   hint: Perhaps you meant the table 'public.user_profiles'
-- が確認されています。この hint は「employeesをuser_profilesに統合すべき」
-- という設計上の提案ではありません。PostgRESTは要求されたテーブルが
-- 見つからない時、スキーマキャッシュ内で名前が近い既存テーブルを
-- 機械的に提案するだけです(見つからない其の他のテーブルでも同様の
-- 挙動をします)。employeesは大栄商事の社員マスターとして
-- v1.2で意図的にuser_profiles(ログイン認証用)とは別に設計されており、
-- 権限エンジン(role_permissions/employee_roles)・電子承認
-- (approval_requests.requested_by)・通知の個人宛て機能など多数が
-- employees.idを参照しています。user_profilesへ統合するとこれら
-- 全てを設計し直す大きな後退になるため、統合は行いません。
-- ============================================================

-- ============================================================
-- 0. 前提条件チェック — 001/002が未適用ならここで明確に停止する
-- (通常は営業管理・ホテル管理が動いていれば存在します)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_or_manager') THEN
    RAISE EXCEPTION '前提条件不足: function is_admin_or_manager() がありません。先に supabase/migrations/002_rls_policies.sql を実行してください。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    RAISE EXCEPTION '前提条件不足: function update_updated_at() がありません。先に supabase/migrations/001_initial_schema.sql を実行してください。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    RAISE EXCEPTION '前提条件不足: public.user_profiles がありません。先に supabase/migrations/001_initial_schema.sql を実行してください。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    RAISE EXCEPTION '前提条件不足: public.notifications がありません。先に supabase/migrations/004_notifications.sql を実行してください。';
  END IF;
END $$;

-- ============================================================
-- 1. COMPANIES / BUSINESS_UNITS / LOCATIONS / DEPARTMENTS / ROLES
-- (005_company_foundation.sql と同一定義。employee_assignments・
-- departmentsの外部キー先として必要)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  name_en    TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.companies (id, name, name_en)
VALUES ('00000000-0000-0000-0000-000000000001', '大栄商事株式会社', 'DAIEI SHOJI CO., LTD.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.business_units (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  key        TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, key)
);

INSERT INTO public.business_units (company_id, key, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'hotel',  'ホテル事業', 1),
  ('00000000-0000-0000-0000-000000000001', 'rental', '賃貸事業',   2)
ON CONFLICT (company_id, key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.locations (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id       UUID REFERENCES public.companies(id) NOT NULL,
  business_unit_id UUID REFERENCES public.business_units(id),
  type             TEXT NOT NULL CHECK (type IN ('hotel', 'rental', 'office')),
  slug             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  address          TEXT DEFAULT '',
  phone            TEXT DEFAULT '',
  status           TEXT DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO public.locations (id, company_id, business_unit_id, type, slug, name, address)
SELECT '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
       bu.id, 'hotel', 'rico-mikuni', 'リコホテル三国', '大阪市淀川区三国'
FROM public.business_units bu WHERE bu.key = 'hotel'
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id  UUID REFERENCES public.companies(id) NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.departments (id, company_id, location_id, name, sort_order)
SELECT '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', l.id, '営業部', 1
FROM public.locations l WHERE l.slug = 'rico-mikuni'
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0
);

INSERT INTO public.roles (key, label, description, sort_order) VALUES
  ('admin',   '管理者',       'すべての操作が可能', 1),
  ('manager', 'マネージャー', '承認・削除を含む操作が可能', 2),
  ('sales',   '営業担当',     '登録・編集が可能', 3),
  ('viewer',  '閲覧のみ',     '閲覧のみ可能', 4),
  ('system_admin', 'システム管理者', '全モジュール・全操作が可能', 10),
  ('ceo',          '代表取締役',     '全モジュールの閲覧・承認が可能', 11),
  ('hotel_manager','ホテル責任者',   'ホテル管理・スタッフ管理・売上・承認', 12),
  ('front_desk',   'フロント',       'フロント業務(予約・チェックイン/アウト)', 13),
  ('cleaning',     '清掃',           '清掃状況の閲覧のみ', 14),
  ('accounting',   '経理',           '会計・経費・請求・銀行資料', 15)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. EMPLOYEES(社員マスター)+ 006の追加列を最初から含めて作成
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id  UUID REFERENCES public.companies(id) NOT NULL,
  user_id     UUID REFERENCES auth.users(id) UNIQUE,
  employee_no TEXT,
  full_name   TEXT NOT NULL,
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  hire_date   DATE,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- 006由来の拡張列(既存テーブルにも安全に追加される)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kana                     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_url                TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS address                  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_name    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_phone   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS retirement_date           DATE,
  ADD COLUMN IF NOT EXISTS employment_type           TEXT DEFAULT '正社員',
  ADD COLUMN IF NOT EXISTS social_insurance          JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes                     TEXT DEFAULT '';

CREATE OR REPLACE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS public.employee_assignments (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id   UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  location_id   UUID REFERENCES public.locations(id) NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  position      TEXT DEFAULT '',
  is_primary    BOOLEAN DEFAULT TRUE,
  start_date    DATE DEFAULT CURRENT_DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_assignments_one_primary_idx
  ON public.employee_assignments (employee_id)
  WHERE is_primary = TRUE AND end_date IS NULL;

-- Backfill: 既存のuser_profiles → employees + 主配属(何度実行しても
-- 重複しない — ON CONFLICT / NOT EXISTS ガード済み)
INSERT INTO public.employees (company_id, user_id, employee_no, full_name, email, hire_date, status)
SELECT
  '00000000-0000-0000-0000-000000000001',
  up.id,
  'EMP-' || substr(up.id::text, 1, 8),
  up.full_name,
  up.email,
  up.created_at::date,
  CASE WHEN up.is_active THEN 'active' ELSE 'inactive' END
FROM public.user_profiles up
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.employee_assignments (employee_id, location_id, department_id, position, is_primary)
SELECT e.id, l.id, d.id, '—', TRUE
FROM public.employees e
JOIN public.locations l ON l.slug = 'rico-mikuni'
LEFT JOIN public.departments d ON d.location_id = l.id AND d.name = '営業部'
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_assignments a
  WHERE a.employee_id = e.id AND a.is_primary = TRUE AND a.end_date IS NULL
);

-- ============================================================
-- 3. 権限エンジン: role_permissions / employee_roles / can_approve()
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id      UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  module       TEXT NOT NULL,
  company_id   UUID REFERENCES public.companies(id),
  can_view     BOOLEAN DEFAULT FALSE,
  can_edit     BOOLEAN DEFAULT FALSE,
  can_delete   BOOLEAN DEFAULT FALSE,
  can_approve  BOOLEAN DEFAULT FALSE,
  can_download BOOLEAN DEFAULT FALSE,
  can_csv      BOOLEAN DEFAULT FALSE,
  can_print    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role_id, module, company_id)
);

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete, can_approve, can_download, can_csv, can_print)
SELECT r.id, m.module, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE
FROM public.roles r, (VALUES ('hotels'), ('staff'), ('sales')) AS m(module)
WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit)
SELECT r.id, 'front', TRUE, TRUE FROM public.roles r WHERE r.key = 'front_desk'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit)
SELECT r.id, 'sales', TRUE, TRUE FROM public.roles r WHERE r.key = 'sales'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view)
SELECT r.id, 'housekeeping', TRUE FROM public.roles r WHERE r.key = 'cleaning'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_approve, can_download, can_csv, can_print)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM public.roles r, (VALUES ('banking'), ('expenses'), ('purchase')) AS m(module)
WHERE r.key = 'accounting'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.employee_roles (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  role_id     UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, role_id)
);

-- 既存の user_profiles.role が admin/manager の人は system_admin も付与
INSERT INTO public.employee_roles (employee_id, role_id)
SELECT e.id, r.id
FROM public.employees e
JOIN public.user_profiles up ON up.id = e.user_id
JOIN public.roles r ON r.key = 'system_admin'
WHERE up.role IN ('admin', 'manager')
ON CONFLICT (employee_id, role_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_approve(p_module TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.employees e ON e.id = er.employee_id
    JOIN public.roles ro ON ro.id = er.role_id
    LEFT JOIN public.role_permissions rp ON rp.role_id = ro.id AND rp.module = p_module
    WHERE e.user_id = auth.uid()
      AND (
        ro.key = 'system_admin'
        OR ro.key = 'ceo'
        OR COALESCE(rp.can_approve, FALSE)
      )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. 電子承認: approval_requests / approval_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id    UUID REFERENCES public.companies(id) NOT NULL,
  module        TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  requested_by  UUID REFERENCES public.employees(id) NOT NULL,
  amount        NUMERIC,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  current_step  INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS public.approval_steps (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id           UUID REFERENCES public.approval_requests(id) ON DELETE CASCADE NOT NULL,
  step_order           INTEGER NOT NULL,
  approver_role_id     UUID REFERENCES public.roles(id),
  approver_employee_id UUID REFERENCES public.employees(id),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  acted_at             TIMESTAMPTZ,
  comment              TEXT DEFAULT '',
  UNIQUE (request_id, step_order)
);

-- ============================================================
-- 5. notifications への個人宛て列 + notification_reads
-- (notifications自体は004で作成済みの前提。ホテル管理・営業管理が
-- 動作していれば既に存在するはず)
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS recipient_role_id      UUID REFERENCES public.roles(id);

CREATE INDEX IF NOT EXISTS notifications_recipient_employee_idx ON public.notifications(recipient_employee_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_role_idx ON public.notifications(recipient_role_id);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  employee_id     UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notification_id, employee_id)
);

-- ============================================================
-- 6. VIEW — v_employee_directory(006の拡張版で確定)
-- ============================================================
CREATE OR REPLACE VIEW public.v_employee_directory AS
SELECT
  e.id, e.employee_no, e.full_name, e.kana, e.photo_url, e.email, e.phone,
  e.address, e.emergency_contact_name, e.emergency_contact_phone,
  e.hire_date, e.retirement_date, e.employment_type, e.social_insurance,
  e.notes, e.status,
  a.position, a.location_id, a.department_id,
  l.name AS location_name, l.type AS location_type,
  d.name AS department_name
FROM public.employees e
LEFT JOIN public.employee_assignments a ON a.employee_id = e.id AND a.is_primary = TRUE AND a.end_date IS NULL
LEFT JOIN public.locations l ON l.id = a.location_id
LEFT JOIN public.departments d ON d.id = a.department_id
WHERE e.deleted_at IS NULL
ORDER BY e.full_name;

GRANT SELECT ON public.v_employee_directory TO authenticated;

-- ============================================================
-- 7. Storage — 社員写真アップロード用バケット
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-files', 'employee-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "employee_files_select_authenticated" ON storage.objects;
CREATE POLICY "employee_files_select_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'employee-files' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "employee_files_insert_admin" ON storage.objects;
CREATE POLICY "employee_files_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'employee-files' AND public.is_admin_or_manager());

DROP POLICY IF EXISTS "employee_files_update_admin" ON storage.objects;
CREATE POLICY "employee_files_update_admin"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'employee-files' AND public.is_admin_or_manager());

DROP POLICY IF EXISTS "employee_files_delete_admin" ON storage.objects;
CREATE POLICY "employee_files_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'employee-files' AND public.is_admin_or_manager());

-- ============================================================
-- 8. RLS — 全テーブルに有効化 + ポリシー(DROP IF EXISTS→CREATEで
-- 005/006を先に実行済みでも/未実行でも安全に何度でも再実行可能)
-- ============================================================
ALTER TABLE public.companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select_authenticated" ON public.companies;
CREATE POLICY "companies_select_authenticated" ON public.companies FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "companies_write_admin" ON public.companies;
CREATE POLICY "companies_write_admin" ON public.companies FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "business_units_select_authenticated" ON public.business_units;
CREATE POLICY "business_units_select_authenticated" ON public.business_units FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "business_units_write_admin" ON public.business_units;
CREATE POLICY "business_units_write_admin" ON public.business_units FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "locations_select_authenticated" ON public.locations;
CREATE POLICY "locations_select_authenticated" ON public.locations FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "locations_write_admin" ON public.locations;
CREATE POLICY "locations_write_admin" ON public.locations FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
CREATE POLICY "departments_select_authenticated" ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "departments_write_admin" ON public.departments;
CREATE POLICY "departments_write_admin" ON public.departments FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "roles_select_authenticated" ON public.roles;
CREATE POLICY "roles_select_authenticated" ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "roles_write_admin" ON public.roles;
CREATE POLICY "roles_write_admin" ON public.roles FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "employees_select_authenticated" ON public.employees;
CREATE POLICY "employees_select_authenticated" ON public.employees FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "employees_write_admin" ON public.employees;
CREATE POLICY "employees_write_admin" ON public.employees FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "employee_assignments_select_authenticated" ON public.employee_assignments;
CREATE POLICY "employee_assignments_select_authenticated" ON public.employee_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "employee_assignments_write_admin" ON public.employee_assignments;
CREATE POLICY "employee_assignments_write_admin" ON public.employee_assignments FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "role_permissions_write" ON public.role_permissions;
CREATE POLICY "role_permissions_write" ON public.role_permissions FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "employee_roles_select" ON public.employee_roles;
CREATE POLICY "employee_roles_select" ON public.employee_roles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "employee_roles_write" ON public.employee_roles;
CREATE POLICY "employee_roles_write" ON public.employee_roles FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "approval_requests_select" ON public.approval_requests;
CREATE POLICY "approval_requests_select" ON public.approval_requests FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "approval_requests_insert" ON public.approval_requests;
CREATE POLICY "approval_requests_insert" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "approval_requests_update" ON public.approval_requests;
CREATE POLICY "approval_requests_update" ON public.approval_requests FOR UPDATE USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "approval_steps_select" ON public.approval_steps;
CREATE POLICY "approval_steps_select" ON public.approval_steps FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "approval_steps_insert" ON public.approval_steps;
CREATE POLICY "approval_steps_insert" ON public.approval_steps FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "approval_steps_update" ON public.approval_steps;
CREATE POLICY "approval_steps_update" ON public.approval_steps FOR UPDATE
  USING (public.can_approve((SELECT module FROM public.approval_requests WHERE id = request_id)));

DROP POLICY IF EXISTS "notification_reads_select" ON public.notification_reads;
CREATE POLICY "notification_reads_select" ON public.notification_reads FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "notification_reads_insert" ON public.notification_reads;
CREATE POLICY "notification_reads_insert" ON public.notification_reads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 9. PostgRESTにスキーマ変更を確実に伝える
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 10. 自己検証 — 実行後にMessagesタブへ結果を表示
-- ============================================================
DO $$
DECLARE
  required_tables TEXT[] := ARRAY[
    'companies', 'locations', 'departments', 'roles', 'employees',
    'employee_assignments', 'role_permissions', 'employee_roles',
    'approval_requests', 'approval_steps'
  ];
  t TEXT;
  missing_count INT := 0;
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      RAISE NOTICE '✗ MISSING table %', t;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_employee_directory') THEN
    RAISE NOTICE '✗ MISSING view v_employee_directory';
    missing_count := missing_count + 1;
  END IF;

  IF missing_count = 0 THEN
    RAISE NOTICE 'OK: 社員管理・電子承認に必要な全テーブル/viewが揃いました。アプリを再読み込みして確認してください。';
  ELSE
    RAISE NOTICE '% 件、まだ不足しています。上のMISSING行を確認してください。', missing_count;
  END IF;
END $$;

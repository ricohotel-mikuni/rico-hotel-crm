-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 006: 社員マスター拡張・権限エンジン・電子承認・通知の個人宛て対応
-- Created: 2026-07-06
--
-- Purely additive — no existing table/column from 001-005 is altered
-- or dropped, and none of the legacy sales-module permission logic
-- (user_profiles.role, can_write(), is_admin_or_manager()) is touched.
-- This migration adds a parallel, general-purpose permission engine +
-- HR fields + approval workflow + personal notifications that future
-- modules build on top of.
-- ============================================================

-- ============================================================
-- 1. EMPLOYEES — additional direct fields
-- "勤務地" is deliberately NOT a new column here — it already comes
-- from employee_assignments -> locations.name (see v_employee_directory
-- in 005). social_insurance is a simple current-status flag set, not a
-- history, so it's a JSONB column rather than a child table (contrast
-- with the five history tables below, which are genuinely repeating).
-- ============================================================
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

-- ============================================================
-- 2. Employee history child tables (foundation only — empty, no UI
-- to populate them yet beyond the profile page's read-only sections).
-- Deliberately NOT created this round: a salary table (user explicitly
-- flagged salary as "future" — sensitive PII deserving its own pass),
-- shift/contract/daily-report linkage tables (those belong to their
-- own not-yet-built modules — the profile page shows placeholder tabs
-- instead of new tables for those).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_qualifications (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id  UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('qualification', 'license')),
  name         TEXT NOT NULL,
  issued_by    TEXT DEFAULT '',
  obtained_date DATE,
  expires_date DATE,
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_health_checks (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id  UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  checked_date DATE NOT NULL,
  result       TEXT DEFAULT '',
  file_url     TEXT DEFAULT '',
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_evaluations (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id        UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  period             TEXT NOT NULL,
  rating             TEXT DEFAULT '',
  evaluator_employee_id UUID REFERENCES public.employees(id),
  comments           TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_trainings (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id    UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  training_name  TEXT NOT NULL,
  completed_date DATE,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_interviews (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id        UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  interview_date     DATE NOT NULL,
  interviewer_employee_id UUID REFERENCES public.employees(id),
  summary            TEXT DEFAULT '',
  next_action        TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ROLES — 6 additional rows alongside the existing 4
-- (admin/manager/sales/viewer from 005, untouched).
-- ============================================================
INSERT INTO public.roles (key, label, description, sort_order) VALUES
  ('system_admin', 'システム管理者', '全モジュール・全操作が可能', 10),
  ('ceo',          '代表取締役',     '全モジュールの閲覧・承認が可能', 11),
  ('hotel_manager','ホテル責任者',   'ホテル管理・スタッフ管理・売上・承認', 12),
  ('front_desk',   'フロント',       'フロント業務(予約・チェックイン/アウト)', 13),
  ('cleaning',     '清掃',           '清掃状況の閲覧のみ', 14),
  ('accounting',   '経理',           '会計・経費・請求・銀行資料', 15)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. ROLE_PERMISSIONS — the fine-grained action matrix.
-- `module` is free text matching a module registry `id`
-- (src/modules/registry.js / src/modules/portal/registry.js) — never
-- an enum, so adding module #101 never needs a migration.
-- `company_id` NULL = company-wide default; a non-null value would
-- override for one specific company once a second company exists,
-- without ever needing a new column.
-- system_admin and ceo are deliberately NOT given rows here — the
-- permission-check logic (src/permissions/PermissionContext.jsx)
-- special-cases those two role keys (system_admin = always allow
-- everything; ceo = always allow view+approve everywhere) so neither
-- needs a new row when a module is added.
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

-- 'housekeeping' has no screen yet — forward-declared so a future
-- 清掃管理 module can use this exact row the day it ships.
INSERT INTO public.role_permissions (role_id, module, can_view)
SELECT r.id, 'housekeeping', TRUE FROM public.roles r WHERE r.key = 'cleaning'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_approve, can_download, can_csv, can_print)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM public.roles r, (VALUES ('banking'), ('expenses'), ('purchase')) AS m(module)
WHERE r.key = 'accounting'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

-- ============================================================
-- 5. EMPLOYEE_ROLES — many-to-many; an employee can hold several.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_roles (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  role_id     UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, role_id)
);

-- Transitional bootstrap: every existing user whose *legacy*
-- user_profiles.role is 'admin' OR 'manager' also gets 'system_admin'
-- in the new engine. Narrower per-legacy-role mapping is left for a
-- future pass — the goal here is just "don't lock out anyone who
-- could already write/approve everything today."
INSERT INTO public.employee_roles (employee_id, role_id)
SELECT e.id, r.id
FROM public.employees e
JOIN public.user_profiles up ON up.id = e.user_id
JOIN public.roles r ON r.key = 'system_admin'
WHERE up.role IN ('admin', 'manager')
ON CONFLICT (employee_id, role_id) DO NOTHING;

-- ============================================================
-- 6. can_approve() — mirrors can_write()/is_admin_or_manager()
-- (002_rls_policies.sql) exactly in shape, but reads the new engine.
-- Used to gate approval_steps updates at the DB level, since an
-- approval is an authorization decision, not just a CRUD screen —
-- the one action in this migration enforced beyond UI-only gating.
-- ============================================================
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
-- 7. Electronic approval — a generic sequential-chain model any
-- future module (purchase/expense/leave/ringi/contract) plugs into
-- by inserting a row tagged with its own `module`.
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

CREATE TRIGGER approval_requests_updated_at
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
-- 8. NOTIFICATIONS — personal/role targeting, additive columns only.
-- Both NULL = today's existing module-broadcast behavior; Hub badges
-- (useUnreadCounts/markModuleRead, both unchanged) keep using the
-- shared `is_read` column exactly as before.
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS recipient_role_id      UUID REFERENCES public.roles(id);

CREATE INDEX IF NOT EXISTS notifications_recipient_employee_idx ON public.notifications(recipient_employee_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_role_idx ON public.notifications(recipient_role_id);

-- Per-person read state for the new Notification Center. Deliberately
-- separate from the shared `is_read` column: a role/broadcast-targeted
-- notification reaches multiple people, so one person marking it read
-- must not make it vanish for everyone else the way reusing `is_read`
-- would.
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  employee_id     UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notification_id, employee_id)
);

-- Demo notifications (dummy data, as requested) — broadcast (both
-- recipient columns NULL) so they're visible to whoever logs in,
-- since no specific real employee/user is known at migration time.
INSERT INTO public.notifications (module, title, body, is_read)
SELECT * FROM (VALUES
  ('sales',      '新しい営業先が登録されました', 'サンプル通知です。実際の登録操作で自動的に生成されます。', FALSE),
  ('approvals',  '新しい承認依頼があります',     'サンプル通知です。電子承認センターをご確認ください。', FALSE),
  ('employees',  '社員情報が更新されました',     'サンプル通知です。', FALSE)
) AS t(module, title, body, is_read)
WHERE NOT EXISTS (SELECT 1 FROM public.notifications WHERE title = t.title);

-- ============================================================
-- 9. Storage — employee photo uploads (mirrors 003_storage_setup.sql
-- exactly).
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-files', 'employee-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "employee_files_select_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'employee-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "employee_files_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'employee-files' AND public.is_admin_or_manager());

CREATE POLICY "employee_files_update_admin"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'employee-files' AND public.is_admin_or_manager());

CREATE POLICY "employee_files_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'employee-files' AND public.is_admin_or_manager());

-- ============================================================
-- 10. v_employee_directory — widen with the new columns + the raw
-- location_id/department_id (005's version only exposed the joined
-- *names*; the edit form needs the ids to prefill its selects).
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
-- RLS — new tables. Default: SELECT = authenticated, INSERT/UPDATE =
-- is_admin_or_manager() (reusing the existing helper — no new coarse
-- permission logic invented). approval_steps is the one exception,
-- gated additionally by can_approve() above.
-- ============================================================
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_health_checks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_evaluations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_trainings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_interviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emp_qualifications_select" ON public.employee_qualifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "emp_qualifications_write"  ON public.employee_qualifications FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "emp_health_checks_select" ON public.employee_health_checks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "emp_health_checks_write"  ON public.employee_health_checks FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "emp_evaluations_select" ON public.employee_evaluations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "emp_evaluations_write"  ON public.employee_evaluations FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "emp_trainings_select" ON public.employee_trainings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "emp_trainings_write"  ON public.employee_trainings FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "emp_interviews_select" ON public.employee_interviews FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "emp_interviews_write"  ON public.employee_interviews FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_permissions_write"  ON public.role_permissions FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "employee_roles_select" ON public.employee_roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "employee_roles_write"  ON public.employee_roles FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "approval_requests_select" ON public.approval_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "approval_requests_insert" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "approval_requests_update" ON public.approval_requests FOR UPDATE USING (public.is_admin_or_manager());

CREATE POLICY "approval_steps_select" ON public.approval_steps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "approval_steps_insert" ON public.approval_steps FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "approval_steps_update" ON public.approval_steps FOR UPDATE
  USING (public.can_approve((SELECT module FROM public.approval_requests WHERE id = request_id)));

CREATE POLICY "notification_reads_select" ON public.notification_reads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "notification_reads_insert" ON public.notification_reads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.role_permissions IS '権限マトリクス(閲覧/編集/削除/承認/DL/CSV/印刷) — module列は自由文字列でモジュール追加時に無修正';
COMMENT ON TABLE public.approval_requests IS '電子承認: 購入申請/経費申請/休暇申請/稟議書/契約などが自分のmoduleタグでここにINSERTして乗る';
COMMENT ON TABLE public.notification_reads IS '通知の個人ごとの既読管理(共有is_read列とは別)';

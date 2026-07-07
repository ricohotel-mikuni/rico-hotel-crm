-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 005: Company Foundation
-- Created: 2026-07-06
--
-- Restructures the system to be company-centric instead of
-- hotel-centric:
--   会社(companies) → 事業(business_units) → 拠点(locations,
--   specialized by hotels/rentals) → モジュール(existing
--   src/modules/<id>, e.g. sales)
--
-- Purely additive — no existing table (001-004) is altered.
-- The sales module (clients/cases/daily_reports/contracts/
-- user_profiles) keeps working exactly as before; this migration
-- only adds the company-wide foundation around it.
-- ============================================================

-- ============================================================
-- 1. COMPANIES — 会社マスター
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

-- ============================================================
-- 2. BUSINESS UNITS — 事業マスター
-- ============================================================
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

-- ============================================================
-- 3. LOCATIONS — 事業所マスター(拠点の共通基底)
-- ホテル・賃貸・本社事務所など、あらゆる拠点の共通データ。
-- 社員の配属先(employee_assignments.location_id)はこのテーブルを
-- 指すため、ホテルでも賃貸でも同じ仕組みで配属できる。
-- ============================================================
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

-- ============================================================
-- 4. HOTELS — ホテルマスター(locationsの1:1拡張, type='hotel')
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hotels (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) UNIQUE NOT NULL,
  room_count  INTEGER,
  brand_name  TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Postgres can't express "location_id must reference a row with
-- type='hotel'" as a plain CHECK/FK across tables — enforce it here.
CREATE OR REPLACE FUNCTION public.check_location_is_hotel()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = NEW.location_id AND type = 'hotel') THEN
    RAISE EXCEPTION 'locations.id % is not type=hotel', NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER hotels_location_type_check
  BEFORE INSERT OR UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.check_location_is_hotel();

INSERT INTO public.hotels (location_id, brand_name)
SELECT id, 'RICO HOTEL MIKUNI' FROM public.locations WHERE slug = 'rico-mikuni'
ON CONFLICT (location_id) DO NOTHING;

-- ============================================================
-- 5. RENTALS — 賃貸マスター(locationsの1:1拡張, type='rental')
-- 今回は器のみ。物件が出来次第 locations(type='rental') と併せて追加する。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rentals (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) UNIQUE NOT NULL,
  unit_count  INTEGER,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.check_location_is_rental()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = NEW.location_id AND type = 'rental') THEN
    RAISE EXCEPTION 'locations.id % is not type=rental', NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER rentals_location_type_check
  BEFORE INSERT OR UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.check_location_is_rental();

-- ============================================================
-- 6. DEPARTMENTS — 部署マスター
-- ============================================================
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

-- ============================================================
-- 7. ROLES — 権限マスター(参考データ)
-- 現行の user_profiles.role の CHECK 制約と can_write()/
-- is_admin_or_manager()(002_rls_policies.sql)はこのテーブルを
-- 参照していない。ロールを追加・変更する場合は、
--   (1) user_profiles の CHECK 制約
--   (2) can_write()/is_admin_or_manager() の役割判定
--   (3) src/lib/constants.js の ROLES
-- の3箇所を合わせて修正すること。このテーブルは現時点では
-- 「参照用マスター」であり、RLSの判定ロジックそのものではない。
-- ============================================================
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
  ('viewer',  '閲覧のみ',     '閲覧のみ可能', 4)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 8. PARTNERS — 取引先マスター(会社共通、今回は器のみ)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  name       TEXT NOT NULL,
  kind       TEXT DEFAULT '',
  contact    TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. VENDORS — 業者マスター(会社共通、今回は器のみ)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT DEFAULT '',
  contact    TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. BANKS — 銀行マスター(会社共通、今回は器のみ)
-- 口座情報を含むため、他マスターより閲覧を絞る(RLSで後述)。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banks (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id     UUID REFERENCES public.companies(id) NOT NULL,
  bank_name      TEXT NOT NULL,
  branch_name    TEXT DEFAULT '',
  account_type   TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  account_holder TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. ASSETS — 備品マスター(会社共通、今回は器のみ)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id    UUID REFERENCES public.companies(id) NOT NULL,
  location_id   UUID REFERENCES public.locations(id),
  name          TEXT NOT NULL,
  category      TEXT DEFAULT '',
  quantity      INTEGER DEFAULT 1,
  purchased_at  DATE,
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. EMPLOYEES — 社員マスター
-- ホテルではなく会社(companies)に所属する。配属先は
-- employee_assignments で管理し、拠点が増減しても
-- employees 行そのものは作り直さない。
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

CREATE OR REPLACE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. EMPLOYEE ASSIGNMENTS — 配属
-- 社員(employees)と拠点(locations)/部署(departments)を結びつける。
-- 配属変更 = ここに行を追加/更新するだけ。employees は不変。
-- ============================================================
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

-- At most one *current* primary assignment per employee, so
-- v_employee_directory's join stays one row per employee.
CREATE UNIQUE INDEX IF NOT EXISTS employee_assignments_one_primary_idx
  ON public.employee_assignments (employee_id)
  WHERE is_primary = TRUE AND end_date IS NULL;

-- ============================================================
-- Backfill: existing user_profiles → employees + primary assignment
-- (one-time; ON CONFLICT/NOT EXISTS guards make this safe to re-run)
-- ============================================================
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
-- 14. VIEW — 社員ディレクトリ(閲覧用、現在の主配属をJOIN)
-- ============================================================
DROP VIEW IF EXISTS public.v_employee_directory;
CREATE OR REPLACE VIEW public.v_employee_directory AS
SELECT
  e.id, e.employee_no, e.full_name, e.email, e.phone, e.status,
  a.position,
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
-- RLS — 会社共通マスター
-- 既定: SELECT = 認証済みなら誰でも / INSERT・UPDATE = admin・manager
-- (既存の can_write()/is_admin_or_manager() をそのまま再利用)
-- ============================================================
ALTER TABLE public.companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assignments  ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "hotels_select_authenticated" ON public.hotels;
CREATE POLICY "hotels_select_authenticated" ON public.hotels FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "hotels_write_admin" ON public.hotels;
CREATE POLICY "hotels_write_admin" ON public.hotels FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "rentals_select_authenticated" ON public.rentals;
CREATE POLICY "rentals_select_authenticated" ON public.rentals FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "rentals_write_admin" ON public.rentals;
CREATE POLICY "rentals_write_admin" ON public.rentals FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
CREATE POLICY "departments_select_authenticated" ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "departments_write_admin" ON public.departments;
CREATE POLICY "departments_write_admin" ON public.departments FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "roles_select_authenticated" ON public.roles;
CREATE POLICY "roles_select_authenticated" ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "roles_write_admin" ON public.roles;
CREATE POLICY "roles_write_admin" ON public.roles FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "partners_select_authenticated" ON public.partners;
CREATE POLICY "partners_select_authenticated" ON public.partners FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "partners_write_admin" ON public.partners;
CREATE POLICY "partners_write_admin" ON public.partners FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "vendors_select_authenticated" ON public.vendors;
CREATE POLICY "vendors_select_authenticated" ON public.vendors FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "vendors_write_admin" ON public.vendors;
CREATE POLICY "vendors_write_admin" ON public.vendors FOR ALL USING (public.is_admin_or_manager());

-- Bank/account data is more sensitive — restrict SELECT to admin/manager too.
DROP POLICY IF EXISTS "banks_select_admin" ON public.banks;
CREATE POLICY "banks_select_admin" ON public.banks FOR SELECT USING (public.is_admin_or_manager() AND deleted_at IS NULL);
DROP POLICY IF EXISTS "banks_write_admin" ON public.banks;
CREATE POLICY "banks_write_admin" ON public.banks FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "assets_select_authenticated" ON public.assets;
CREATE POLICY "assets_select_authenticated" ON public.assets FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "assets_write_admin" ON public.assets;
CREATE POLICY "assets_write_admin" ON public.assets FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "employees_select_authenticated" ON public.employees;
CREATE POLICY "employees_select_authenticated" ON public.employees FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "employees_write_admin" ON public.employees;
CREATE POLICY "employees_write_admin" ON public.employees FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "employee_assignments_select_authenticated" ON public.employee_assignments;
CREATE POLICY "employee_assignments_select_authenticated" ON public.employee_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "employee_assignments_write_admin" ON public.employee_assignments;
CREATE POLICY "employee_assignments_write_admin" ON public.employee_assignments FOR ALL USING (public.is_admin_or_manager());

COMMENT ON TABLE public.locations IS '事業所マスター — ホテル・賃貸・本社等あらゆる拠点の共通基底(hotels/rentalsが1:1で拡張)';
COMMENT ON TABLE public.employees IS '社員マスター — 大栄商事株式会社に所属。配属先は employee_assignments で管理';
COMMENT ON TABLE public.employee_assignments IS '配属 — 社員の配属先変更はここに行を追加/更新するだけで良く、employees行は作り直さない';
COMMENT ON TABLE public.roles IS '権限マスター(参考データ)。RLSの実判定は引き続き can_write()/is_admin_or_manager() が担う';

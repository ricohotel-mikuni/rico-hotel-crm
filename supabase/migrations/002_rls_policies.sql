-- ============================================================
-- RICO HOTEL MIKUNI — Row Level Security Policies
-- Migration 002: RLS + Auth helpers
-- ============================================================

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: can user write?
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'sales')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin or manager?
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER PROFILES policies
-- ============================================================
CREATE POLICY "profiles_select_authenticated"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_insert_self"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self_or_admin"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin_or_manager());

-- ============================================================
-- CLIENTS policies
-- ============================================================
CREATE POLICY "clients_select_authenticated"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "clients_insert_sales"
  ON public.clients FOR INSERT
  WITH CHECK (public.can_write());

CREATE POLICY "clients_update_sales"
  ON public.clients FOR UPDATE
  USING (public.can_write());

-- No hard DELETE allowed — use soft delete (deleted_at)

-- ============================================================
-- CLIENT HISTORY policies
-- ============================================================
CREATE POLICY "history_select_authenticated"
  ON public.client_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "history_insert_sales"
  ON public.client_history FOR INSERT
  WITH CHECK (public.can_write());

-- History is immutable — no UPDATE or DELETE

-- ============================================================
-- CASES policies
-- ============================================================
CREATE POLICY "cases_select_authenticated"
  ON public.cases FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "cases_insert_sales"
  ON public.cases FOR INSERT
  WITH CHECK (public.can_write());

CREATE POLICY "cases_update_sales"
  ON public.cases FOR UPDATE
  USING (public.can_write());

-- ============================================================
-- DAILY REPORTS policies
-- ============================================================
CREATE POLICY "reports_select_authenticated"
  ON public.daily_reports FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "reports_insert_sales"
  ON public.daily_reports FOR INSERT
  WITH CHECK (public.can_write());

CREATE POLICY "reports_update_own_or_admin"
  ON public.daily_reports FOR UPDATE
  USING (
    created_by = auth.uid() OR public.is_admin_or_manager()
  );

-- ============================================================
-- CONTRACTS policies
-- ============================================================
CREATE POLICY "contracts_select_authenticated"
  ON public.contracts FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "contracts_insert_manager"
  ON public.contracts FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "contracts_update_manager"
  ON public.contracts FOR UPDATE
  USING (public.is_admin_or_manager());

-- ============================================================
-- SYSTEM SETTINGS policies
-- ============================================================
CREATE POLICY "settings_select_authenticated"
  ON public.system_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "settings_update_admin"
  ON public.system_settings FOR UPDATE
  USING (public.is_admin_or_manager());

-- ============================================================
-- Auto-create user_profile on signup trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

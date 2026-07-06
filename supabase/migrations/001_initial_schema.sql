-- ============================================================
-- RICO HOTEL MIKUNI — 統合管理システム
-- Migration 001: Initial Schema (Phase 1: Sales Management)
-- Created: 2026-07-04
-- ============================================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USER PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email        TEXT,
  full_name    TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin', 'manager', 'sales', 'viewer')),
  avatar_url   TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. CLIENTS — 営業先マスター
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company          TEXT NOT NULL,
  contact          TEXT DEFAULT '',
  dept             TEXT DEFAULT '',
  phone            TEXT DEFAULT '',
  email            TEXT DEFAULT '',
  address          TEXT DEFAULT '',
  prefecture       TEXT DEFAULT '大阪府',
  client_type      TEXT DEFAULT '旅行会社',
  rank             TEXT DEFAULT 'B' CHECK (rank IN ('A', 'B', 'C')),
  status           TEXT DEFAULT '未訪問',
  contract_status  TEXT DEFAULT '未着手',
  last_visit_date  DATE,
  next_follow_date DATE,
  revenue          BIGINT DEFAULT 0,
  stays            INTEGER DEFAULT 0,
  notes            TEXT DEFAULT '',
  card_link        TEXT DEFAULT '',
  building_link    TEXT DEFAULT '',
  contract_link    TEXT DEFAULT '',
  photo_link       TEXT DEFAULT '',
  -- Audit columns
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id),
  updated_by       UUID REFERENCES auth.users(id),
  deleted_at       TIMESTAMPTZ  -- soft delete
);

CREATE OR REPLACE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX clients_rank_idx ON public.clients(rank);
CREATE INDEX clients_status_idx ON public.clients(status);
CREATE INDEX clients_next_follow_idx ON public.clients(next_follow_date);
CREATE INDEX clients_deleted_idx ON public.clients(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. CLIENT HISTORY — 営業履歴
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_history (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id   UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  visit_date  DATE NOT NULL,
  action      TEXT NOT NULL DEFAULT '',
  detail      TEXT DEFAULT '',
  person      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX client_history_client_idx ON public.client_history(client_id);
CREATE INDEX client_history_date_idx ON public.client_history(visit_date DESC);

-- ============================================================
-- 4. CASES — 案件管理
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cases (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID REFERENCES public.clients(id),
  title           TEXT NOT NULL,
  status          TEXT DEFAULT '営業中',
  probability     INTEGER DEFAULT 40 CHECK (probability BETWEEN 0 AND 100),
  check_in_date   DATE,
  check_out_date  DATE,
  guests          INTEGER DEFAULT 0,
  rooms           INTEGER DEFAULT 0,
  revenue         BIGINT DEFAULT 0,
  commission_rate TEXT DEFAULT '10%',
  commission      BIGINT DEFAULT 0,
  source          TEXT DEFAULT '',
  notes           TEXT DEFAULT '',
  -- Audit
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  deleted_at      TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX cases_client_idx ON public.cases(client_id);
CREATE INDEX cases_status_idx ON public.cases(status);
CREATE INDEX cases_deleted_idx ON public.cases(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. DAILY REPORTS — 営業日報
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_date         DATE NOT NULL,
  client_id           UUID REFERENCES public.clients(id),
  contact_person      TEXT DEFAULT '',
  purpose             TEXT DEFAULT 'フォロー',
  card_exchanged      TEXT DEFAULT 'なし',
  proposal            TEXT DEFAULT '',
  reaction            TEXT DEFAULT '',
  estimate_requested  TEXT DEFAULT 'なし',
  booking_status      TEXT DEFAULT 'なし',
  next_action         TEXT DEFAULT '',
  next_visit_date     DATE,
  salesperson         TEXT DEFAULT '',
  memo                TEXT DEFAULT '',
  -- Audit
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id),
  updated_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX daily_reports_date_idx ON public.daily_reports(report_date DESC);
CREATE INDEX daily_reports_client_idx ON public.daily_reports(client_id);

-- ============================================================
-- 6. CONTRACTS — 契約管理
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id            UUID REFERENCES public.clients(id),
  title                TEXT NOT NULL,
  start_date           DATE,
  end_date             DATE,
  renewal_date         DATE,
  base_fee             BIGINT DEFAULT 0,
  commission_rate      TEXT DEFAULT '10%',
  car_loan             TEXT DEFAULT 'なし',
  insurance_confirmed  TEXT DEFAULT '未確認',
  notes                TEXT DEFAULT '',
  file_location        TEXT DEFAULT '',
  -- Audit
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  created_by           UUID REFERENCES auth.users(id),
  updated_by           UUID REFERENCES auth.users(id),
  deleted_at           TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

-- Default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('hotel_info', '{"name":"リコホテル三国","address":"大阪市淀川区三国","phone":"06-XXXX-XXXX"}'::jsonb),
  ('sales_config', '{"default_commission_rate":"10%","default_person":"平井","kpi_visits":30,"kpi_won":2}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FUTURE TABLES (Phase 2+) — reserved for expansion
-- These will be added in future migrations:
--   008_rooms.sql         — 部屋管理
--   009_cleaning.sql      — 清掃管理
--   010_shifts.sql        — シフト管理
--   011_petty_cash.sql    — 小口現金
--   012_expenses.sql      — 経費申請
--   013_purchase.sql      — 購入申請
--   014_cashier.sql       — キャッシャーレポート
--   015_payments.sql      — 入金確認
-- ============================================================

COMMENT ON TABLE public.clients IS '営業先マスター — Phase1: Sales Management';
COMMENT ON TABLE public.cases IS '案件管理 — Phase1: Sales Management';
COMMENT ON TABLE public.daily_reports IS '営業日報 — Phase1: Sales Management';
COMMENT ON TABLE public.contracts IS '契約管理 — Phase1: Sales Management';

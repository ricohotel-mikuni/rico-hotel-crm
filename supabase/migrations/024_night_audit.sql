-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 024: 日次締め(Night Audit)
-- Created: 2026-07-18
--
-- 売上管理(daily_sales, migration 023)とは別テーブルとして設計する
-- (「既存設計を変更しない」指示のため、daily_salesへのALTER・RLS
-- 変更は一切行わない)。night_auditsはdaily_salesの当該日レコードを
-- 締め処理の瞬間にスナップショットする1日1件の記録で、
-- UNIQUE(daily_sales_id)により「1つの売上記録につき締めは1回だけ」
-- を保証し、UNIQUE(hotel_id, audit_date)で「1日1回だけ」も二重に
-- 保証する。合計はdaily_salesと同じくGENERATED ALWAYS ASで保証。
--
-- 締め後にdaily_sales側の金額が編集されても(Revenueモジュールの
-- 挙動は変更していないため技術的には編集可能)、night_auditsに
-- 残る金額はスナップショットのため変わらない — 「確定した記録」
-- としての性質を保つ。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.night_audits (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id           UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  audit_date         DATE NOT NULL,
  daily_sales_id     UUID REFERENCES public.daily_sales(id) NOT NULL,
  room_revenue       NUMERIC(12,2) NOT NULL DEFAULT 0,
  breakfast_revenue  NUMERIC(12,2) NOT NULL DEFAULT 0,
  dinner_revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
  parking_revenue    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_revenue      NUMERIC(12,2) GENERATED ALWAYS AS (room_revenue + breakfast_revenue + dinner_revenue + parking_revenue) STORED,
  notes              TEXT DEFAULT '',
  closed_by          UUID REFERENCES public.employees(id),
  closed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, audit_date),
  UNIQUE (daily_sales_id)
);

CREATE INDEX IF NOT EXISTS night_audits_hotel_date_idx ON public.night_audits (hotel_id, audit_date);

CREATE OR REPLACE TRIGGER night_audits_updated_at
  BEFORE UPDATE ON public.night_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.night_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "night_audits_select_authenticated" ON public.night_audits;
CREATE POLICY "night_audits_select_authenticated" ON public.night_audits
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERTのみ許可(UPDATE/DELETEはポリシー無し=不可) — 締め処理は
-- 一度記録したら訂正しない「確定記録」という性質を反映する。
DROP POLICY IF EXISTS "night_audits_insert_night_audit" ON public.night_audits;
CREATE POLICY "night_audits_insert_night_audit" ON public.night_audits
  FOR INSERT WITH CHECK (public.can_write_module('night-audit'));

-- 権限: 他のホテル運営モジュール(breakfast/dinner/parking/revenue)と
-- 同じ付与パターンでhotel_manager/front_deskへ付与する。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'night-audit', TRUE, TRUE, FALSE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'night-audit', TRUE, TRUE, FALSE FROM public.roles r WHERE r.key = 'front_desk'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

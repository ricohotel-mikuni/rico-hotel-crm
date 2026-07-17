-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 023: 売上管理(日次売上)
-- Created: 2026-07-18
--
-- 客室(rooms/stays)・朝食/夕食(meal_services)・駐車場(parking_usages)
-- のいずれにも金額(単価・料金)を持つ列が存在しない(room_types.
-- base_priceはあるが、実際に請求した金額とは限らず、割引・追加
-- 料金等を考慮すると宿泊件数からの自動計算は実売上の"推測"になって
-- しまう)。そのため、実際のホテル現場の締め作業と同じく、フロント
-- /支配人がレジ締め時点の実額を日次で記録する手入力方式とする —
-- 自動計算による捏造を避け、常に「実際に記録された金額」のみを
-- 表示する設計。
--
-- 合計はDB側でGENERATED ALWAYS ASにより保証し、アプリ側での計算
-- ずれ(保存し忘れ等)が起きない設計にした。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_sales (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id           UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  sales_date         DATE NOT NULL,
  room_revenue       NUMERIC(12,2) NOT NULL DEFAULT 0,
  breakfast_revenue  NUMERIC(12,2) NOT NULL DEFAULT 0,
  dinner_revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
  parking_revenue    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_revenue      NUMERIC(12,2) GENERATED ALWAYS AS (room_revenue + breakfast_revenue + dinner_revenue + parking_revenue) STORED,
  notes              TEXT DEFAULT '',
  recorded_by        UUID REFERENCES public.employees(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, sales_date)
);

CREATE INDEX IF NOT EXISTS daily_sales_hotel_date_idx ON public.daily_sales (hotel_id, sales_date);

CREATE OR REPLACE TRIGGER daily_sales_updated_at
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_sales_select_authenticated" ON public.daily_sales;
CREATE POLICY "daily_sales_select_authenticated" ON public.daily_sales
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "daily_sales_write_revenue" ON public.daily_sales;
CREATE POLICY "daily_sales_write_revenue" ON public.daily_sales
  FOR ALL USING (public.can_write_module('revenue'));

-- 権限: 日次締め作業を行うフロント係と支配人へ付与(breakfast/dinner/
-- parkingと同じ付与パターン)。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'revenue', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'revenue', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'front_desk'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

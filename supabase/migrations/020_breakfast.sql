-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 020: 朝食(Breakfast)
-- Created: 2026-07-18
--
-- meal_type列を持つ汎用テーブルとして設計し、将来の夕食モジュール
-- が同じテーブル・同じフック(useMealService)をmealType='dinner'で
-- そのまま再利用できるようにする(rooms→清掃モジュールへの橋渡しと
-- 同じ考え方)。対象者一覧はこのテーブルではなくstaysから毎回算出
-- するため(本日チェックイン済み・宿泊中の滞在)、事前のレコード
-- 作成は不要 — 「提供済」を押した瞬間にだけ1行作成/更新される。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meal_services (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id      UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  stay_id       UUID REFERENCES public.stays(id) ON DELETE CASCADE NOT NULL,
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'dinner')),
  service_date  DATE NOT NULL,
  served        BOOLEAN NOT NULL DEFAULT FALSE,
  served_at     TIMESTAMPTZ,
  served_by     UUID REFERENCES public.employees(id),
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stay_id, meal_type, service_date)
);

CREATE INDEX IF NOT EXISTS meal_services_hotel_date_idx ON public.meal_services (hotel_id, meal_type, service_date);

CREATE OR REPLACE TRIGGER meal_services_updated_at
  BEFORE UPDATE ON public.meal_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.meal_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meal_services_select_authenticated" ON public.meal_services;
CREATE POLICY "meal_services_select_authenticated" ON public.meal_services
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "meal_services_write_breakfast" ON public.meal_services;
CREATE POLICY "meal_services_write_breakfast" ON public.meal_services
  FOR ALL USING (public.can_write_module('breakfast'));

-- 権限: 小規模ホテル運用を前提に、フロント係と支配人が朝食提供も
-- 兼務する想定でfront_desk/hotel_managerへ付与する
-- (front/cleaningと同じ付与パターン)。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'breakfast', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'breakfast', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'front_desk'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

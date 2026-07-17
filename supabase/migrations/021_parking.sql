-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 021: 駐車場(Parking)
-- Created: 2026-07-18
--
-- rooms/stays(migration 018)と同じ「区画テーブル + 利用テーブル」の
-- 2テーブル構成。parking_spotsが駐車位置そのもの(rooms相当)、
-- parking_usagesが宿泊者の駐車利用(stays相当、stay_idで必ず宿泊
-- 予約に紐付ける)。ルームと異なり駐車区画は同時刻に1台のみが前提
-- のため、利用登録の時点で区画を'reserved'にし、利用開始で
-- 'occupied'、利用終了で'vacant'に戻す(roomsのように「予約しても
-- ステータスは変えない」設計ではなく、区画単位の即時反映を優先)。
-- Front Desk是正(Priority A)の教訓を踏まえ、spot_id/stay_idは
-- 最初からNOT NULLとし、区画未定・宿泊者未紐付けの利用が作成できる
-- 余地自体を無くしている。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.parking_spots (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id     UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  spot_number  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'vacant'
               CHECK (status IN ('vacant', 'reserved', 'occupied', 'out_of_order')),
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, spot_number)
);

CREATE OR REPLACE TRIGGER parking_spots_updated_at
  BEFORE UPDATE ON public.parking_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parking_spots_select_authenticated" ON public.parking_spots;
CREATE POLICY "parking_spots_select_authenticated" ON public.parking_spots
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "parking_spots_write_parking" ON public.parking_spots;
CREATE POLICY "parking_spots_write_parking" ON public.parking_spots
  FOR ALL USING (public.can_write_module('parking'));

CREATE TABLE IF NOT EXISTS public.parking_usages (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id       UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  spot_id        UUID REFERENCES public.parking_spots(id) NOT NULL,
  stay_id        UUID REFERENCES public.stays(id) NOT NULL,
  vehicle_type   TEXT DEFAULT '',
  license_plate  TEXT NOT NULL,
  start_at       TIMESTAMPTZ,
  end_at         TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'reserved'
                 CHECK (status IN ('reserved', 'active', 'completed', 'cancelled')),
  notes          TEXT DEFAULT '',
  created_by     UUID REFERENCES public.employees(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS parking_usages_hotel_status_idx ON public.parking_usages (hotel_id, status);
CREATE INDEX IF NOT EXISTS parking_usages_spot_idx ON public.parking_usages (spot_id);
CREATE INDEX IF NOT EXISTS parking_usages_stay_idx ON public.parking_usages (stay_id);

CREATE OR REPLACE TRIGGER parking_usages_updated_at
  BEFORE UPDATE ON public.parking_usages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.parking_usages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parking_usages_select_authenticated" ON public.parking_usages;
CREATE POLICY "parking_usages_select_authenticated" ON public.parking_usages
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "parking_usages_write_parking" ON public.parking_usages;
CREATE POLICY "parking_usages_write_parking" ON public.parking_usages
  FOR ALL USING (public.can_write_module('parking'));

-- 権限: 小規模ホテル運用を前提に、フロント係と支配人が駐車場管理も
-- 兼務する想定でfront_desk/hotel_managerへ付与する(breakfastと
-- 同じ付与パターン)。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'parking', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'parking', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'front_desk'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

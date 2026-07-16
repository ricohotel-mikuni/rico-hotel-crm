-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 018: フロント業務(客室・宿泊・チェックイン/アウト)
-- Created: 2026-07-17
--
-- HotelOS Phase 1 残存モジュール実装の第1弾。客室(rooms)は
-- room_types(migration 016)の内訳として1部屋ずつ管理する実体、
-- 宿泊(stays)は予約〜チェックイン〜チェックアウトの状態を追跡する。
--
-- 客室ステータスの語彙は将来の清掃モジュールとの橋渡しを意識した
-- 設計にしている: チェックアウト時にvacant_dirty(清掃前)へ遷移する
-- ため、清掃モジュール実装時は「vacant_dirtyの部屋一覧」をそのまま
-- 清掃待ちキューとして使える(新しい状態列を増やさずに済む)。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id     UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  room_type_id UUID REFERENCES public.room_types(id),
  room_number  TEXT NOT NULL,
  floor        TEXT DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'vacant_clean'
               CHECK (status IN ('vacant_clean', 'vacant_dirty', 'occupied', 'maintenance', 'out_of_order')),
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, room_number)
);

CREATE OR REPLACE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_select_authenticated" ON public.rooms;
CREATE POLICY "rooms_select_authenticated" ON public.rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "rooms_write_front" ON public.rooms;
CREATE POLICY "rooms_write_front" ON public.rooms
  FOR ALL USING (public.can_write_module('front'));

CREATE TABLE IF NOT EXISTS public.stays (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id           UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  room_id            UUID REFERENCES public.rooms(id),
  guest_name         TEXT NOT NULL,
  guest_phone        TEXT DEFAULT '',
  adults             INTEGER DEFAULT 1,
  children           INTEGER DEFAULT 0,
  checkin_date       DATE NOT NULL,
  checkout_date      DATE NOT NULL,
  actual_checkin_at  TIMESTAMPTZ,
  actual_checkout_at TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'reserved'
                     CHECK (status IN ('reserved', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  notes              TEXT DEFAULT '',
  created_by         UUID REFERENCES public.employees(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stays_hotel_checkin_idx ON public.stays (hotel_id, checkin_date);
CREATE INDEX IF NOT EXISTS stays_room_idx ON public.stays (room_id);

CREATE OR REPLACE TRIGGER stays_updated_at
  BEFORE UPDATE ON public.stays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stays_select_authenticated" ON public.stays;
CREATE POLICY "stays_select_authenticated" ON public.stays
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "stays_write_front" ON public.stays;
CREATE POLICY "stays_write_front" ON public.stays
  FOR ALL USING (public.can_write_module('front'));

-- hotel_managerにも書き込み権限を付与(front_desk roleには既に006/011で
-- module='front'の権限が付与済みのため、ここでは追加しない)。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'front', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

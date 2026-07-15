-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 016: 統合ホテル管理モジュール基盤
-- Created: 2026-07-16
--
-- 承認済み提案書「統合ホテル管理モジュール」に基づく実装。将来
-- 1,000施設規模のSaaS展開を前提に、ホテル(拠点)自体をコードの
-- ハードコードではなくデータとして管理できるようにする。
--
-- 対象外(要確認②・③として提案書で明示し承認済み):
--   - PMS/OTA設定はメタデータ保持のみ。実際の外部システム連携は
--     行わない(sync_enabled/connectedは常にFALSEのまま)。
--   - ホテル別の行レベルデータ遮断(本格的なマルチテナントRLS)は
--     対象外。2件目のホテルが実際に稼働する段階で別途提案する。
-- ============================================================

-- ============================================================
-- 1. locations — ステータスをenum化し、ソフトデリートに対応
-- ============================================================
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_status_check;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

-- ============================================================
-- 2. hotels — brand_key(src/branding/brands.jsのキーに対応)と
--    updated_atを追加。
-- ============================================================
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS brand_key  TEXT DEFAULT 'ricoHotel',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE TRIGGER hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. can_write_module — can_approve()(006)と同じ形の汎用ヘルパー。
--    新しいRBACエンジン(employee_roles/role_permissions)でモジュール
--    単位の編集権限をRLSから判定する。system_admin/ceoは常に許可
--    (PermissionContext.jsxのcan()と同じ特別扱い)。
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_write_module(p_module TEXT)
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
        OR COALESCE(rp.can_edit, FALSE)
      )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ceoはPermissionContext.jsx上「view/approve」が既定で常時許可される
-- (system_admin/ceoにrole_permissions行を作らない006の方針)。
-- ホテル管理は編集権限も既定でceoへ付与する(提案書「既定では
-- system_admin/ceoのみ書き込み可」)。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'hotel_management', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'ceo'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

-- locations/hotels — これまでクライアントから直接読む画面が無かった
-- (HotelList.jsxはregistry.js静的配列を表示していた)ため、既存の
-- RLS状態を前提にせず、SELECT(全社員)とWRITE(hotel_management権限)
-- を明示的に分けて定義する。ホテル一覧はどの社員も閲覧できる必要が
-- あるため、書き込みのみadmin限定とする(他の1:多参照テーブルと
-- 同じ設計)。
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_select_authenticated" ON public.locations;
CREATE POLICY "locations_select_authenticated" ON public.locations
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "locations_write_admin" ON public.locations;
CREATE POLICY "locations_write_admin" ON public.locations
  FOR ALL USING (public.can_write_module('hotel_management'));

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_select_authenticated" ON public.hotels;
CREATE POLICY "hotels_select_authenticated" ON public.hotels
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "hotels_write_admin" ON public.hotels;
CREATE POLICY "hotels_write_admin" ON public.hotels
  FOR ALL USING (public.can_write_module('hotel_management'));

-- ============================================================
-- 4. room_types — 客室タイプ管理(ホテル単位)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_types (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id    UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT DEFAULT '',
  room_count  INTEGER NOT NULL DEFAULT 0,
  capacity    INTEGER DEFAULT 2,
  base_price  INTEGER,
  sort_order  INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER room_types_updated_at
  BEFORE UPDATE ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "room_types_select_authenticated" ON public.room_types;
CREATE POLICY "room_types_select_authenticated" ON public.room_types
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
DROP POLICY IF EXISTS "room_types_write_admin" ON public.room_types;
CREATE POLICY "room_types_write_admin" ON public.room_types
  FOR ALL USING (public.can_write_module('hotel_management'));

-- ============================================================
-- 5. pms_settings — PMS設定(ホテル1:1、メタデータのみ。実連携なし)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pms_settings (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id              UUID UNIQUE REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  vendor                TEXT DEFAULT '',
  external_property_id  TEXT DEFAULT '',
  sync_enabled          BOOLEAN DEFAULT FALSE,
  notes                 TEXT DEFAULT '',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER pms_settings_updated_at
  BEFORE UPDATE ON public.pms_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.pms_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pms_settings_select_authenticated" ON public.pms_settings;
CREATE POLICY "pms_settings_select_authenticated" ON public.pms_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "pms_settings_write_admin" ON public.pms_settings;
CREATE POLICY "pms_settings_write_admin" ON public.pms_settings
  FOR ALL USING (public.can_write_module('hotel_management'));

COMMENT ON TABLE public.pms_settings IS 'PMS設定メタデータのみ。sync_enabledは常にFALSE(実連携は別途の機能提案)';

-- ============================================================
-- 6. ota_channels — OTA設定(ホテル1:多、メタデータのみ。実連携なし)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ota_channels (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id              UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  ota_name              TEXT NOT NULL,
  external_listing_id   TEXT DEFAULT '',
  connected             BOOLEAN DEFAULT FALSE,
  status                TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  notes                 TEXT DEFAULT '',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER ota_channels_updated_at
  BEFORE UPDATE ON public.ota_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.ota_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ota_channels_select_authenticated" ON public.ota_channels;
CREATE POLICY "ota_channels_select_authenticated" ON public.ota_channels
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ota_channels_write_admin" ON public.ota_channels;
CREATE POLICY "ota_channels_write_admin" ON public.ota_channels
  FOR ALL USING (public.can_write_module('hotel_management'));

COMMENT ON TABLE public.ota_channels IS 'OTA設定メタデータのみ。connectedは常にFALSE(実連携は別途の機能提案)';

-- ============================================================
-- 7. hotel_ai_assignments — AI担当設定。将来のAI総支配人/AI価格分析
--    /競合ホテル分析/収益分析/清掃AI/設備AIが参照するマスタ。
--    ai_levelは列としては1〜6を許容するが、UI側はAI開発憲章に
--    合わせ1〜4のみを選択肢とする(Level5・6は個別の憲章改定なしに
--    実装しない)。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hotel_ai_assignments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id   UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  ai_role    TEXT NOT NULL CHECK (ai_role IN ('general_manager', 'revenue_manager', 'sales_director', 'owner')),
  enabled    BOOLEAN DEFAULT FALSE,
  ai_level   INTEGER DEFAULT 1 CHECK (ai_level BETWEEN 1 AND 6),
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, ai_role)
);

CREATE OR REPLACE TRIGGER hotel_ai_assignments_updated_at
  BEFORE UPDATE ON public.hotel_ai_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.hotel_ai_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_ai_assignments_select_authenticated" ON public.hotel_ai_assignments;
CREATE POLICY "hotel_ai_assignments_select_authenticated" ON public.hotel_ai_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "hotel_ai_assignments_write_admin" ON public.hotel_ai_assignments;
CREATE POLICY "hotel_ai_assignments_write_admin" ON public.hotel_ai_assignments
  FOR ALL USING (public.can_write_module('hotel_management'));

-- ============================================================
-- 8. PostgRESTにスキーマ変更を確実に伝える
-- ============================================================
NOTIFY pgrst, 'reload schema';

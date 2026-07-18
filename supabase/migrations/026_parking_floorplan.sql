-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 026: 駐車場フロアプラン対応
-- Created: 2026-07-18
--
-- 承認済み提案書(駐車場管理モジュール再設計 Rev.2)に基づき、
-- parking_spotsに区画種別(spot_type)と表示順(zone_order)を追加する。
-- ゾーン構成(どの区画がどの色エリアに属するか)をコードにハード
-- コードせず、ホテルごとのDBデータとして持たせる設計(他ホテルへの
-- 展開を見据えたマルチホテル対応)。
--
-- 既存データへの配慮: 本番ではparking_spotsに既にテスト用の区画が
-- 手動追加されている可能性があるため、新しい15区画のシード投入は
-- 「リコホテル三国のparking_spotsが現時点で0件の場合のみ」に限定する
-- (NOT EXISTS ガード)。既に区画が存在する場合は投入しない — 実データ
-- の重複・上書きを避けるため(推測でシードしない)。
-- ============================================================

ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS spot_type TEXT NOT NULL DEFAULT 'regular'
    CHECK (spot_type IN ('bike', 'regular', 'large', 'compact', 'disabled', 'company')),
  ADD COLUMN IF NOT EXISTS zone_order INTEGER NOT NULL DEFAULT 0;

-- ナンバーは添付フォーム仕様(利用開始フォーム)で「任意」に変更された。
ALTER TABLE public.parking_usages
  ALTER COLUMN license_plate DROP NOT NULL;

-- リコホテル三国: 添付フロアプランどおりの15区画をシード投入
-- (①バイク・②〜⑤普通車・⑥〜⑧大型車・⑨⑪⑫⑬小型コンパクト+社用車・
-- ⑭⑮身障者優先。添付図には⑩が存在しない番号として描かれているため
-- 忠実に再現し、⑩は欠番のままとする)。
DO $$
DECLARE
  v_hotel_id UUID;
BEGIN
  SELECT h.id INTO v_hotel_id
  FROM public.hotels h JOIN public.locations l ON l.id = h.location_id
  WHERE l.slug = 'rico-mikuni';

  IF v_hotel_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.parking_spots WHERE hotel_id = v_hotel_id
  ) THEN
    INSERT INTO public.parking_spots (hotel_id, spot_number, spot_type, zone_order) VALUES
      (v_hotel_id, '①', 'bike', 1),
      (v_hotel_id, '②', 'regular', 1),
      (v_hotel_id, '③', 'regular', 2),
      (v_hotel_id, '④', 'regular', 3),
      (v_hotel_id, '⑤', 'regular', 4),
      (v_hotel_id, '⑥', 'large', 1),
      (v_hotel_id, '⑦', 'large', 2),
      (v_hotel_id, '⑧', 'large', 3),
      (v_hotel_id, '⑨', 'compact', 1),
      (v_hotel_id, '⑪', 'compact', 2),
      (v_hotel_id, '⑫', 'compact', 3),
      (v_hotel_id, '⑬', 'compact', 4),
      (v_hotel_id, '社用車', 'company', 5),
      (v_hotel_id, '⑭', 'disabled', 1),
      (v_hotel_id, '⑮', 'disabled', 2);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

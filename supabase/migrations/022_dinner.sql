-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 022: 夕食(Dinner)
-- Created: 2026-07-18
--
-- meal_services(migration 020)はmeal_type列を持つ朝食/夕食共通
-- テーブルとして設計済みのため、新しいテーブルは追加しない。
-- useMealService(hotelId, mealType)フック・Breakfast.jsxの画面構成
-- を'dinner'でそのまま再利用する。
--
-- 唯一のスキーマ変更点はRLSの書き込みポリシー: migration 020の
-- "meal_services_write_breakfast"はcan_write_module('breakfast')の
-- 一律チェックで、meal_type列を一切見ていなかった(朝食スタッフに
-- しか書き込み権限が付与されていない設計ミス — 夕食モジュール未
-- 実装だったため顕在化していなかった)。行ごとのmeal_typeに応じて
-- 朝食/夕食それぞれの権限を判定するポリシーへ差し替える。
-- ============================================================

DROP POLICY IF EXISTS "meal_services_write_breakfast" ON public.meal_services;
CREATE POLICY "meal_services_write" ON public.meal_services
  FOR ALL
  USING (
    (meal_type = 'breakfast' AND public.can_write_module('breakfast'))
    OR (meal_type = 'dinner' AND public.can_write_module('dinner'))
  )
  WITH CHECK (
    (meal_type = 'breakfast' AND public.can_write_module('breakfast'))
    OR (meal_type = 'dinner' AND public.can_write_module('dinner'))
  );

-- 権限: 小規模ホテル運用を前提に、フロント係と支配人が夕食提供も
-- 兼務する想定でfront_desk/hotel_managerへ付与する(breakfastと
-- 同じ付与パターン)。
INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'dinner', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'dinner', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'front_desk'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

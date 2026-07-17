-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 019: 清掃(Housekeeping)
-- Created: 2026-07-17
--
-- 清掃モジュールは新しいテーブルを一切追加しない — migration 018の
-- roomsテーブルを唯一の真実の情報源として使い、status='vacant_dirty'
-- の部屋を清掃待ちキューとして表示し、「清掃完了」操作で
-- status='vacant_clean'へ更新するだけ(useRooms().setRoomStatusを
-- そのまま再利用、新しいミューテーション経路は増やさない)。
--
-- 権限: cleaningロールはmigration 012で既にmodule='cleaning'への
-- can_edit=TRUEを取得済み(006/011の誤ったmodule='housekeeping'を
-- 012で補正済み)。ここではhotel_managerへの付与のみ追加する
-- (front(018)と同じ抜け漏れパターン)。
-- ============================================================

INSERT INTO public.role_permissions (role_id, module, can_view, can_edit, can_delete)
SELECT r.id, 'cleaning', TRUE, TRUE, TRUE FROM public.roles r WHERE r.key = 'hotel_manager'
ON CONFLICT (role_id, module, company_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

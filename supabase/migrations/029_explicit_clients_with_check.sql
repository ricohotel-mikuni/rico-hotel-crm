-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 029: clients_update_salesのWITH CHECKを明示化
-- Created: 2026-07-19
--
-- 【今回のRLS 42501エラーの技術的な整理】
-- PostgreSQL公式ドキュメント(CREATE POLICY)で確認済み: USINGのみで
-- WITH CHECKを指定しない場合、UPDATEではUSINGの式がWITH CHECKにも
-- 転用される。can_write()は行データに依存しない(auth.uid()と
-- user_profiles.roleのみで決まる)STABLE関数のため、USING側が真なら
-- WITH CHECK側も理論上必ず真になる — つまりポリシー文自体に矛盾は
-- 無い。今回発生した42501は、リクエスト時点でこのセッションの
-- user_profiles.roleが実際にadmin/manager/salesのいずれでもなかった
-- ことを意味する(ブラウザ側のpermissions.canDeleteはログイン時に
-- 取得したprofileのキャッシュのため、その後DB側のroleが変わっても
-- 再ログイン/トークン自動更新まで追従しない — AuthContext.jsxの
-- onAuthStateChangeはセッションイベント時にしかfetchProfile()しない
-- ことをコードで確認済み。直前のmigration 028がuser_profiles.roleを
-- 一括再計算したこととタイミングが一致する)。
--
-- 【本migrationの内容】
-- ポリシー自体は正しかったが、暗黙のフォールバック(USING→WITH CHECK
-- 転用)に依存している点は、このコードベースの他のポリシー(例:
-- meal_services_write、migration 022)がUSING/WITH CHECK双方を明示
-- している慣習と一致しない。読み手にとっての曖昧さを無くすため、
-- WITH CHECKを明示化する(動作は変わらない、可読性・保守性の是正)。
-- ============================================================

DROP POLICY IF EXISTS "clients_update_sales" ON public.clients;
CREATE POLICY "clients_update_sales"
  ON public.clients FOR UPDATE
  USING (public.can_write())
  WITH CHECK (public.can_write());

NOTIFY pgrst, 'reload schema';

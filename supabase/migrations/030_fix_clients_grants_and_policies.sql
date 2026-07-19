-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 030: clientsテーブルのGRANT・RLSポリシーを明示的に再定義
-- Created: 2026-07-20
--
-- 【診断で確定した事実】
-- user_profiles.role='admin'・is_active=true・employee_role_keysに
-- system_admin・can_write()=trueをSQL Editor上で直接確認済み。
-- clients_insert_sales/clients_update_salesのポリシー本文も
-- WITH CHECK (public.can_write())のみで行データに依存しない。
-- つまりRLSポリシーの「条件式」自体には、このユーザーを拒否する
-- 要素が無いことをすでに実証済み。
--
-- 【残る可能性への対応】
-- RLSポリシーが全て正しくても、Postgresでは「テーブルに対する
-- 基礎的なSQL権限(GRANT)」が無ければRLS以前に42501
-- (insufficient_privilege)で拒否される — これはRLSポリシーの
-- 文面をいくら確認しても検出できない、別レイヤーの制御である。
-- 本migrationはこのレイヤーを疑い、authenticatedロールへの
-- GRANTを明示的に再付与する。あわせてINSERT/UPDATEポリシーを
-- TO authenticated・WITH CHECK明示の形で再作成し、あいまいさを
-- 完全に排除する(SELECTポリシーは正常に機能しているため変更しない)。
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT SELECT, INSERT ON public.client_history TO authenticated;

DROP POLICY IF EXISTS "clients_insert_sales" ON public.clients;
CREATE POLICY "clients_insert_sales"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write());

DROP POLICY IF EXISTS "clients_update_sales" ON public.clients;
CREATE POLICY "clients_update_sales"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.can_write())
  WITH CHECK (public.can_write());

NOTIFY pgrst, 'reload schema';

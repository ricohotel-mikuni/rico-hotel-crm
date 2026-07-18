-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 027: 管理画面(共通マスター・会社管理)の削除403是正
-- Created: 2026-07-19
--
-- 【確定した根本原因】
-- AdminCommonMasters.jsx / AdminCompanies.jsx の削除ボタンは新RBAC
-- (usePermission('hotel_management', 'delete') → employee_roles/
-- role_permissions.can_delete)で表示可否を判定しているが、
-- departments/business_units/companiesのRLS書き込みポリシーは
-- migration 005/011からis_admin_or_manager()(旧来のuser_profiles.role
-- IN ('admin','manager')のみを見る、社員マスタ一元化以降は凍結扱いの
-- 仕組み)のままだった。両者は別々のテーブル/カラムを参照するため、
-- 「新RBAC上は削除権限がある(ボタンが出る)が、旧user_profiles.roleが
-- admin/managerでないためRLSに拒否される(403)」という不整合が起き
-- ていた。positions/employment_types(migration 017)は新RBAC
-- (can_write_module)を使っていたが、can_editのみを見ておりcan_delete
-- を区別していなかった(削除ボタンがcan_deleteで出し分けられている
-- こととズレていた、こちらは403ではなく過剰許可の方向のズレ)。
--
-- 【是正方針】
-- can_write_moduleと対になるcan_delete_module()を新設し、
-- INSERT/UPDATEはcan_write_module(can_edit)、DELETEはcan_delete_module
-- (can_delete)で明確に分離する。is_admin_or_manager()には触れない
-- (clients等、旧システムのまま凍結されている他のテーブルには影響
-- させない)。
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_delete_module(p_module TEXT)
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
        OR COALESCE(rp.can_delete, FALSE)
      )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- departments / business_units / companies:
-- is_admin_or_manager()の単一FOR ALLポリシーを廃止し、新RBAC基準の
-- INSERT/UPDATE/DELETEへ分離する。
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments', 'business_units', 'companies'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write_admin', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.can_write_module(''hotel_management''))',
      t || '_insert_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.can_write_module(''hotel_management''))',
      t || '_update_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.can_delete_module(''hotel_management''))',
      t || '_delete_admin', t
    );
  END LOOP;
END $$;

-- positions / employment_types: 既存のFOR ALL(can_write_module)を
-- 同様にINSERT/UPDATE/DELETEへ分離し、削除だけcan_delete_moduleに
-- 揃える(過剰許可の是正)。
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['positions', 'employment_types'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write_admin', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.can_write_module(''hotel_management''))',
      t || '_insert_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.can_write_module(''hotel_management''))',
      t || '_update_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.can_delete_module(''hotel_management''))',
      t || '_delete_admin', t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 028: legacy_role_for_employee()の対応表を完全化
-- Created: 2026-07-19
--
-- 【調査で見つかった実際のギャップ】
-- migration 014のlegacy_role_for_employee()(新方式employee_rolesから
-- 旧方式user_profiles.roleへの橋渡し関数)は、当時存在したロール
-- キーのみを対応表に含んでいた: system_admin/ceo/admin/hotel_manager/
-- manager/sales/front_desk/accounting。その後のセッションで追加された
-- ロール(cleaning/breakfast/dinner/maintenance/general_affairs、
-- migration 012)がこの対応表に含まれておらず、これらのロールしか
-- 持たない社員は無条件でRETURN 'viewer'に落ちていた('viewer'は
-- canWrite=false・canDelete=false)。
--
-- 影響: 該当ロールの社員はuser_profiles.roleが'viewer'になり、
-- can_write()/is_admin_or_manager()を参照する旧システム管理下の
-- 画面(営業管理モジュール: 取引先・案件・日報等)で、閲覧はできても
-- 編集・削除ボタン自体が表示されない状態になっていた(送信して403に
-- なるのではなく、ボタンが最初から出ない形の権限漏れ)。
--
-- 是正: 現存する全ロールキーを対応表に追加する。清掃/朝食/夕食/設備/
-- 総務は営業モジュールの削除権限までは不要なため、書き込みはできる
-- が削除はできない'sales'相当にマッピングする(admin/managerへ
-- 昇格させない)。
-- ============================================================

CREATE OR REPLACE FUNCTION public.legacy_role_for_employee(p_employee_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_keys TEXT[];
BEGIN
  SELECT array_agg(r.key) INTO v_keys
  FROM public.employee_roles er
  JOIN public.roles r ON r.id = er.role_id
  WHERE er.employee_id = p_employee_id;

  IF v_keys IS NULL THEN RETURN 'viewer'; END IF;
  IF v_keys && ARRAY['system_admin','ceo','admin'] THEN RETURN 'admin'; END IF;
  IF v_keys && ARRAY['hotel_manager','manager'] THEN RETURN 'manager'; END IF;
  IF v_keys && ARRAY[
    'sales','front_desk','accounting',
    'cleaning','breakfast','dinner','maintenance','general_affairs'
  ] THEN RETURN 'sales'; END IF;
  RETURN 'viewer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 対応表を修正しただけでは、既に'viewer'に固定されてしまっている
-- 既存社員のuser_profiles.roleは変わらない(トリガーはemployee_roles
-- の変更時にしか発火しないため)。今この時点の全社員に対して
-- 一括で再計算し、修正後の対応表を即座に反映する。
UPDATE public.user_profiles up
SET role = public.legacy_role_for_employee(e.id)
FROM public.employees e
WHERE e.user_id = up.id;

NOTIFY pgrst, 'reload schema';

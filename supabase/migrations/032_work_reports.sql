-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 032: 業務日報(work_reports)
-- Created: 2026-10-03
--
-- 承認済み提案書「システム構成の整理」②に基づく。既存のdaily_reports
-- (営業の訪問記録専用、001)は変更しない — 列構成が営業特化のため、
-- ホテルスタッフ等では使えない。社員・業務委託が共通で使う新しい
-- 日報としてwork_reportsを新設する。
--
-- 区分(営業/通常業務)は社員属性から自動判定せず、入力する本人が
-- その場で選ぶ方式(社員マスタ側にフラグ等は持たせない)。区分ごと
-- の項目差異も固定の列を持たずcontent(jsonb)に格納するため、将来
-- 区分が増えてもmigration不要でフロント側の対応だけで済む。
--
-- GRANTを最初から明示的に付与する(migration 030の教訓: clientsで
-- 発生したRLS以前のGRANT不足による42501を繰り返さない)。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.work_reports (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_id  UUID REFERENCES public.employees(id) NOT NULL,
  category     TEXT NOT NULL,
  content      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES auth.users(id),
  UNIQUE (employee_id, report_date, category)
);

CREATE INDEX IF NOT EXISTS idx_work_reports_date ON public.work_reports(report_date);

CREATE OR REPLACE TRIGGER trg_work_reports_updated_at
  BEFORE UPDATE ON public.work_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.work_reports TO authenticated;

-- 本人の日報は本人が見える。管理者(hotel_management書き込み権限、
-- system_admin/ceoは常時許可)は全員分を見える(提出状況一覧のため)。
DROP POLICY IF EXISTS "work_reports_select_own_or_admin" ON public.work_reports;
CREATE POLICY "work_reports_select_own_or_admin"
  ON public.work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.can_write_module('hotel_management')
  );

-- 登録・更新は本人の分のみ(管理者による代理登録は今回の範囲外)。
DROP POLICY IF EXISTS "work_reports_insert_own" ON public.work_reports;
CREATE POLICY "work_reports_insert_own"
  ON public.work_reports FOR INSERT
  TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "work_reports_update_own" ON public.work_reports;
CREATE POLICY "work_reports_update_own"
  ON public.work_reports FOR UPDATE
  TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 017: 共通マスター拡張(役職・雇用区分)
-- Created: 2026-07-16
--
-- 承認済みFoundation v1.0 Completion Sprintに基づく実装。
-- 「会社・部署・役職・権限・雇用区分すべてを管理画面から追加・編集
-- できるようにする、ハードコード禁止」の指示のうち、役職(position)
-- と雇用区分(employment_type)がこれまでEmployeeForm.jsx内の自由
-- テキスト/固定配列だったため、他の共通マスター(business_units/
-- departments/roles)と同じ形の管理可能テーブルへ昇格させる。
--
-- employee_assignments.position / employees.employment_type は
-- 既存どおりTEXT列のまま(値としてマスタのnameを保存)とし、FK化は
-- 見送る — 過去データとの互換性を壊さず、既存の保存・表示コードを
-- 変更せずに済む(マスタは「入力候補の管理場所」として機能する)。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.positions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, name)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "positions_select_authenticated" ON public.positions;
CREATE POLICY "positions_select_authenticated" ON public.positions
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "positions_write_admin" ON public.positions;
CREATE POLICY "positions_write_admin" ON public.positions
  FOR ALL USING (public.can_write_module('hotel_management'));

INSERT INTO public.positions (company_id, name, sort_order)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.sort_order
FROM (VALUES ('支配人',1), ('主任',2), ('担当',3), ('スタッフ',4)) AS v(name, sort_order)
ON CONFLICT (company_id, name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.employment_types (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, name)
);

ALTER TABLE public.employment_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employment_types_select_authenticated" ON public.employment_types;
CREATE POLICY "employment_types_select_authenticated" ON public.employment_types
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "employment_types_write_admin" ON public.employment_types;
CREATE POLICY "employment_types_write_admin" ON public.employment_types
  FOR ALL USING (public.can_write_module('hotel_management'));

-- 旧EmployeeForm.jsxのハードコード配列(EMPLOYMENT_TYPES)と同じ値を
-- 初期データとして投入し、既存の保存済みデータの表示に影響が出ない
-- ようにする。
INSERT INTO public.employment_types (company_id, name, sort_order)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.sort_order
FROM (VALUES ('正社員',1), ('契約社員',2), ('パート・アルバイト',3), ('嘱託',4), ('その他',5)) AS v(name, sort_order)
ON CONFLICT (company_id, name) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 008: v_employee_directory を確実に存在させる(自己検証付き)
-- Created: 2026-07-06
--
-- 背景: 「Could not find the table public.v_employee_directory in the
-- schema cache」がv1.2.1適用後も再発。コード側(src/hooks/useData.js
-- の useEmployees()、EmployeeDirectory.jsx/EmployeeProfile.jsx)を
-- 再点検したが、テーブル名・クエリ・RLSポリシーいずれも一致しており
-- 不整合は無い。このエラー文言はPostgRESTが該当リレーションをスキー
-- マキャッシュ上で認識できない時に限って出るもので、RLS(権限)の問題
-- であれば代わりに空配列や403相当のエラーになるため原因ではない。
-- 残る可能性は「005/006が対象のSupabaseプロジェクトに未適用」
-- 「006はALTER TABLE employeesから始まるため005が無いと1文目で失敗し
-- view再定義まで到達しない」「適用はされたがスキーマキャッシュが
-- 未更新」のいずれか — このセッションから実際のプロジェクトへは
-- 接続できないため確定はできない。
--
-- 対応: 前提テーブルの存在を先に明示チェックし、無ければ「005を先に
-- 実行してください」という分かりやすい日本語エラーで即座に止める
-- (曖昧なPostgRESTエラーを待たせない)。存在すれば005/006相当の
-- 列追加・view再定義・GRANT・スキーマキャッシュ再読み込みを単独でも
-- 完結できるようこの1ファイルにまとめて再実行し、最後に成功を
-- NOTICEで明示する。005/006の代わりではなく、それらが未適用/部分適用
-- でも安全に「今から」確実な状態に揃えるための保険。
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    RAISE EXCEPTION '公開スキーマに public.employees がありません。先に supabase/migrations/005_company_foundation.sql を実行してください。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_assignments') THEN
    RAISE EXCEPTION '公開スキーマに public.employee_assignments がありません。先に supabase/migrations/005_company_foundation.sql を実行してください。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
    RAISE EXCEPTION '公開スキーマに public.locations がありません。先に supabase/migrations/005_company_foundation.sql を実行してください。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
    RAISE EXCEPTION '公開スキーマに public.departments がありません。先に supabase/migrations/005_company_foundation.sql を実行してください。';
  END IF;
END $$;

-- 006相当の列追加(既にあればスキップされるだけで無害)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kana                     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_url                TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS address                  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_name    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_phone   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS retirement_date           DATE,
  ADD COLUMN IF NOT EXISTS employment_type           TEXT DEFAULT '正社員',
  ADD COLUMN IF NOT EXISTS social_insurance          JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes                     TEXT DEFAULT '';

-- view本体を必ず再作成(006と同一定義。存在しなければ新規作成される)
CREATE OR REPLACE VIEW public.v_employee_directory AS
SELECT
  e.id, e.employee_no, e.full_name, e.kana, e.photo_url, e.email, e.phone,
  e.address, e.emergency_contact_name, e.emergency_contact_phone,
  e.hire_date, e.retirement_date, e.employment_type, e.social_insurance,
  e.notes, e.status,
  a.position, a.location_id, a.department_id,
  l.name AS location_name, l.type AS location_type,
  d.name AS department_name
FROM public.employees e
LEFT JOIN public.employee_assignments a ON a.employee_id = e.id AND a.is_primary = TRUE AND a.end_date IS NULL
LEFT JOIN public.locations l ON l.id = a.location_id
LEFT JOIN public.departments d ON d.id = a.department_id
WHERE e.deleted_at IS NULL
ORDER BY e.full_name;

GRANT SELECT ON public.v_employee_directory TO authenticated;

-- PostgRESTにスキーマ変更を確実に伝える
NOTIFY pgrst, 'reload schema';

-- 成功確認(Supabase StudioのMessagesタブに出力される)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_employee_directory') THEN
    RAISE NOTICE 'OK: public.v_employee_directory を確認・再作成しました。アプリ側で社員管理画面を再読み込みしてください。';
  END IF;
END $$;

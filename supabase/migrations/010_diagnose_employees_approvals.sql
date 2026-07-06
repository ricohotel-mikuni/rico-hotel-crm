-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 010: 社員管理・電子承認 診断スクリプト(読み取り専用)
-- Created: 2026-07-06
--
-- 【これは通常のmigrationではありません】このファイルは何も作成/変更
-- しません(CREATE/ALTER/INSERTを一切含まない)。Supabase Studioの
-- SQL Editorで実行すると、社員管理・電子承認に必要な全テーブル/view
-- が「今、実際に」存在するかどうかを一覧で表示するだけの診断ツール
-- です。何度でも安全に実行できます。
--
-- 背景: v1.2.1から複数回にわたり
--   ・社員管理 → "Could not find the table public.v_employee_directory"
--   ・電子承認 → "Could not find the table public.approval_requests"
-- が報告されています。フロントエンドのコード(src/hooks/useData.js)を
-- 何度も突き合わせましたが、参照しているテーブル/view名は
-- supabase/migrations/005_company_foundation.sql・
-- 006_hr_permissions_approvals.sql の定義と完全に一致しており、
-- コード側の不整合は一切ありません(次の一覧を参照)。
--
--   画面                  → 参照するテーブル/view        → 定義ファイル
--   社員管理(一覧/詳細)   → v_employee_directory(view)   → 005(初版)/006(拡張)/008(再保証)
--                          → employees                    → 005
--                          → employee_assignments         → 005
--                          → locations                    → 005
--                          → departments                  → 005
--   電子承認               → approval_requests             → 006
--                          → approval_steps                → 006
--                          → employees(申請者名の結合)     → 005
--                          → roles(承認者ロール選択)       → 005
--
-- 006の最初の実行文は `ALTER TABLE public.employees ...` であり、
-- これは005で作られる employees テーブルが無いと即座に失敗します。
-- Supabase Studioでファイル全体を1回で貼り付けて実行した場合、
-- 1文目のエラーでスクリプト全体が止まり、以降の approval_requests
-- 定義にもv_employee_directoryの拡張にも到達しません。
--
-- つまり2つのエラーが同時に起きている状況は「005が(完全には)適用
-- されていない」という単一の原因で完全に説明できます。このスクリプト
-- はそれを推測ではなく事実として確認するためのものです。
-- ============================================================

DO $$
DECLARE
  required_tables TEXT[] := ARRAY[
    'companies', 'locations', 'departments', 'roles', 'employees',
    'employee_assignments', 'role_permissions', 'employee_roles',
    'approval_requests', 'approval_steps'
  ];
  required_views TEXT[] := ARRAY['v_employee_directory'];
  required_functions TEXT[] := ARRAY['is_admin_or_manager', 'update_updated_at'];
  t TEXT;
  missing_count INT := 0;
BEGIN
  RAISE NOTICE '=== 社員管理・電子承認 診断結果 ===';

  RAISE NOTICE '--- 前提条件(001/002由来。営業管理が動いていれば通常は存在) ---';
  FOREACH t IN ARRAY required_functions LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = t) THEN
      RAISE NOTICE '  OK  function %', t;
    ELSE
      RAISE NOTICE '  ✗ MISSING  function % — 001_initial_schema.sql / 002_rls_policies.sql が未適用の可能性', t;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '--- 005_company_foundation.sql 由来のテーブル ---';
  FOREACH t IN ARRAY required_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      RAISE NOTICE '  OK  table %', t;
    ELSE
      RAISE NOTICE '  ✗ MISSING  table %', t;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '--- View ---';
  FOREACH t IN ARRAY required_views LOOP
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = t) THEN
      RAISE NOTICE '  OK  view %', t;
    ELSE
      RAISE NOTICE '  ✗ MISSING  view %', t;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '=== 結果 ===';
  IF missing_count = 0 THEN
    RAISE NOTICE 'すべて存在します。それでもアプリでエラーが出る場合はPostgRESTのスキーマキャッシュ未更新の可能性が高いため、次を実行してください: NOTIFY pgrst, ''reload schema''; それでも直らない場合はSupabase Studio → Project Settings → General → Restart project を実行してください。';
  ELSE
    RAISE NOTICE '% 件不足しています。employees/locations/departments/roles等が不足していれば supabase/migrations/005_company_foundation.sql を、approval_requests/approval_stepsのみが不足していれば(005が完了していることを確認した上で) 006_hr_permissions_approvals.sql を、Supabase StudioのSQL Editorで全文貼り付けて実行してください。', missing_count;
  END IF;
END $$;

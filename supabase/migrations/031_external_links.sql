-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 031: 外部サービス設定(external_links) — Phase1
-- Created: 2026-10-03
--
-- 承認済み提案書「Phase1: 外部サービスへのワンクリックアクセス
-- (Dropbox/ホテルスマート/公式LINE)」に基づく。URLをコードに
-- ハードコードせず、このテーブルで管理する。クリックで新しいタブを
-- 開くだけの単純なリンクであり、API連携は一切行わない。
--
-- GRANTを最初から明示的に付与する(migration 030の教訓: RLSポリシー
-- の条件式自体が正しくても、テーブルへの基礎的なSQL権限(GRANT)が
-- 無ければRLS以前に42501 insufficient_privilegeで拒否される。clients
-- で実際に発生し原因特定に時間を要したため、新規テーブルでは同じ
-- 事故を繰り返さないよう最初から明示する)。
--
-- 書き込み権限はdepartments/business_units/companies等(migration 027)
-- と同じ新RBAC慣習(can_write_module('hotel_management')、
-- system_admin/ceoは常時許可)を流用し、新しい権限ロジックを増やさない。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.external_links (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  url         TEXT,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id)
);

CREATE OR REPLACE TRIGGER trg_external_links_updated_at
  BEFORE UPDATE ON public.external_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.external_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.external_links TO authenticated;

-- 全社員が閲覧可(ダッシュボードのクイックアクセスはロール問わず
-- 全員に表示するため)。
DROP POLICY IF EXISTS "external_links_select_all" ON public.external_links;
CREATE POLICY "external_links_select_all"
  ON public.external_links FOR SELECT
  TO authenticated
  USING (true);

-- 追加・編集は管理者のみ(「外部サービス設定」画面経由)。clients bug
-- の反省から、USING/WITH CHECKを両方明示する(29/030で確立した慣習)。
DROP POLICY IF EXISTS "external_links_insert_admin" ON public.external_links;
CREATE POLICY "external_links_insert_admin"
  ON public.external_links FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_module('hotel_management'));

DROP POLICY IF EXISTS "external_links_update_admin" ON public.external_links;
CREATE POLICY "external_links_update_admin"
  ON public.external_links FOR UPDATE
  TO authenticated
  USING (public.can_write_module('hotel_management'))
  WITH CHECK (public.can_write_module('hotel_management'));

-- 初期登録(URLは空、管理者が「外部サービス設定」から入力する)。
-- is_visible=TRUEにして、Phase1完成の確認項目(3つのボタンが
-- ダッシュボードに表示されること)をURL未設定でも満たせるようにする
-- — 未設定時はボタン自体ではなく「URL未設定」の案内を表示する
-- (フロント側のガードで対応、本テーブル側の制約ではない)。
INSERT INTO public.external_links (key, label, url, is_visible, sort_order) VALUES
  ('dropbox',    'Dropbox',       NULL, TRUE, 1),
  ('hotelsmart', 'ホテルスマート', NULL, TRUE, 2),
  ('line',       '公式LINE',      NULL, TRUE, 3)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 025: 運用アラート(清掃未完了・朝食/夕食未提供・締め忘れ)
-- Created: 2026-07-18
--
-- サーバー側スケジューラ(pg_cron等)は、このプロジェクトでの利用
-- 実績・動作保証が無く「推測は禁止」の方針に反するため採用しない。
-- 代わりに、既にrealtime購読済みのクライアント側(PropertyHub.jsx)が
-- 現在時刻としきい値を突き合わせてアラート条件を判定する方式にした。
-- このテーブルは「今日この種類のアラートを既に通知したか」を1日1回
-- だけ記録する重複防止ログ — UNIQUE制約により、複数スタッフが同時に
-- PropertyHubを開いていても二重送信されない(INSERTが成功した1件
-- だけが実際に通知を送る)。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.operational_alerts_log (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_id   UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  alert_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, alert_type, alert_date)
);

ALTER TABLE public.operational_alerts_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operational_alerts_log_select_authenticated" ON public.operational_alerts_log;
CREATE POLICY "operational_alerts_log_select_authenticated" ON public.operational_alerts_log
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- UPDATE/DELETEポリシーは無し(night_auditsと同じ「一度記録したら
-- 訂正しない」設計)。INSERTは全認証ユーザーに許可 — 重複防止の
-- ためだけの軽量なログで、業務データそのものではない。
DROP POLICY IF EXISTS "operational_alerts_log_insert_authenticated" ON public.operational_alerts_log;
CREATE POLICY "operational_alerts_log_insert_authenticated" ON public.operational_alerts_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';

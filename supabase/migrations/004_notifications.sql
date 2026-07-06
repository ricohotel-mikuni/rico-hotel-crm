-- ============================================================
-- RICO HOTEL MIKUNI — 統合管理システム
-- Migration 004: Notifications (Hub unread badges)
-- Created: 2026-07-06
--
-- Generic per-module notification feed. Any module inserts a row
-- here whenever staff add data that needs attention or something
-- is pending approval; the Hub (統合ホーム) shows an unread-count
-- badge per module by counting is_read = false rows grouped by
-- `module`. `module` must match an id in src/modules/registry.js
-- (sales, front, payments, cashier, purchase, expenses,
-- maintenance, documents, shifts, staff).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  module     TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT DEFAULT '',
  link       TEXT DEFAULT '',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS notifications_module_idx ON public.notifications(module);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(module) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_authenticated" ON public.notifications;
CREATE POLICY "notifications_select_authenticated"
  ON public.notifications FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notifications_update_authenticated" ON public.notifications;
CREATE POLICY "notifications_update_authenticated"
  ON public.notifications FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Make sure realtime broadcasts changes so Hub badges update live
-- (no-op if the table is already covered by the publication).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'notifications already in supabase_realtime publication: %', SQLERRM;
END $$;

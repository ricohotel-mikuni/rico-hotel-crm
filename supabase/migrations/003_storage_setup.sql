-- ============================================================
-- RICO HOTEL MIKUNI — Storage Setup
-- Migration 003: client-files bucket + RLS policies
-- Used by: 営業先管理 (名刺写真 / 会社外観 / 契約書 / ホテル写真)
-- ============================================================

-- Public bucket so uploaded images/documents can be displayed
-- and downloaded directly via their public URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone signed in can view files (mirrors clients_select_authenticated)
CREATE POLICY "client_files_select_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-files' AND auth.uid() IS NOT NULL);

-- Only admin/manager/sales can upload (mirrors clients_insert_sales)
CREATE POLICY "client_files_insert_sales"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-files' AND public.can_write());

-- Only admin/manager/sales can replace a file
CREATE POLICY "client_files_update_sales"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-files' AND public.can_write());

-- Only admin/manager/sales can remove a file
CREATE POLICY "client_files_delete_sales"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-files' AND public.can_write());

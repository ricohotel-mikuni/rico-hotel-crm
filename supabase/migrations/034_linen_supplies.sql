-- ============================================================
-- 大栄商事株式会社 — 統合管理システム
-- Migration 034: リネン管理・備品管理
-- Created: 2026-10-03
--
-- 今回のご依頼「システム構成の整理」③④に基づく。添付Excel
-- 「ホテルリネン_入出庫月次在庫管理」の構成(リネンマスタ/日々の
-- 入出庫/月次在庫/担当者マスタ)を参考にする。担当者マスタは既存の
-- employeesをそのまま使う(新規マスタを作らない)。
--
-- 月次在庫(月初在庫+入庫-出庫-廃棄-破損=月末在庫)は、マスタの
-- opening_stock(期首在庫)+その月までの全トランザクションの集計で
-- 都度計算する(stored列にしない — 計算結果を別テーブルに保存すると
-- 後から値がズレて食い違う事故が起きやすいため、常にtransactionsを
-- 正とする)。発注点以下かどうかの判定もフロント側の表示で行う。
--
-- 備品は「現在庫」を直接保持する方式にする(リネンのような月次区切り
-- の管理ではなく、常に最新の在庫数が分かればよいため)。current_stock
-- はsupply_transactionsのINSERT時にトリガーで自動更新する
-- (SECURITY DEFINERトリガー関数 — 一般スタッフは入出庫を記録できるが
-- supply_items自体の直接UPDATE権限は持たないため、トリガー経由でのみ
-- current_stockが変わる設計)。
-- ============================================================

-- ── リネン管理 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linen_items (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  size             TEXT DEFAULT '',
  unit             TEXT DEFAULT '枚',
  opening_stock    INT NOT NULL DEFAULT 0,
  reorder_point    INT NOT NULL DEFAULT 0,
  storage_location TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER trg_linen_items_updated_at
  BEFORE UPDATE ON public.linen_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS public.linen_transactions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id     UUID REFERENCES public.linen_items(id) NOT NULL,
  txn_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT NOT NULL CHECK (type IN ('in', 'out', 'discard', 'damage')),
  quantity    INT NOT NULL CHECK (quantity > 0),
  employee_id UUID REFERENCES public.employees(id),
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_linen_transactions_item_date ON public.linen_transactions(item_id, txn_date);

ALTER TABLE public.linen_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linen_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.linen_items TO authenticated;
GRANT SELECT, INSERT ON public.linen_transactions TO authenticated;

DROP POLICY IF EXISTS "linen_items_select_all" ON public.linen_items;
CREATE POLICY "linen_items_select_all" ON public.linen_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "linen_items_insert_admin" ON public.linen_items;
CREATE POLICY "linen_items_insert_admin" ON public.linen_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_module('hotel_management'));
DROP POLICY IF EXISTS "linen_items_update_admin" ON public.linen_items;
CREATE POLICY "linen_items_update_admin" ON public.linen_items FOR UPDATE TO authenticated
  USING (public.can_write_module('hotel_management')) WITH CHECK (public.can_write_module('hotel_management'));

DROP POLICY IF EXISTS "linen_transactions_select_all" ON public.linen_transactions;
CREATE POLICY "linen_transactions_select_all" ON public.linen_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "linen_transactions_insert_all" ON public.linen_transactions;
CREATE POLICY "linen_transactions_insert_all" ON public.linen_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- ── 備品管理 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supply_items (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  category         TEXT DEFAULT '',
  unit             TEXT DEFAULT '個',
  current_stock    INT NOT NULL DEFAULT 0,
  reorder_point    INT NOT NULL DEFAULT 0,
  storage_location TEXT DEFAULT '',
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER trg_supply_items_updated_at
  BEFORE UPDATE ON public.supply_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS public.supply_transactions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id     UUID REFERENCES public.supply_items(id) NOT NULL,
  txn_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT NOT NULL CHECK (type IN ('in', 'out', 'discard', 'damage')),
  quantity    INT NOT NULL CHECK (quantity > 0),
  employee_id UUID REFERENCES public.employees(id),
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_supply_transactions_item_date ON public.supply_transactions(item_id, txn_date);

ALTER TABLE public.supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.supply_items TO authenticated;
GRANT SELECT, INSERT ON public.supply_transactions TO authenticated;

DROP POLICY IF EXISTS "supply_items_select_all" ON public.supply_items;
CREATE POLICY "supply_items_select_all" ON public.supply_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supply_items_insert_admin" ON public.supply_items;
CREATE POLICY "supply_items_insert_admin" ON public.supply_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_module('hotel_management'));
DROP POLICY IF EXISTS "supply_items_update_admin" ON public.supply_items;
CREATE POLICY "supply_items_update_admin" ON public.supply_items FOR UPDATE TO authenticated
  USING (public.can_write_module('hotel_management')) WITH CHECK (public.can_write_module('hotel_management'));

DROP POLICY IF EXISTS "supply_transactions_select_all" ON public.supply_transactions;
CREATE POLICY "supply_transactions_select_all" ON public.supply_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supply_transactions_insert_all" ON public.supply_transactions;
CREATE POLICY "supply_transactions_insert_all" ON public.supply_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- current_stockの自動更新(一般スタッフはsupply_items自体のUPDATE権限
-- を持たないため、SECURITY DEFINERトリガーでRLSを経由せず更新する)。
CREATE OR REPLACE FUNCTION public.apply_supply_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.supply_items
  SET current_stock = current_stock + (CASE WHEN NEW.type = 'in' THEN NEW.quantity ELSE -NEW.quantity END)
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_apply_supply_transaction
  AFTER INSERT ON public.supply_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_supply_transaction();

NOTIFY pgrst, 'reload schema';

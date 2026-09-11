/*
# Fix schema mismatches, add feedback RLS policies, add fuel_entries table

1. Schema fixes (additive only — no drops)
- day_entries: add `platforms` (jsonb), `tax_enabled` (boolean), `tax_rate` (numeric)
  + unique constraint on (user_id, date) for upsert support
- expense_entries: add `title` (text), `liters` (numeric)
- km_entries: add `km` (numeric), `note` (text)

2. RLS policies on feedback table
- 4 owner-scoped CRUD policies (select/insert/update/delete) for authenticated users

3. New table: fuel_entries
- Stores fuel purchase records (user-scoped)
- `id`, `user_id`, `date`, `amount_tl`, `liters`, `liter_price`, `km`
- RLS enabled with 4 owner-scoped CRUD policies

4. Security
- All tables have RLS enabled
- Owner-scoped CRUD: each authenticated user can only access their own rows
- user_id columns default to auth.uid() so inserts work without explicit user_id
*/

-- === day_entries: add missing columns ===
ALTER TABLE day_entries ADD COLUMN IF NOT EXISTS platforms jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE day_entries ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE day_entries ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 20;

-- Unique constraint for upsert (user_id, date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'day_entries_user_id_date_key'
  ) THEN
    ALTER TABLE day_entries ADD CONSTRAINT day_entries_user_id_date_key UNIQUE (user_id, date);
  END IF;
END $$;

-- === expense_entries: add missing columns ===
ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS liters numeric;

-- === km_entries: add missing columns ===
ALTER TABLE km_entries ADD COLUMN IF NOT EXISTS km numeric NOT NULL DEFAULT 0;
ALTER TABLE km_entries ADD COLUMN IF NOT EXISTS note text;

-- === feedback: add RLS policies ===
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_feedback" ON feedback;
CREATE POLICY "select_own_feedback" ON feedback FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_feedback" ON feedback;
CREATE POLICY "insert_own_feedback" ON feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_feedback" ON feedback;
CREATE POLICY "update_own_feedback" ON feedback FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_feedback" ON feedback;
CREATE POLICY "delete_own_feedback" ON feedback FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === fuel_entries: new table ===
CREATE TABLE IF NOT EXISTS fuel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount_tl numeric NOT NULL DEFAULT 0,
  liters numeric,
  liter_price numeric,
  km numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_fuel" ON fuel_entries;
CREATE POLICY "select_own_fuel" ON fuel_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_fuel" ON fuel_entries;
CREATE POLICY "insert_own_fuel" ON fuel_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_fuel" ON fuel_entries;
CREATE POLICY "update_own_fuel" ON fuel_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_fuel" ON fuel_entries;
CREATE POLICY "delete_own_fuel" ON fuel_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fuel_entries_user_date ON fuel_entries(user_id, date);

/*
# Create user data tables for Kurye Defteri

1. New Tables
- `day_entries`: Stores daily earnings per platform (user-scoped)
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
  - `date` (date, not null)
  - `platforms` (jsonb, platform earnings data)
  - `tax_enabled` (boolean, default false)
  - `tax_rate` (numeric, default 20)
  - `hours_worked` (numeric, default 8)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, date)

- `expense_entries`: Stores expense records including fuel (user-scoped)
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
  - `date` (date, not null)
  - `title` (text, not null)
  - `amount` (numeric, not null)
  - `category` (text, not null)
  - `liters` (numeric, nullable)
  - `created_at` (timestamptz)

- `km_entries`: Stores daily KM tracking entries (user-scoped)
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
  - `date` (date, not null)
  - `km` (numeric, not null)
  - `note` (text, nullable)
  - `created_at` (timestamptz)

2. Security
- RLS enabled on all tables.
- Owner-scoped CRUD: each authenticated user can only access their own rows.
- All user_id columns default to auth.uid() so inserts work without explicit user_id.
*/

-- Day entries table
CREATE TABLE IF NOT EXISTS day_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  platforms jsonb NOT NULL DEFAULT '{}'::jsonb,
  tax_enabled boolean NOT NULL DEFAULT false,
  tax_rate numeric NOT NULL DEFAULT 20,
  hours_worked numeric NOT NULL DEFAULT 8,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE day_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_day_entries" ON day_entries;
CREATE POLICY "select_own_day_entries" ON day_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_day_entries" ON day_entries;
CREATE POLICY "insert_own_day_entries" ON day_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_day_entries" ON day_entries;
CREATE POLICY "update_own_day_entries" ON day_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_day_entries" ON day_entries;
CREATE POLICY "delete_own_day_entries" ON day_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Expense entries table
CREATE TABLE IF NOT EXISTS expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  liters numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expenses" ON expense_entries;
CREATE POLICY "select_own_expenses" ON expense_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expenses" ON expense_entries;
CREATE POLICY "insert_own_expenses" ON expense_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expenses" ON expense_entries;
CREATE POLICY "update_own_expenses" ON expense_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expenses" ON expense_entries;
CREATE POLICY "delete_own_expenses" ON expense_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- KM entries table
CREATE TABLE IF NOT EXISTS km_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  km numeric NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE km_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_km" ON km_entries;
CREATE POLICY "select_own_km" ON km_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_km" ON km_entries;
CREATE POLICY "insert_own_km" ON km_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_km" ON km_entries;
CREATE POLICY "update_own_km" ON km_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_km" ON km_entries;
CREATE POLICY "delete_own_km" ON km_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_day_entries_user_date ON day_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expense_entries_user_date ON expense_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_km_entries_user_date ON km_entries(user_id, date);

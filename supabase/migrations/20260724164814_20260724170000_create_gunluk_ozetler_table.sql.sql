/*
# Create gunluk_ozetler table — single-table architecture for Kurye Defteri

1. New Table
- `gunluk_ozetler`: Stores daily summary records (user-scoped)
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
  - `tarih` (date, not null) — the date this summary covers
  - `calisma_saati` (numeric, default 0) — hours worked
  - `teslimat_sayisi` (integer, default 0) — total deliveries
  - `brut_kazanc` (numeric, default 0) — gross earnings
  - `bahsis` (numeric, default 0) — tips
  - `toplam_gider` (numeric, default 0) — total expenses (fuel, food, fines, etc.)
  - `net_kazanc` (numeric, default 0) — brut_kazanc + bahsis - toplam_gider
  - `baslangic_km` (numeric, nullable) — starting odometer
  - `bitis_km` (numeric, nullable) — ending odometer
  - `toplam_km` (numeric, default 0) — bitis_km - baslangic_km
  - `gider_detaylari` (jsonb, default '{}') — expense breakdown as JSON (yakit, yemek, ceza, etc.)
  - `notlar` (text, nullable) — free-text notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (user_id, tarih) for UPSERT support

2. Security
- RLS enabled on gunluk_ozetler.
- Owner-scoped CRUD: each authenticated user can only access their own rows.
- user_id defaults to auth.uid() so inserts work without explicit user_id.
*/

CREATE TABLE IF NOT EXISTS gunluk_ozetler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tarih date NOT NULL,
  calisma_saati numeric NOT NULL DEFAULT 0,
  teslimat_sayisi integer NOT NULL DEFAULT 0,
  brut_kazanc numeric NOT NULL DEFAULT 0,
  bahsis numeric NOT NULL DEFAULT 0,
  toplam_gider numeric NOT NULL DEFAULT 0,
  net_kazanc numeric NOT NULL DEFAULT 0,
  baslangic_km numeric,
  bitis_km numeric,
  toplam_km numeric NOT NULL DEFAULT 0,
  gider_detaylari jsonb NOT NULL DEFAULT '{}'::jsonb,
  notlar text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tarih)
);

ALTER TABLE gunluk_ozetler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ozetler" ON gunluk_ozetler;
CREATE POLICY "select_own_ozetler" ON gunluk_ozetler FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ozetler" ON gunluk_ozetler;
CREATE POLICY "insert_own_ozetler" ON gunluk_ozetler FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ozetler" ON gunluk_ozetler;
CREATE POLICY "update_own_ozetler" ON gunluk_ozetler FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ozetler" ON gunluk_ozetler;
CREATE POLICY "delete_own_ozetler" ON gunluk_ozetler FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gunluk_ozetler_user_tarih ON gunluk_ozetler(user_id, tarih);

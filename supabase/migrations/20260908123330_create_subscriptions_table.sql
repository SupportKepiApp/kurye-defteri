/*
# Create subscriptions table

1. New Tables
- `subscriptions`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `user_id` (uuid, references auth.users(id) ON DELETE CASCADE)
  - `email` (text)
  - `plan_type` (text — 'trial', 'monthly' / '30_gun', 'yearly' / '365_gun')
  - `expires_at` (timestamptz — subscription expiry date)
  - `created_at` (timestamptz, default now())
2. Security
- RLS enabled on `subscriptions`.
- Owner-scoped CRUD: each authenticated user can only access their own subscription row.
- Unique constraint on `user_id` to ensure one subscription per user (enables upsert).
3. Indexes
- Index on `user_id` for fast lookups.
- Index on `email` for billing sync lookups.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  plan_type text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON subscriptions (email);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscriptions" ON subscriptions;
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscriptions" ON subscriptions;
CREATE POLICY "delete_own_subscriptions" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add platformlar and vergi columns to gunluk_ozetler if they don't exist
ALTER TABLE gunluk_ozetler
  ADD COLUMN IF NOT EXISTS platformlar jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vergi_aktif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vergi_orani numeric NOT NULL DEFAULT 20;

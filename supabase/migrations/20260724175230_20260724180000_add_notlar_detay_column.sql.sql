-- Add notlar_detay column to store per-category notes (e.g. motor arıza adı)
ALTER TABLE gunluk_ozetler
  ADD COLUMN IF NOT EXISTS notlar_detay jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Engagement Desk Schema Additions
-- Run this in Supabase Studio > SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DO blocks)

-- ─── Add missing columns to engagement_categories ────────────────────────────
ALTER TABLE engagement_categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS points_value INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── Add missing columns to engagement_submissions ───────────────────────────
ALTER TABLE engagement_submissions
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── Add missing columns to engagement_activity_log ─────────────────────────
ALTER TABLE engagement_activity_log
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── Add missing columns to engagement_config ────────────────────────────────
ALTER TABLE engagement_config
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── Seed default config values (idempotent via ON CONFLICT) ─────────────────
INSERT INTO engagement_config (config_key, config_value)
VALUES
  ('default_daily_target', '10'),
  ('submission_expiry_hours', '24'),
  ('max_file_size_mb', '10'),
  ('allowed_resubmits', '0')
ON CONFLICT (config_key) DO NOTHING;

-- ─── Refresh PostgREST schema cache (forces FK relationships to be recognized) ─
-- This is done automatically by Supabase after schema changes.
-- If FK joins still fail after running this, go to:
-- Supabase Dashboard > Database > Extensions > pg_reload_conf > "Reload Schema"
-- Or run: NOTIFY pgrst, 'reload schema';

NOTIFY pgrst, 'reload schema';

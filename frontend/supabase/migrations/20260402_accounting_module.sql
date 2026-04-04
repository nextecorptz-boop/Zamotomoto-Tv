-- ══════════════════════════════════════════════════════════════
-- ZAMOTOMOTO TV — Accounting Module Migration
-- Run this ENTIRE script in: Supabase Studio → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- 1. Auto-increment sequence for reference codes
CREATE SEQUENCE IF NOT EXISTS acc_seq START 1;

-- 2. Categories table
CREATE TABLE IF NOT EXISTS accounting_categories (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL UNIQUE,
  type         TEXT    NOT NULL CHECK (type IN ('expense','asset','payroll','subscription','per_diem','operational','revenue')),
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Entries table
CREATE TABLE IF NOT EXISTS accounting_entries (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT         NOT NULL UNIQUE DEFAULT ('ACC-' || LPAD(nextval('acc_seq')::TEXT, 4, '0')),
  title          TEXT         NOT NULL,
  description    TEXT,
  amount         NUMERIC(12,2) NOT NULL,
  currency       TEXT         NOT NULL DEFAULT 'TZS',
  category_id    UUID         REFERENCES accounting_categories(id),
  entry_type     TEXT         NOT NULL CHECK (entry_type IN ('debit','credit')),
  status         TEXT         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by   UUID         REFERENCES profiles(id) NOT NULL,
  reviewed_by    UUID         REFERENCES profiles(id),
  review_note    TEXT,
  entry_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- 4. Documents table
CREATE TABLE IF NOT EXISTS accounting_documents (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id         UUID    REFERENCES accounting_entries(id) ON DELETE CASCADE,
  file_name        TEXT    NOT NULL,
  storage_key      TEXT    NOT NULL,
  mime_type        TEXT    NOT NULL,
  file_size_bytes  BIGINT,
  uploaded_by      UUID    REFERENCES profiles(id) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_accounting_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounting_entries_updated_at ON accounting_entries;
CREATE TRIGGER trg_accounting_entries_updated_at
  BEFORE UPDATE ON accounting_entries
  FOR EACH ROW EXECUTE FUNCTION update_accounting_entries_updated_at();

-- 6. Enable RLS on all accounting tables
ALTER TABLE accounting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_documents  ENABLE ROW LEVEL SECURITY;

-- 7. Role helper function (SECURITY DEFINER avoids recursion)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 8. RLS Policies — Categories
DROP POLICY IF EXISTS "categories_read_all"    ON accounting_categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON accounting_categories;
CREATE POLICY "categories_read_all"     ON accounting_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_admin_insert" ON accounting_categories FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin','admin'));

-- 9. RLS Policies — Entries
DROP POLICY IF EXISTS "entries_read"         ON accounting_entries;
DROP POLICY IF EXISTS "entries_insert"       ON accounting_entries;
DROP POLICY IF EXISTS "entries_update_admin" ON accounting_entries;
CREATE POLICY "entries_read"         ON accounting_entries FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin','admin','accountant'));
CREATE POLICY "entries_insert"       ON accounting_entries FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'accountant' AND submitted_by = auth.uid());
CREATE POLICY "entries_update_admin" ON accounting_entries FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin','admin'))
  WITH CHECK (get_my_role() IN ('super_admin','admin'));

-- 10. RLS Policies — Documents
DROP POLICY IF EXISTS "documents_read"   ON accounting_documents;
DROP POLICY IF EXISTS "documents_insert" ON accounting_documents;
CREATE POLICY "documents_read"   ON accounting_documents FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin','admin','accountant'));
CREATE POLICY "documents_insert" ON accounting_documents FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'accountant' AND uploaded_by = auth.uid());

-- 11. Seed default categories
INSERT INTO accounting_categories (name, type) VALUES
  ('Worker Payment',        'payroll'),
  ('Travel Per Diem',       'per_diem'),
  ('Software Subscription', 'subscription'),
  ('Equipment Purchase',    'asset'),
  ('Office Supplies',       'expense'),
  ('Internet / Utilities',  'operational'),
  ('Studio Rental',         'operational'),
  ('Freelancer Payment',    'payroll'),
  ('Advertising Spend',     'expense'),
  ('Miscellaneous',         'expense')
ON CONFLICT (name) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- STEP A: Add 'accountant' to the profiles role constraint
-- Run ONLY ONE of the two options below based on your schema:
-- ══════════════════════════════════════════════════════════════

-- Option 1: If role is TEXT with a CHECK constraint:
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','admin','worker_standard','worker_isolated','accountant'));

-- Option 2: If role is a PostgreSQL ENUM type:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';

-- ══════════════════════════════════════════════════════════════
-- STEP B: Storage bucket (do this in Supabase Dashboard → Storage)
-- Create bucket named: accounting-docs
-- Settings: Public=false, Max size=52428800 (50MB)
-- Then run these storage RLS policies:
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "accountant_upload"    ON storage.objects;
DROP POLICY IF EXISTS "accounting_docs_read" ON storage.objects;

CREATE POLICY "accountant_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounting-docs' AND get_my_role() IN ('super_admin','admin','accountant'));

CREATE POLICY "accounting_docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accounting-docs' AND get_my_role() IN ('super_admin','admin','accountant'));

-- ══════════════════════════════════════════════════════════════
-- STEP C: Seed test accountant user (run after pgcrypto enabled)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ══════════════════════════════════════════════════════════════

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role
)
SELECT
  gen_random_uuid(),
  'accountant@zamototomotv.com',
  crypt('AccountantPass123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false, 'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'accountant@zamototomotv.com'
);

INSERT INTO profiles (id, full_name, role, is_active)
SELECT u.id, 'ZTV Accountant', 'accountant', true
FROM auth.users u
WHERE u.email = 'accountant@zamototomotv.com'
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

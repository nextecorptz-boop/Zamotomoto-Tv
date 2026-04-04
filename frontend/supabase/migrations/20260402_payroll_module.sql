-- ══════════════════════════════════════════════════════════════
-- ZAMOTOMOTO TV — Payroll Module Migration
-- Run this ENTIRE script in: Supabase Studio → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- 1. Sequence for PR reference codes
CREATE SEQUENCE IF NOT EXISTS public.payroll_seq START 1;

-- 2. Payroll entries table
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_ref         TEXT           NOT NULL UNIQUE,
  employee_id    UUID           REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_name  TEXT           NOT NULL,
  department     TEXT           NOT NULL,
  role_title     TEXT,
  gross_amount   NUMERIC(12,2)  NOT NULL,
  deductions     NUMERIC(12,2)  DEFAULT 0,
  net_amount     NUMERIC(12,2)  NOT NULL,
  status         TEXT           NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  payment_month  DATE           NOT NULL,
  payment_date   DATE,
  reject_reason  TEXT,
  notes          TEXT,
  created_by     UUID           NOT NULL REFERENCES public.profiles(id),
  approved_by    UUID           REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Set DEFAULT for pr_ref using sequence
ALTER TABLE public.payroll_entries
  ALTER COLUMN pr_ref SET DEFAULT ('PR-' || LPAD(nextval('payroll_seq')::TEXT, 4, '0'));

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_month      ON public.payroll_entries(payment_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status     ON public.payroll_entries(status);
CREATE INDEX IF NOT EXISTS idx_payroll_department ON public.payroll_entries(department);
CREATE INDEX IF NOT EXISTS idx_payroll_employee   ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_created_by ON public.payroll_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_approved_by ON public.payroll_entries(approved_by);

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_updated_at ON public.payroll_entries;
CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION update_payroll_updated_at();

-- 5. Enable RLS
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- 6. Reuse existing get_my_role() or create it
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. RLS Policies
DROP POLICY IF EXISTS "payroll_admin_all"           ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_accountant_insert"   ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_accountant_select"   ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_accountant_update"   ON public.payroll_entries;

-- Admins: full access
CREATE POLICY payroll_admin_all
  ON public.payroll_entries FOR ALL TO authenticated
  USING (get_my_role() IN ('super_admin','admin'))
  WITH CHECK (get_my_role() IN ('super_admin','admin'));

-- Accountants: can insert their own entries
CREATE POLICY payroll_accountant_insert
  ON public.payroll_entries FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'accountant' AND created_by = auth.uid());

-- Accountants: can read all payroll entries
CREATE POLICY payroll_accountant_select
  ON public.payroll_entries FOR SELECT TO authenticated
  USING (get_my_role() = 'accountant');

-- Accountants: can update their own pending entries
CREATE POLICY payroll_accountant_update
  ON public.payroll_entries FOR UPDATE TO authenticated
  USING (get_my_role() = 'accountant' AND created_by = auth.uid() AND status = 'pending')
  WITH CHECK (get_my_role() = 'accountant' AND created_by = auth.uid());

-- 8. Verification
SELECT
  'payroll_entries' AS table_name,
  COUNT(*) AS record_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'payroll_entries') AS policy_count
FROM public.payroll_entries;
-- Expected: payroll_entries | 0 | 4

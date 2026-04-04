-- ════════════════════════════════════════════════════════════════════════════
-- PAYROLL MODULE — ZamotoMoto TV
-- Migration: 20260402_payroll_module.sql
-- Safe to run: All CREATE IF NOT EXISTS, fully idempotent
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Step 1: Create Sequence ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.payroll_seq START 1;

-- ─── Step 2: Create Payroll Entries Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_ref         text           NOT NULL UNIQUE,
  employee_id    uuid           REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_name  text           NOT NULL,
  department     text           NOT NULL,
  role_title     text,
  gross_amount   numeric(12,2)  NOT NULL,
  deductions     numeric(12,2)  DEFAULT 0,
  net_amount     numeric(12,2)  NOT NULL,
  status         text           NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  payment_month  date           NOT NULL,
  payment_date   date,
  reject_reason  text,
  notes          text,
  created_by     uuid           NOT NULL REFERENCES public.profiles(id),
  approved_by    uuid           REFERENCES public.profiles(id),
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

-- ─── Step 3: Add DEFAULT for pr_ref (safe to run multiple times) ─────────
ALTER TABLE public.payroll_entries
  ALTER COLUMN pr_ref SET DEFAULT ('PR-' || LPAD(nextval('payroll_seq')::text, 4, '0'));

-- ─── Step 4: Create Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payroll_month       ON public.payroll_entries(payment_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status      ON public.payroll_entries(status);
CREATE INDEX IF NOT EXISTS idx_payroll_department  ON public.payroll_entries(department);
CREATE INDEX IF NOT EXISTS idx_payroll_employee    ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_created_by  ON public.payroll_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_approved_by ON public.payroll_entries(approved_by);

-- ─── Step 5: Create Updated_at Trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_updated_at ON public.payroll_entries;
CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION update_payroll_updated_at();

-- ─── Step 6: Enable Row-Level Security ────────────────────────────────────
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- ─── Step 7: Ensure get_my_role() exists ─────────────────────────────────
-- (Should already exist from accounting module, recreating is safe)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── Step 8: Create RLS Policies (5 total) ───────────────────────────────

-- Policy 1: Admin full access (all operations)
DROP POLICY IF EXISTS "payroll_admin_all" ON public.payroll_entries;
CREATE POLICY payroll_admin_all
  ON public.payroll_entries FOR ALL TO authenticated
  USING   (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

-- Policy 2: Accountant can INSERT their own entries
DROP POLICY IF EXISTS "payroll_accountant_insert" ON public.payroll_entries;
CREATE POLICY payroll_accountant_insert
  ON public.payroll_entries FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'accountant' AND created_by = auth.uid());

-- Policy 3: Accountant can SELECT all entries they created
DROP POLICY IF EXISTS "payroll_accountant_select" ON public.payroll_entries;
CREATE POLICY payroll_accountant_select
  ON public.payroll_entries FOR SELECT TO authenticated
  USING (get_my_role() = 'accountant');

-- Policy 4: Accountant can UPDATE their own PENDING entries
DROP POLICY IF EXISTS "payroll_accountant_update" ON public.payroll_entries;
CREATE POLICY payroll_accountant_update
  ON public.payroll_entries FOR UPDATE TO authenticated
  USING   (get_my_role() = 'accountant' AND created_by = auth.uid() AND status = 'pending')
  WITH CHECK (get_my_role() = 'accountant' AND created_by = auth.uid());

-- Policy 5: Accountant can DELETE their own PENDING entries (CRITICAL FIX)
DROP POLICY IF EXISTS "payroll_accountant_delete" ON public.payroll_entries;
CREATE POLICY payroll_accountant_delete
  ON public.payroll_entries FOR DELETE TO authenticated
  USING (get_my_role() = 'accountant' AND created_by = auth.uid() AND status = 'pending');

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run these queries after the above to confirm success)
-- ════════════════════════════════════════════════════════════════════════════

-- Should return 5 policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'payroll_entries' ORDER BY policyname;
-- Expected: payroll_accountant_delete, payroll_accountant_insert, payroll_accountant_select,
--           payroll_accountant_update, payroll_admin_all

-- Should return table info
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'payroll_entries';
-- Expected: payroll_entries | t (RLS enabled)

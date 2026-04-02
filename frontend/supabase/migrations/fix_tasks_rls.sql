-- ============================================================================
-- ZAMOTOMOTO TV — Fix Recursive RLS Policies on tasks table
-- Generated: 2026-04-02
--
-- PROBLEM: The existing SELECT policy on tasks references the tasks table
--          itself inside its USING clause, causing PostgreSQL error 42P17:
--          "infinite recursion detected in policy for relation tasks"
--
-- HOW TO APPLY:
--   1. Open Supabase Studio → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. Verify the final SELECT shows only 5 safe policies
--
-- SAFE POLICY RULES (enforced below):
--   - Use auth.uid() directly against column values
--   - JOIN only to OTHER tables (e.g. profiles) — NEVER back to tasks
--   - No EXISTS / IN subqueries that reference tasks itself
-- ============================================================================

-- ─── Step 1: Drop ALL existing policies on tasks ──────────────────────────────
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'tasks' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', rec.policyname);
    RAISE NOTICE 'Dropped policy: %', rec.policyname;
  END LOOP;
END $$;

-- ─── Step 2: Ensure RLS is enabled ───────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ─── Step 3: Create safe, non-recursive policies ──────────────────────────────

-- POLICY 1: Super admins and admins get full access (SELECT/INSERT/UPDATE/DELETE)
-- is_admin_or_above() is SAFE — it queries profiles, not tasks
CREATE POLICY "tasks_admin_all"
ON public.tasks
FOR ALL
TO authenticated
USING (
  is_admin_or_above()
)
WITH CHECK (
  is_admin_or_above()
);

-- POLICY 2: Standard workers can read all tasks
-- SAFE: only references profiles table, no self-reference
CREATE POLICY "tasks_worker_standard_select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'worker_standard'
  )
);

-- POLICY 3: Standard workers can create tasks they own
-- SAFE: uses auth.uid() directly + references profiles
CREATE POLICY "tasks_worker_standard_insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'worker_standard'
  )
);

-- POLICY 4: Workers can update tasks assigned to or created by them
-- SAFE: uses auth.uid() directly against columns — no subqueries
CREATE POLICY "tasks_worker_update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
);

-- POLICY 5: Isolated workers can only see tasks they own or are assigned to
-- SAFE: uses auth.uid() directly against columns + references profiles
CREATE POLICY "tasks_worker_isolated_select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  (assigned_to = auth.uid() OR created_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'worker_isolated'
  )
);

-- ─── Step 4: Verify — should show exactly 5 rows, none referencing tasks ─────
SELECT
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS check_clause
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;

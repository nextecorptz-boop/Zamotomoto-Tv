'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ─── Service-role client ──────────────────────────────────────────────────────
function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── Authenticated user + role ────────────────────────────────────────────────
async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()
  return profile
    ? { id: profile.id as string, role: profile.role as string, full_name: profile.full_name as string }
    : null
}

// ─── Payroll-eligible roles ───────────────────────────────────────────────────
const PAYROLL_ELIGIBLE_ROLES = ['worker_standard', 'worker_isolated', 'accountant'] as const

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SalaryRecord {
  id: string
  employee_id: string
  gross_salary: number
  effective_from: string
  effective_to: string | null
  set_by: string
  notes: string | null
  created_at: string
}

export interface EmployeeWithSalary {
  id: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
  salary: SalaryRecord | null  // null = no salary record set
}

export interface SalaryCompletionStatus {
  complete: boolean
  missing: EmployeeWithSalary[]
  total_eligible: number
  total_with_salary: number
}

// ─── 1. Get all eligible active employees with their current salary record ────
export async function getSalaryRecords(): Promise<EmployeeWithSalary[]> {
  const me = await getCurrentUser()
  if (!me) return []
  if (!['super_admin', 'admin', 'accountant'].includes(me.role)) return []

  const admin = adminClient()

  // Fetch all payroll-eligible active employees
  const { data: employees, error: empErr } = await admin
    .from('profiles')
    .select('id, full_name, role, department, is_active')
    .in('role', PAYROLL_ELIGIBLE_ROLES)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (empErr || !employees) {
    console.error('[getSalaryRecords] employees:', empErr?.message)
    return []
  }

  if (employees.length === 0) return []

  // Fetch active salary records for these employees
  const employeeIds = employees.map(e => e.id)
  const { data: salaries, error: salErr } = await admin
    .from('salary_records')
    .select('*')
    .in('employee_id', employeeIds)
    .is('effective_to', null)

  if (salErr) {
    console.error('[getSalaryRecords] salaries:', salErr.message)
  }

  const salaryMap = new Map<string, SalaryRecord>()
  for (const s of (salaries ?? [])) {
    salaryMap.set(s.employee_id, s as SalaryRecord)
  }

  return employees.map(emp => ({
    id: emp.id,
    full_name: emp.full_name,
    role: emp.role,
    department: emp.department,
    is_active: emp.is_active,
    salary: salaryMap.get(emp.id) ?? null,
  }))
}

// ─── 2. Check if all eligible employees have a salary record ─────────────────
// Used as the blocking gate before opening a payroll month
export async function getSalaryCompletionStatus(): Promise<SalaryCompletionStatus> {
  const records = await getSalaryRecords()
  const missing = records.filter(r => r.salary === null)
  return {
    complete: missing.length === 0,
    missing,
    total_eligible: records.length,
    total_with_salary: records.length - missing.length,
  }
}

// ─── 3. Set salary record — admin/super_admin only ────────────────────────────
// If employee already has an active record: sets effective_to = today on old,
// inserts new record. Idempotent on retry.
export async function setSalaryRecord(
  employee_id: string,
  gross_salary: number,
  effective_from: string,
  notes?: string
): Promise<{ success: true; record_id: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'super_admin' && me.role !== 'admin') {
    return { success: false, error: 'Only admins can set salary records' }
  }
  if (!employee_id || !gross_salary || !effective_from) {
    return { success: false, error: 'employee_id, gross_salary, and effective_from are required' }
  }
  if (gross_salary <= 0) {
    return { success: false, error: 'Gross salary must be greater than 0' }
  }

  const admin = adminClient()

  // Verify employee is payroll-eligible
  const { data: emp } = await admin
    .from('profiles')
    .select('id, role, is_active, full_name')
    .eq('id', employee_id)
    .single()

  if (!emp) return { success: false, error: 'Employee not found' }
  if (!PAYROLL_ELIGIBLE_ROLES.includes(emp.role as typeof PAYROLL_ELIGIBLE_ROLES[number])) {
    return { success: false, error: `Role '${emp.role}' is not payroll-eligible` }
  }
  if (!emp.is_active) {
    return { success: false, error: 'Cannot set salary for inactive employee' }
  }

  // Close existing active record if one exists
  const today = new Date().toISOString().split('T')[0]
  const { data: existingRecords } = await admin
    .from('salary_records')
    .select('id')
    .eq('employee_id', employee_id)
    .is('effective_to', null)

  if (existingRecords && existingRecords.length > 0) {
    const ids = existingRecords.map(r => r.id)
    const { error: closeErr } = await admin
      .from('salary_records')
      .update({ effective_to: today })
      .in('id', ids)

    if (closeErr) {
      return { success: false, error: `Failed to close existing salary record: ${closeErr.message}` }
    }
  }

  // Insert new active record
  const { data: newRecord, error: insertErr } = await admin
    .from('salary_records')
    .insert({
      employee_id,
      gross_salary,
      effective_from,
      effective_to: null,
      set_by: me.id,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single()

  if (insertErr || !newRecord) {
    return { success: false, error: insertErr?.message ?? 'Failed to insert salary record' }
  }

  // Log to activity_log
  try {
    await admin.from('activity_log').insert({
      action: 'user_invited',
      user_id: me.id,
      metadata: {
        action_type: 'salary_record_set',
        employee_id,
        employee_name: emp.full_name,
        gross_salary,
        effective_from,
        set_by: me.full_name,
        record_id: newRecord.id,
      },
    })
  } catch { /* safe-fail */ }

  return { success: true, record_id: newRecord.id as string }
}

// ─── 4. Get salary history for a single employee ─────────────────────────────
export async function getEmployeeSalaryHistory(employee_id: string): Promise<SalaryRecord[]> {
  const me = await getCurrentUser()
  if (!me) return []
  if (!['super_admin', 'admin', 'accountant'].includes(me.role)) return []

  const admin = adminClient()
  const { data, error } = await admin
    .from('salary_records')
    .select('*')
    .eq('employee_id', employee_id)
    .order('effective_from', { ascending: false })

  if (error) { console.error('[getEmployeeSalaryHistory]', error.message); return [] }
  return (data ?? []) as SalaryRecord[]
}

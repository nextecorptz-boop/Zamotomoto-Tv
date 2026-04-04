'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { PayrollEntry, PayrollStatus } from '@/types'

// ─── Service-role client (bypasses RLS for admin reads/writes) ────────────────
function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── Get current authenticated user + role ───────────────────────────────────
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

// ─── 1. Get all payroll entries (admin only) ─────────────────────────────────
export interface PayrollFilters {
  status?: PayrollStatus | 'all'
  department?: string
  month_from?: string
  month_to?: string
}

export async function getPayrollEntries(filters?: PayrollFilters): Promise<PayrollEntry[]> {
  const me = await getCurrentUser()
  if (!me || (me.role !== 'super_admin' && me.role !== 'admin')) return []

  const admin = adminClient()
  let q = admin
    .from('payroll_entries')
    .select(`
      *,
      employee:employee_id(full_name),
      creator:created_by(full_name),
      approver:approved_by(full_name)
    `)
    .order('payment_month', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters?.department) q = q.eq('department', filters.department)
  if (filters?.month_from) q = q.gte('payment_month', filters.month_from)
  if (filters?.month_to)   q = q.lte('payment_month', filters.month_to)

  const { data, error } = await q
  if (error) { console.error('[getPayrollEntries]', error.message); return [] }
  return (data ?? []) as unknown as PayrollEntry[]
}

// ─── 2. Get payroll entries for current accountant ────────────────────────────
export async function getMyPayrollEntries(): Promise<PayrollEntry[]> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'accountant') return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payroll_entries')
    .select(`
      *,
      employee:employee_id(full_name),
      creator:created_by(full_name),
      approver:approved_by(full_name)
    `)
    .eq('created_by', me.id)
    .order('payment_month', { ascending: false })

  if (error) { console.error('[getMyPayrollEntries]', error.message); return [] }
  return (data ?? []) as unknown as PayrollEntry[]
}

// ─── 3. Create payroll entry (accountant only) ────────────────────────────────
export interface CreatePayrollData {
  employee_name: string
  department: string
  role_title?: string
  gross_amount: number
  deductions?: number
  payment_month: string   // format: YYYY-MM-DD (first of month)
  notes?: string
  employee_id?: string
}

export async function createPayrollEntry(
  data: CreatePayrollData
): Promise<{ success: true; entry_id: string; pr_ref: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can create payroll entries' }

  const supabase = await createClient()
  const net = (data.gross_amount || 0) - (data.deductions || 0)

  const { data: row, error } = await supabase
    .from('payroll_entries')
    .insert({
      employee_id:   data.employee_id || null,
      employee_name: data.employee_name.trim(),
      department:    data.department.trim(),
      role_title:    data.role_title?.trim() || null,
      gross_amount:  data.gross_amount,
      deductions:    data.deductions || 0,
      net_amount:    net,
      payment_month: data.payment_month,
      notes:         data.notes?.trim() || null,
      created_by:    me.id,
      status:        'pending',
    })
    .select('id, pr_ref')
    .single()

  if (error) return { success: false, error: error.message }

  // Log activity (safe-fail)
  try {
    await supabase.from('activity_log').insert({
      action: 'payroll_entry_created',
      user_id: me.id,
      metadata: {
        entity_type: 'payroll_entry',
        entity_id: row!.id,
        pr_ref: row!.pr_ref,
        description: `Payroll entry ${row!.pr_ref} created for ${data.employee_name}`,
      },
    })
  } catch { /* ignore */ }

  return { success: true, entry_id: row!.id as string, pr_ref: row!.pr_ref as string }
}

// ─── 4. Approve / reject payroll entry (admin only) ───────────────────────────
export async function approvePayrollEntry(
  entry_id: string,
  decision: 'approved' | 'rejected',
  reject_reason?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'super_admin' && me.role !== 'admin') return { success: false, error: 'Only admins can approve payroll entries' }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('payroll_entries')
    .update({
      status:        decision,
      approved_by:   me.id,
      reject_reason: decision === 'rejected' ? (reject_reason?.trim() || null) : null,
    })
    .eq('id', entry_id)
    .select('pr_ref')
    .single()

  if (error) return { success: false, error: error.message }

  try {
    await admin.from('activity_log').insert({
      action: 'payroll_entry_reviewed',
      user_id: me.id,
      metadata: {
        entity_type: 'payroll_entry',
        entity_id: entry_id,
        pr_ref: row?.pr_ref,
        decision,
        description: `Payroll entry ${row?.pr_ref} ${decision} by ${me.full_name}`,
      },
    })
  } catch { /* ignore */ }

  return { success: true }
}

// ─── 5. Mark payroll as paid (admin only) ─────────────────────────────────────
export async function markPayrollPaid(
  entry_id: string,
  payment_date: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me || (me.role !== 'super_admin' && me.role !== 'admin')) {
    return { success: false, error: 'Only admins can mark payroll as paid' }
  }

  const admin = adminClient()
  const { error } = await admin
    .from('payroll_entries')
    .update({ status: 'paid', payment_date })
    .eq('id', entry_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 6. Get payroll summary (admin only) ──────────────────────────────────────
export async function getPayrollSummary(month_from?: string, month_to?: string): Promise<{
  total_gross: number
  total_deductions: number
  total_net: number
  pending_count: number
  paid_count: number
  by_department: Record<string, number>
}> {
  const empty = { total_gross: 0, total_deductions: 0, total_net: 0, pending_count: 0, paid_count: 0, by_department: {} }
  const me = await getCurrentUser()
  if (!me || (me.role !== 'super_admin' && me.role !== 'admin')) return empty

  const admin = adminClient()
  let q = admin.from('payroll_entries').select('gross_amount, deductions, net_amount, status, department')
  if (month_from) q = q.gte('payment_month', month_from)
  if (month_to)   q = q.lte('payment_month', month_to)

  const { data, error } = await q
  if (error || !data) { console.error('[getPayrollSummary]', error?.message); return empty }

  const by_dept: Record<string, number> = {}
  let total_gross = 0, total_deductions = 0, total_net = 0, pending = 0, paid = 0

  data.forEach(row => {
    total_gross      += Number(row.gross_amount)
    total_deductions += Number(row.deductions)
    total_net        += Number(row.net_amount)
    if (row.status === 'pending')  pending++
    if (row.status === 'paid')     paid++
    by_dept[row.department] = (by_dept[row.department] || 0) + Number(row.net_amount)
  })

  return { total_gross, total_deductions, total_net, pending_count: pending, paid_count: paid, by_department: by_dept }
}

// ─── 7. Delete payroll entry (accountant, pending only) ───────────────────────
export async function deletePayrollEntry(entry_id: string): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'accountant') return { success: false, error: 'Only accountants can delete their own entries' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('payroll_entries')
    .delete()
    .eq('id', entry_id)
    .eq('created_by', me.id)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }
  return { success: true }
}

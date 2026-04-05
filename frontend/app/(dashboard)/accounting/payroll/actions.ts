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

// ─── 1. Get all payroll entries (admin only) — reads legacy table ─────────────
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
    .from('payroll_entries_legacy')
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
  if (filters?.month_to) q = q.lte('payment_month', filters.month_to)

  const { data, error } = await q
  if (error) { console.error('[getPayrollEntries]', error.message); return [] }
  return (data ?? []) as unknown as PayrollEntry[]
}

// ─── 2. Get payroll entries for current accountant — reads legacy table ───────
export async function getMyPayrollEntries(): Promise<PayrollEntry[]> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'accountant') return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payroll_entries_legacy')
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

// ─── 3. Create payroll entry — DEPRECATED (writes blocked by RLS) ─────────────
// payroll_entries_legacy is read-only. Use new payroll workflow.
export async function createPayrollEntry(): Promise<{ success: false; error: string }> {
  return { success: false, error: 'Legacy payroll entry creation is disabled. Use the new payroll workflow.' }
}

// ─── 4. Approve / reject payroll entry (admin only) — legacy only ─────────────
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
    .from('payroll_entries_legacy')
    .update({
      status: decision,
      approved_by: me.id,
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
        entity_type: 'payroll_entry_legacy',
        entity_id: entry_id,
        pr_ref: row?.pr_ref,
        decision,
        description: `Legacy payroll entry ${row?.pr_ref} ${decision} by ${me.full_name}`,
      },
    })
  } catch { /* ignore */ }

  return { success: true }
}

// ─── 5. Mark payroll as paid (admin only) — legacy only ───────────────────────
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
    .from('payroll_entries_legacy')
    .update({ status: 'paid', payment_date })
    .eq('id', entry_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 6. PHASE A FIX: Get payroll summary with correct status-gated totals ─────
//
// BUG FIXED: Previous implementation summed net_amount across ALL statuses,
// including 'rejected'. Rejected entries must never appear in financial totals.
//
// Rules:
//   total_gross / total_net / total_deductions = approved + paid only
//   approved_total = approved only
//   paid_total     = paid only
//   pending_count  = pending only
//   rejected_total / rejected_count = audit figure, NEVER financial total
//
export async function getPayrollSummary(month_from?: string, month_to?: string): Promise<PayrollSummaryResult> {
  const empty: PayrollSummaryResult = {
    total_gross: 0, total_deductions: 0, total_net: 0,
    approved_total: 0, paid_total: 0,
    pending_count: 0, paid_count: 0,
    rejected_total: 0, rejected_count: 0,
    by_department: {},
  }

  const me = await getCurrentUser()
  if (!me || (me.role !== 'super_admin' && me.role !== 'admin' && me.role !== 'accountant')) return empty

  const admin = adminClient()
  let q = admin
    .from('payroll_entries_legacy')
    .select('gross_amount, deductions, net_amount, status, department')

  if (month_from) q = q.gte('payment_month', month_from)
  if (month_to)   q = q.lte('payment_month', month_to)

  const { data, error } = await q
  if (error || !data) { console.error('[getPayrollSummary]', error?.message); return empty }

  const by_dept: Record<string, number> = {}
  let total_gross = 0, total_deductions = 0, total_net = 0
  let approved_total = 0, paid_total = 0
  let pending = 0, paid = 0
  let rejected_total = 0, rejected_count = 0

  data.forEach(row => {
    const gross = Number(row.gross_amount)
    const deductions = Number(row.deductions)
    const net = Number(row.net_amount)

    // ONLY approved + paid count toward financial totals
    if (row.status === 'approved' || row.status === 'paid') {
      total_gross      += gross
      total_deductions += deductions
      total_net        += net
      by_dept[row.department] = (by_dept[row.department] || 0) + net
    }

    if (row.status === 'approved') { approved_total += net }
    if (row.status === 'paid')     { paid_total += net; paid++ }
    if (row.status === 'pending')  { pending++ }

    // Rejected: audit figures only — NEVER in financial totals
    if (row.status === 'rejected') { rejected_total += net; rejected_count++ }
  })

  return {
    total_gross, total_deductions, total_net,
    approved_total, paid_total,
    pending_count: pending, paid_count: paid,
    rejected_total, rejected_count,
    by_department: by_dept,
  }
}

// ─── 7. Delete payroll entry — DEPRECATED (table is read-only) ────────────────
export async function deletePayrollEntry(): Promise<{ success: false; error: string }> {
  return { success: false, error: 'Legacy payroll deletion is disabled.' }
}

// ─── Type: Updated PayrollSummaryResult with status-gated fields ──────────────
export interface PayrollSummaryResult {
  total_gross: number        // approved + paid gross only
  total_deductions: number   // approved + paid deductions only
  total_net: number          // approved + paid net only
  approved_total: number     // approved net only (committed, not yet paid)
  paid_total: number         // paid net only (finalized)
  pending_count: number      // count of pending entries
  paid_count: number         // count of paid entries
  rejected_total: number     // AUDIT ONLY — never display as financial total
  rejected_count: number     // AUDIT ONLY
  by_department: Record<string, number>  // approved + paid net by dept
}

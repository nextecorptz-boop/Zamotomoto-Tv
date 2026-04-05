'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { LineItemWithEmployee, PayrollMonthDetail } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'
import { getPayrollMonth } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

function isAdminRole(role: string) {
  return role === 'super_admin' || role === 'admin'
}

// ─── Admin totals: status-gated ───────────────────────────────────────────────
export interface AdminPayrollTotals {
  approved_total: number
  paid_total: number
  pending_total: number
  rejected_total: number   // AUDIT ONLY
  committed_total: number  // approved + paid
  pending_count: number
  approved_count: number
  paid_count: number
  rejected_count: number
  excluded_count: number
}

// ─── 1. Get submitted/active batch for admin review ───────────────────────────
export async function getActiveBatchForAdmin(): Promise<PayrollMonthDetail | null> {
  const me = await getCurrentUser()
  if (!me || !isAdminRole(me.role)) return null

  const admin = adminClient()

  const { data: month } = await admin
    .from('payroll_months')
    .select('id')
    .not('status', 'eq', 'closed')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!month) return null
  return getPayrollMonth(month.id)
}

// ─── 2. Approve line items (bulk) ─────────────────────────────────────────────
export async function approveLineItems(
  line_item_ids: string[]
): Promise<{ success: true; approved_count: number } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Only admins can approve payroll items' }
  if (!line_item_ids.length) return { success: false, error: 'No items provided' }

  const admin = adminClient()
  const now = new Date().toISOString()

  const { data: eligibleItems } = await admin
    .from('payroll_line_items')
    .select('id, status, batch_id')
    .in('id', line_item_ids)
    .in('status', ['pending', 'resubmitted'])

  if (!eligibleItems?.length) return { success: false, error: 'No eligible items to approve (must be pending or resubmitted)' }

  const eligibleIds = eligibleItems.map(i => i.id)

  const { error: updateErr } = await admin
    .from('payroll_line_items')
    .update({ status: 'approved', approved_by: me.id, approved_at: now })
    .in('id', eligibleIds)

  if (updateErr) return { success: false, error: updateErr.message }

  const events = eligibleItems.map(i => ({
    line_item_id: i.id,
    from_status: i.status,
    to_status: 'approved',
    actor_id: me.id,
    reason: null,
  }))
  await admin.from('payroll_approval_events').insert(events)

  if (eligibleItems[0]?.batch_id) {
    await recalcBatchStatus(eligibleItems[0].batch_id, me.id)
  }

  return { success: true, approved_count: eligibleIds.length }
}

// ─── 3. Reject line items (bulk) ──────────────────────────────────────────────
export async function rejectLineItems(
  line_item_ids: string[],
  rejection_reason: string
): Promise<{ success: true; rejected_count: number } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Only admins can reject payroll items' }
  if (!line_item_ids.length) return { success: false, error: 'No items provided' }
  if (!rejection_reason?.trim()) return { success: false, error: 'Rejection reason is required' }

  const admin = adminClient()
  const now = new Date().toISOString()

  const { data: eligibleItems } = await admin
    .from('payroll_line_items')
    .select('id, status, batch_id')
    .in('id', line_item_ids)
    .in('status', ['pending', 'resubmitted'])

  if (!eligibleItems?.length) return { success: false, error: 'No eligible items to reject' }

  const eligibleIds = eligibleItems.map(i => i.id)

  const { error: updateErr } = await admin
    .from('payroll_line_items')
    .update({
      status: 'rejected',
      rejection_reason: rejection_reason.trim(),
      rejected_by: me.id,
      rejected_at: now,
    })
    .in('id', eligibleIds)

  if (updateErr) return { success: false, error: updateErr.message }

  const events = eligibleItems.map(i => ({
    line_item_id: i.id,
    from_status: i.status,
    to_status: 'rejected',
    actor_id: me.id,
    reason: rejection_reason.trim(),
  }))
  await admin.from('payroll_approval_events').insert(events)

  if (eligibleItems[0]?.batch_id) {
    await recalcBatchStatus(eligibleItems[0].batch_id, me.id)
  }

  return { success: true, rejected_count: eligibleIds.length }
}

// ─── 4. Exclude a line item (terminal — admin only) ───────────────────────────
export async function excludeLineItem(
  line_item_id: string,
  reason: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Only admins can exclude line items' }
  if (!reason?.trim()) return { success: false, error: 'Reason is required for exclusion' }

  const admin = adminClient()

  const { data: item } = await admin
    .from('payroll_line_items')
    .select('id, status, batch_id')
    .eq('id', line_item_id)
    .single()

  if (!item) return { success: false, error: 'Line item not found' }
  if (item.status === 'paid') return { success: false, error: 'Cannot exclude a paid item' }

  const { error } = await admin
    .from('payroll_line_items')
    .update({ status: 'excluded' })
    .eq('id', line_item_id)

  if (error) return { success: false, error: error.message }

  await admin.from('payroll_approval_events').insert({
    line_item_id,
    from_status: item.status,
    to_status: 'excluded',
    actor_id: me.id,
    reason: reason.trim(),
  })

  await recalcBatchStatus(item.batch_id, me.id)

  return { success: true }
}

// ─── 5. Mark batch as paid ────────────────────────────────────────────────────
export async function markBatchPaid(
  batch_id: string,
  payment_date: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Only admins can mark batches as paid' }

  const admin = adminClient()

  const { data: batch } = await admin
    .from('payroll_batches')
    .select('id, status, payroll_month_id')
    .eq('id', batch_id)
    .single()

  if (!batch) return { success: false, error: 'Batch not found' }
  if (batch.status !== 'approved') return { success: false, error: `Batch must be fully approved before marking as paid (current: ${batch.status})` }

  const { error: liErr } = await admin
    .from('payroll_line_items')
    .update({ status: 'paid' })
    .eq('batch_id', batch_id)
    .eq('status', 'approved')

  if (liErr) return { success: false, error: liErr.message }

  await admin.from('payroll_batches').update({ status: 'paid' }).eq('id', batch_id)
  await admin.from('payroll_months').update({ status: 'paid' }).eq('id', batch.payroll_month_id)

  try {
    await admin.from('activity_log').insert({
      action: 'user_invited',
      user_id: me.id,
      metadata: {
        action_type: 'payroll_batch_paid',
        batch_id,
        month_id: batch.payroll_month_id,
        payment_date,
        marked_by: me.full_name,
      },
    })
  } catch { /* safe-fail */ }

  return { success: true }
}

// ─── 6. Close payroll month ───────────────────────────────────────────────────
export async function closePayrollMonth(
  month_id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Only admins can close payroll months' }

  const admin = adminClient()

  const { data: month } = await admin
    .from('payroll_months')
    .select('id, status')
    .eq('id', month_id)
    .single()

  if (!month) return { success: false, error: 'Month not found' }
  if (month.status !== 'paid') return { success: false, error: `Month must be in paid status before closing (current: ${month.status})` }

  const { error } = await admin
    .from('payroll_months')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', month_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 7. Get payroll history (closed + paid months) ────────────────────────────
export async function getPayrollHistory(): Promise<{
  id: string
  period_label: string
  status: string
  opened_at: string
  closed_at: string | null
  total_paid: number
  headcount: number
}[]> {
  const me = await getCurrentUser()
  if (!me || !isAdminRole(me.role)) return []

  const admin = adminClient()

  const { data: months } = await admin
    .from('payroll_months')
    .select('id, period_label, status, opened_at, closed_at')
    .in('status', ['paid', 'closed'])
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (!months?.length) return []

  const monthIds = months.map(m => m.id)

  const { data: batches } = await admin
    .from('payroll_batches')
    .select('id, payroll_month_id')
    .in('payroll_month_id', monthIds)

  const batchIdMap = new Map<string, string>()
  for (const b of (batches ?? [])) batchIdMap.set(b.payroll_month_id, (b as { id: string }).id)

  const batchIds = Array.from(batchIdMap.values())

  let lineItems: { batch_id: string; net_pay: number }[] = []
  if (batchIds.length > 0) {
    const { data: items } = await admin
      .from('payroll_line_items')
      .select('batch_id, net_pay')
      .in('batch_id', batchIds)
      .eq('status', 'paid')

    lineItems = (items ?? []).map(i => ({ batch_id: i.batch_id, net_pay: Number(i.net_pay) }))
  }

  const totalsMap = new Map<string, { total: number; count: number }>()
  for (const li of lineItems) {
    const curr = totalsMap.get(li.batch_id) ?? { total: 0, count: 0 }
    totalsMap.set(li.batch_id, { total: curr.total + li.net_pay, count: curr.count + 1 })
  }

  return months.map(m => {
    const batchId = batchIdMap.get(m.id) ?? ''
    const t = totalsMap.get(batchId) ?? { total: 0, count: 0 }
    return {
      id: m.id,
      period_label: m.period_label,
      status: m.status,
      opened_at: m.opened_at,
      closed_at: m.closed_at,
      total_paid: t.total,
      headcount: t.count,
    }
  })
}

// ─── Internal: Recalculate batch status after line item changes ───────────────
async function recalcBatchStatus(batch_id: string, actor_id: string) {
  const admin = adminClient()

  const { data: items } = await admin
    .from('payroll_line_items')
    .select('status')
    .eq('batch_id', batch_id)

  if (!items) return

  const statuses = items.map(i => i.status)
  const hasPending  = statuses.some(s => s === 'pending' || s === 'resubmitted')
  const allResolved = statuses.every(s => s === 'approved' || s === 'paid' || s === 'excluded')

  const newStatus = allResolved ? 'approved' : 'partially_reviewed'

  await admin
    .from('payroll_batches')
    .update({ status: newStatus, reviewed_by: actor_id, reviewed_at: new Date().toISOString() })
    .eq('id', batch_id)

  if (newStatus === 'approved') {
    const { data: batch } = await admin
      .from('payroll_batches')
      .select('payroll_month_id')
      .eq('id', batch_id)
      .single()
    if (batch) {
      await admin
        .from('payroll_months')
        .update({ status: 'approved' })
        .eq('id', batch.payroll_month_id)
    }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSalaryCompletionStatus } from '../../payroll/salary-actions'

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

const PAYROLL_ELIGIBLE_ROLES = ['worker_standard', 'worker_isolated', 'accountant']

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayrollAdjustmentInput {
  employee_id: string
  type: 'advance' | 'deduction' | 'bonus'
  amount: number
  reason: string
}

export interface LineItemWithEmployee {
  id: string
  batch_id: string
  employee_id: string
  salary_record_id: string
  gross_salary: number
  total_deductions: number
  total_additions: number
  net_pay: number
  status: string
  version: number
  rejection_reason: string | null
  rejected_by: string | null
  rejected_at: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  employee: { full_name: string; role: string; department: string | null }
  adjustments: AdjustmentRecord[]
}

export interface AdjustmentRecord {
  id: string
  employee_id: string
  payroll_month_id: string
  line_item_id: string | null
  type: 'advance' | 'deduction' | 'bonus'
  amount: number
  reason: string
  created_by: string
  created_at: string
  applied: boolean
}

export interface PayrollMonthDetail {
  id: string
  period_label: string
  period_year: number
  period_month: number
  status: string
  opened_by: string
  opened_at: string
  closed_at: string | null
  batch: {
    id: string
    status: string
    submitted_at: string | null
  } | null
  line_items: LineItemWithEmployee[]
}

export interface PayrollMonthSummary {
  id: string
  period_label: string
  period_year: number
  period_month: number
  status: string
  opened_at: string
  batch_status: string | null
  headcount: number
}

// ─── 1. Open a payroll month ──────────────────────────────────────────────────
export async function openPayrollMonth(
  year: number,
  month: number
): Promise<
  | { success: true; month_id: string }
  | { success: false; error: string; missing_salaries?: { id: string; full_name: string }[] }
> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can open payroll months' }

  // Gate: all eligible employees must have salary records
  const completion = await getSalaryCompletionStatus()
  if (!completion.complete) {
    return {
      success: false,
      error: `${completion.missing.length} employee(s) are missing salary records. Set salary records before opening a payroll month.`,
      missing_salaries: completion.missing.map(e => ({ id: e.id, full_name: e.full_name })),
    }
  }

  if (completion.total_eligible === 0) {
    return { success: false, error: 'No eligible employees found. Ensure at least one active worker, isolated worker, or accountant exists.' }
  }

  const admin = adminClient()

  // Check for existing open month
  const { data: openMonth } = await admin
    .from('payroll_months')
    .select('id, period_label')
    .eq('status', 'open')
    .maybeSingle()

  if (openMonth) {
    return { success: false, error: `A payroll month is already open: ${openMonth.period_label}. Close or submit it before opening a new one.` }
  }

  // Check this period doesn't already exist
  const { data: existingPeriod } = await admin
    .from('payroll_months')
    .select('id, status')
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle()

  if (existingPeriod) {
    return { success: false, error: `Payroll month for this period already exists (status: ${existingPeriod.status}).` }
  }

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const period_label = `${monthNames[month - 1]} ${year}`

  const { data: newMonth, error } = await admin
    .from('payroll_months')
    .insert({
      period_label,
      period_year: year,
      period_month: month,
      status: 'open',
      opened_by: me.id,
    })
    .select('id')
    .single()

  if (error || !newMonth) return { success: false, error: error?.message ?? 'Failed to create payroll month' }

  try {
    await admin.from('activity_log').insert({
      action: 'user_invited',
      user_id: me.id,
      metadata: {
        action_type: 'payroll_month_opened',
        month_id: newMonth.id,
        period_label,
        opened_by: me.full_name,
      },
    })
  } catch { /* safe-fail */ }

  return { success: true, month_id: newMonth.id as string }
}

// ─── 2. Build payroll batch ───────────────────────────────────────────────────
export async function buildPayrollBatch(
  month_id: string
): Promise<{ success: true; batch_id: string; headcount: number } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can build payroll batches' }

  const admin = adminClient()

  const { data: month } = await admin
    .from('payroll_months')
    .select('id, status')
    .eq('id', month_id)
    .single()

  if (!month) return { success: false, error: 'Payroll month not found' }
  if (month.status !== 'open') return { success: false, error: `Cannot build batch for month with status: ${month.status}` }

  const { data: existingBatch } = await admin
    .from('payroll_batches')
    .select('id')
    .eq('payroll_month_id', month_id)
    .maybeSingle()

  if (existingBatch) return { success: false, error: 'Batch already exists for this month. Use the existing batch.' }

  const { data: employees, error: empErr } = await admin
    .from('profiles')
    .select('id, full_name, role, department')
    .in('role', PAYROLL_ELIGIBLE_ROLES)
    .eq('is_active', true)

  if (empErr || !employees?.length) {
    return { success: false, error: 'No eligible active employees found' }
  }

  const empIds = employees.map(e => e.id)
  const { data: salaries, error: salErr } = await admin
    .from('salary_records')
    .select('id, employee_id, gross_salary')
    .in('employee_id', empIds)
    .is('effective_to', null)

  if (salErr) return { success: false, error: `Failed to load salary records: ${salErr.message}` }

  const salaryMap = new Map<string, { id: string; gross_salary: number }>()
  for (const s of (salaries ?? [])) {
    salaryMap.set(s.employee_id, { id: s.id, gross_salary: Number(s.gross_salary) })
  }

  const missing = employees.filter(e => !salaryMap.has(e.id))
  if (missing.length > 0) {
    return {
      success: false,
      error: `${missing.length} employee(s) missing salary records: ${missing.map(e => e.full_name).join(', ')}`,
    }
  }

  const { data: adjustments } = await admin
    .from('payroll_adjustments')
    .select('*')
    .eq('payroll_month_id', month_id)
    .eq('applied', false)

  const adjMap = new Map<string, { deductions: number; additions: number; ids: string[] }>()
  for (const adj of (adjustments ?? [])) {
    const empId = adj.employee_id
    if (!adjMap.has(empId)) adjMap.set(empId, { deductions: 0, additions: 0, ids: [] })
    const entry = adjMap.get(empId)!
    entry.ids.push(adj.id)
    if (adj.type === 'advance' || adj.type === 'deduction') {
      entry.deductions += Number(adj.amount)
    } else if (adj.type === 'bonus') {
      entry.additions += Number(adj.amount)
    }
  }

  const { data: batch, error: batchErr } = await admin
    .from('payroll_batches')
    .insert({ payroll_month_id: month_id, status: 'draft', submitted_by: me.id })
    .select('id')
    .single()

  if (batchErr || !batch) return { success: false, error: batchErr?.message ?? 'Failed to create batch' }

  const batchId = batch.id as string

  const lineItems = employees.map(emp => {
    const sal = salaryMap.get(emp.id)!
    const adj = adjMap.get(emp.id) ?? { deductions: 0, additions: 0, ids: [] }
    const net = sal.gross_salary - adj.deductions + adj.additions
    return {
      batch_id: batchId,
      employee_id: emp.id,
      salary_record_id: sal.id,
      gross_salary: sal.gross_salary,
      total_deductions: adj.deductions,
      total_additions: adj.additions,
      net_pay: net,
      status: 'draft',
      version: 1,
    }
  })

  const { data: insertedItems, error: liErr } = await admin
    .from('payroll_line_items')
    .insert(lineItems)
    .select('id, employee_id')

  if (liErr || !insertedItems) {
    await admin.from('payroll_batches').delete().eq('id', batchId)
    return { success: false, error: liErr?.message ?? 'Failed to create line items' }
  }

  if (adjustments && adjustments.length > 0) {
    const lineItemMap = new Map<string, string>()
    for (const li of insertedItems) lineItemMap.set(li.employee_id, li.id)

    for (const adj of adjustments) {
      const lineItemId = lineItemMap.get(adj.employee_id)
      if (lineItemId) {
        await admin
          .from('payroll_adjustments')
          .update({ line_item_id: lineItemId, applied: true })
          .eq('id', adj.id)
      }
    }
  }

  return { success: true, batch_id: batchId, headcount: employees.length }
}

// ─── 3. Add adjustment to a line item (during draft) ─────────────────────────
export async function addAdjustment(
  month_id: string,
  employee_id: string,
  type: 'advance' | 'deduction' | 'bonus',
  amount: number,
  reason: string
): Promise<{ success: true; adjustment_id: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can add adjustments' }
  if (!reason?.trim()) return { success: false, error: 'Reason is required' }
  if (amount <= 0) return { success: false, error: 'Amount must be greater than 0' }

  const admin = adminClient()

  const { data: adj, error: adjErr } = await admin
    .from('payroll_adjustments')
    .insert({
      employee_id,
      payroll_month_id: month_id,
      type,
      amount,
      reason: reason.trim(),
      created_by: me.id,
      applied: false,
    })
    .select('id')
    .single()

  if (adjErr || !adj) return { success: false, error: adjErr?.message ?? 'Failed to create adjustment' }

  const { data: batchRow } = await admin
    .from('payroll_batches')
    .select('id, status')
    .eq('payroll_month_id', month_id)
    .maybeSingle()

  if (batchRow && batchRow.status === 'draft') {
    const { data: lineItem } = await admin
      .from('payroll_line_items')
      .select('id, gross_salary, total_deductions, total_additions')
      .eq('batch_id', batchRow.id)
      .eq('employee_id', employee_id)
      .single()

    if (lineItem) {
      const newDeductions = type === 'advance' || type === 'deduction'
        ? Number(lineItem.total_deductions) + amount
        : Number(lineItem.total_deductions)
      const newAdditions = type === 'bonus'
        ? Number(lineItem.total_additions) + amount
        : Number(lineItem.total_additions)
      const newNet = Number(lineItem.gross_salary) - newDeductions + newAdditions

      await admin
        .from('payroll_line_items')
        .update({ total_deductions: newDeductions, total_additions: newAdditions, net_pay: newNet })
        .eq('id', lineItem.id)

      await admin
        .from('payroll_adjustments')
        .update({ line_item_id: lineItem.id, applied: true })
        .eq('id', adj.id)
    }
  }

  return { success: true, adjustment_id: adj.id as string }
}

// ─── 4. Remove adjustment (only if batch is draft or no batch) ────────────────
export async function removeAdjustment(
  adjustment_id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can remove adjustments' }

  const admin = adminClient()

  const { data: adj } = await admin
    .from('payroll_adjustments')
    .select('*, line_item:line_item_id(id, batch_id, gross_salary, total_deductions, total_additions, batch:batch_id(status))')
    .eq('id', adjustment_id)
    .single()

  if (!adj) return { success: false, error: 'Adjustment not found' }

  if (adj.applied && adj.line_item) {
    const batchStatus = (adj.line_item as { batch?: { status: string } })?.batch?.status
    if (batchStatus && batchStatus !== 'draft') {
      return { success: false, error: 'Cannot remove adjustment after batch has been submitted' }
    }

    const li = adj.line_item as {
      id: string; gross_salary: number; total_deductions: number; total_additions: number
    }
    const newDeductions = adj.type === 'advance' || adj.type === 'deduction'
      ? Math.max(0, Number(li.total_deductions) - Number(adj.amount))
      : Number(li.total_deductions)
    const newAdditions = adj.type === 'bonus'
      ? Math.max(0, Number(li.total_additions) - Number(adj.amount))
      : Number(li.total_additions)
    const newNet = Number(li.gross_salary) - newDeductions + newAdditions

    await admin
      .from('payroll_line_items')
      .update({ total_deductions: newDeductions, total_additions: newAdditions, net_pay: newNet })
      .eq('id', li.id)
  }

  const { error } = await admin.from('payroll_adjustments').delete().eq('id', adjustment_id)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

// ─── 5. Submit batch for admin review ────────────────────────────────────────
export async function submitBatch(
  batch_id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can submit batches' }

  const admin = adminClient()

  const { data: batch } = await admin
    .from('payroll_batches')
    .select('id, status, payroll_month_id')
    .eq('id', batch_id)
    .single()

  if (!batch) return { success: false, error: 'Batch not found' }
  if (batch.status !== 'draft') return { success: false, error: `Batch is not in draft status (current: ${batch.status})` }

  const now = new Date().toISOString()

  const { error: liErr } = await admin
    .from('payroll_line_items')
    .update({ status: 'pending' })
    .eq('batch_id', batch_id)
    .eq('status', 'draft')

  if (liErr) return { success: false, error: liErr.message }

  const { error: batchErr } = await admin
    .from('payroll_batches')
    .update({ status: 'submitted', submitted_by: me.id, submitted_at: now })
    .eq('id', batch_id)

  if (batchErr) return { success: false, error: batchErr.message }

  await admin
    .from('payroll_months')
    .update({ status: 'submitted' })
    .eq('id', batch.payroll_month_id)

  try {
    await admin.from('activity_log').insert({
      action: 'user_invited',
      user_id: me.id,
      metadata: {
        action_type: 'payroll_batch_submitted',
        batch_id,
        month_id: batch.payroll_month_id,
        submitted_by: me.full_name,
      },
    })
  } catch { /* safe-fail */ }

  return { success: true }
}

// ─── 6. Resubmit a rejected line item ────────────────────────────────────────
export async function resubmitLineItem(
  line_item_id: string,
  new_deductions: number,
  new_additions: number,
  correction_note?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant') return { success: false, error: 'Only accountants can resubmit line items' }

  const admin = adminClient()

  const { data: item } = await admin
    .from('payroll_line_items')
    .select('id, status, gross_salary, version, batch_id')
    .eq('id', line_item_id)
    .single()

  if (!item) return { success: false, error: 'Line item not found' }
  if (item.status !== 'rejected') return { success: false, error: `Line item is not in rejected status (current: ${item.status})` }

  const newNet = Number(item.gross_salary) - new_deductions + new_additions

  const { error: updateErr } = await admin
    .from('payroll_line_items')
    .update({
      status: 'resubmitted',
      total_deductions: new_deductions,
      total_additions: new_additions,
      net_pay: newNet,
      version: item.version + 1,
      rejection_reason: null,
      rejected_by: null,
      rejected_at: null,
    })
    .eq('id', line_item_id)

  if (updateErr) return { success: false, error: updateErr.message }

  await admin.from('payroll_approval_events').insert({
    line_item_id,
    from_status: 'rejected',
    to_status: 'resubmitted',
    actor_id: me.id,
    reason: correction_note?.trim() || null,
  })

  const { data: batchRow } = await admin
    .from('payroll_batches')
    .select('id, status')
    .eq('id', item.batch_id)
    .single()

  if (batchRow && batchRow.status === 'submitted') {
    await admin
      .from('payroll_batches')
      .update({ status: 'partially_reviewed' })
      .eq('id', batchRow.id)
  }

  return { success: true }
}

// ─── 7. Get full payroll month detail ────────────────────────────────────────
export async function getPayrollMonth(month_id: string): Promise<PayrollMonthDetail | null> {
  const me = await getCurrentUser()
  if (!me) return null
  if (!['super_admin', 'admin', 'accountant'].includes(me.role)) return null

  const admin = adminClient()

  const { data: month } = await admin
    .from('payroll_months')
    .select('*')
    .eq('id', month_id)
    .single()

  if (!month) return null

  const { data: batch } = await admin
    .from('payroll_batches')
    .select('id, status, submitted_at')
    .eq('payroll_month_id', month_id)
    .maybeSingle()

  let line_items: LineItemWithEmployee[] = []

  if (batch) {
    const { data: items } = await admin
      .from('payroll_line_items')
      .select('*')
      .eq('batch_id', batch.id)
      .order('created_at', { ascending: true })

    if (items && items.length > 0) {
      const empIds = items.map(i => i.employee_id)

      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, role, department')
        .in('id', empIds)

      const { data: adjustments } = await admin
        .from('payroll_adjustments')
        .select('*')
        .eq('payroll_month_id', month_id)

      const profileMap = new Map<string, { full_name: string; role: string; department: string | null }>()
      for (const p of (profiles ?? [])) {
        profileMap.set(p.id, { full_name: p.full_name, role: p.role, department: p.department })
      }

      const adjMap = new Map<string, AdjustmentRecord[]>()
      for (const a of (adjustments ?? [])) {
        const key = a.employee_id
        if (!adjMap.has(key)) adjMap.set(key, [])
        adjMap.get(key)!.push(a as AdjustmentRecord)
      }

      line_items = items.map(item => ({
        ...item,
        gross_salary: Number(item.gross_salary),
        total_deductions: Number(item.total_deductions),
        total_additions: Number(item.total_additions),
        net_pay: Number(item.net_pay),
        employee: profileMap.get(item.employee_id) ?? { full_name: 'Unknown', role: '', department: null },
        adjustments: adjMap.get(item.employee_id) ?? [],
      })) as LineItemWithEmployee[]
    }
  }

  return {
    id: month.id,
    period_label: month.period_label,
    period_year: month.period_year,
    period_month: month.period_month,
    status: month.status,
    opened_by: month.opened_by,
    opened_at: month.opened_at,
    closed_at: month.closed_at,
    batch: batch ? { id: batch.id, status: batch.status, submitted_at: batch.submitted_at } : null,
    line_items,
  }
}

// ─── 8. Get payroll month list ────────────────────────────────────────────────
export async function getPayrollMonthList(): Promise<PayrollMonthSummary[]> {
  const me = await getCurrentUser()
  if (!me) return []
  if (!['super_admin', 'admin', 'accountant'].includes(me.role)) return []

  const admin = adminClient()

  const { data: months } = await admin
    .from('payroll_months')
    .select('id, period_label, period_year, period_month, status, opened_at')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (!months?.length) return []

  const monthIds = months.map(m => m.id)
  const { data: batches } = await admin
    .from('payroll_batches')
    .select('id, payroll_month_id, status')
    .in('payroll_month_id', monthIds)

  const { data: lineCounts } = await admin
    .from('payroll_line_items')
    .select('batch_id')

  const batchStatusMap = new Map<string, string>()
  const batchIdForMonth = new Map<string, string>()
  for (const b of (batches ?? [])) {
    batchStatusMap.set(b.payroll_month_id, b.status)
    batchIdForMonth.set(b.payroll_month_id, (b as { id?: string }).id ?? '')
  }

  const countMap = new Map<string, number>()
  for (const li of (lineCounts ?? [])) {
    countMap.set(li.batch_id, (countMap.get(li.batch_id) ?? 0) + 1)
  }

  return months.map(m => {
    const batchId = batchIdForMonth.get(m.id) ?? ''
    return {
      id: m.id,
      period_label: m.period_label,
      period_year: m.period_year,
      period_month: m.period_month,
      status: m.status,
      opened_at: m.opened_at,
      batch_status: batchStatusMap.get(m.id) ?? null,
      headcount: countMap.get(batchId) ?? 0,
    }
  })
}

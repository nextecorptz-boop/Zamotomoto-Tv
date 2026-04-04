'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type {
  AccountingEntry,
  AccountingCategory,
  AccountingDocument,
  AccountingSummary,
  AccountingEntryType,
  AccountingEntryStatus,
} from '@/types'

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
  return profile ? { id: profile.id as string, role: profile.role as string, full_name: profile.full_name as string } : null
}

// ─── 1. Fetch accounting entries ──────────────────────────────────────────────
export interface EntryFilters {
  status?: AccountingEntryStatus | 'all'
  entry_type?: AccountingEntryType | 'all'
  category_id?: string
  date_from?: string
  date_to?: string
}

export async function getAccountingEntries(filters?: EntryFilters): Promise<AccountingEntry[]> {
  const admin = adminClient()
  let q = admin
    .from('accounting_entries')
    .select(`
      *,
      category:category_id(id, name, type, description, created_at),
      submitter:submitted_by(full_name),
      reviewer:reviewed_by(full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters?.entry_type && filters.entry_type !== 'all') q = q.eq('entry_type', filters.entry_type)
  if (filters?.category_id) q = q.eq('category_id', filters.category_id)
  if (filters?.date_from) q = q.gte('entry_date', filters.date_from)
  if (filters?.date_to)   q = q.lte('entry_date', filters.date_to)

  const { data, error } = await q
  if (error) {
    console.error('[getAccountingEntries]', error.message)
    return []
  }
  return (data ?? []) as unknown as AccountingEntry[]
}

// ─── 2. Accounting summary ────────────────────────────────────────────────────
export async function getAccountingSummary(): Promise<AccountingSummary> {
  const admin = adminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const [expResult, credResult, pendResult, assetCatsResult] = await Promise.all([
    admin.from('accounting_entries').select('amount').eq('status', 'approved').eq('entry_type', 'debit').gte('created_at', startOfMonth).lt('created_at', endOfMonth),
    admin.from('accounting_entries').select('amount').eq('status', 'approved').eq('entry_type', 'credit').gte('created_at', startOfMonth).lt('created_at', endOfMonth),
    admin.from('accounting_entries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('accounting_categories').select('id').eq('type', 'asset'),
  ])

  const totalExpenses = (expResult.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  const totalCredits  = (credResult.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  const pendingCount  = pendResult.count ?? 0

  const assetCatIds = (assetCatsResult.data ?? []).map(c => c.id as string)
  let totalAssets = 0
  if (assetCatIds.length > 0) {
    const { data: assetEntries } = await admin
      .from('accounting_entries')
      .select('amount')
      .eq('status', 'approved')
      .in('category_id', assetCatIds)
    totalAssets = (assetEntries ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  }

  return { total_expenses: totalExpenses, total_credits: totalCredits, pending_count: pendingCount, total_assets: totalAssets }
}

// ─── 3. Create entry (accountant) ─────────────────────────────────────────────
export interface CreateEntryData {
  title: string
  description?: string
  amount: number
  currency: string
  category_id?: string
  entry_type: AccountingEntryType
  entry_date: string
}

export async function createAccountingEntry(
  data: CreateEntryData
): Promise<{ success: true; entry_id: string; reference_code: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'accountant' && me.role !== 'super_admin' && me.role !== 'admin') {
    return { success: false, error: 'Only accountants may log entries' }
  }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('accounting_entries')
    .insert({
      title:       data.title.trim(),
      description: data.description?.trim() || null,
      amount:      data.amount,
      currency:    data.currency,
      category_id: data.category_id || null,
      entry_type:  data.entry_type,
      entry_date:  data.entry_date,
      submitted_by: me.id,
      status: 'pending',
    })
    .select('id, reference_code')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'accounting_entry_created',
    user_id: me.id,
    metadata: {
      entity_type: 'accounting_entry',
      entity_id: row!.id,
      reference_code: row!.reference_code,
      description: `Entry ${row!.reference_code} submitted by ${me.full_name}`,
    },
  })

  return { success: true, entry_id: row!.id as string, reference_code: row!.reference_code as string }
}

// ─── 4. Record document metadata (called after client-side storage upload) ────
export async function recordAccountingDocument(docData: {
  entry_id: string
  file_name: string
  storage_key: string
  mime_type: string
  file_size_bytes?: number
}): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }

  const admin = adminClient()
  const { error } = await admin.from('accounting_documents').insert({
    entry_id:        docData.entry_id,
    file_name:       docData.file_name,
    storage_key:     docData.storage_key,
    mime_type:       docData.mime_type,
    file_size_bytes: docData.file_size_bytes ?? null,
    uploaded_by:     me.id,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 5. Review entry (admin) ──────────────────────────────────────────────────
export async function reviewAccountingEntry(
  entry_id: string,
  decision: 'approved' | 'rejected',
  review_note?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'super_admin' && me.role !== 'admin') {
    return { success: false, error: 'Only admins may review entries' }
  }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('accounting_entries')
    .update({
      status:      decision,
      reviewed_by: me.id,
      review_note: review_note?.trim() || null,
    })
    .eq('id', entry_id)
    .select('reference_code')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'accounting_entry_reviewed',
    user_id: me.id,
    metadata: {
      entity_type: 'accounting_entry',
      entity_id: entry_id,
      reference_code: row?.reference_code,
      decision,
      description: `Entry ${row?.reference_code} ${decision} by ${me.full_name}`,
    },
  })

  return { success: true }
}

// ─── 6. Fetch documents for an entry ─────────────────────────────────────────
export async function getAccountingDocuments(entry_id: string): Promise<AccountingDocument[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('accounting_documents')
    .select('*')
    .eq('entry_id', entry_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getAccountingDocuments]', error.message)
    return []
  }
  return (data ?? []) as AccountingDocument[]
}

// ─── 7. Generate signed URL for a stored document ────────────────────────────
export async function getSignedDocumentUrl(storage_key: string): Promise<string | null> {
  const me = await getCurrentUser()
  if (!me) return null
  if (!['super_admin', 'admin', 'accountant'].includes(me.role)) return null

  const admin = adminClient()
  const { data } = await admin.storage.from('accounting-docs').createSignedUrl(storage_key, 3600)
  return data?.signedUrl ?? null
}

// ─── 8. Fetch all categories ──────────────────────────────────────────────────
export async function getAccountingCategories(): Promise<AccountingCategory[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('accounting_categories')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getAccountingCategories]', error.message)
    return []
  }
  return (data ?? []) as AccountingCategory[]
}

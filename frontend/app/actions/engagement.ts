'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type {
  EngagementCategory,
  EngagementSubmission,
  EngagementActivityLog,
  EngagementConfig,
  EngagementDashboardData,
  EngagementOperatorStats,
  EngagementTeamEntry,
} from '@/types/engagement'

// ─── Service-role client (bypasses RLS) ─────────────────────────────────────
function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── Get current user + role ─────────────────────────────────────────────────
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
    ? { id: profile.id as string, role: profile.role as string, full_name: profile.full_name as string | null }
    : null
}

function isAdminRole(role: string) {
  return role === 'super_admin' || role === 'admin'
}

function isWorkerRole(role: string) {
  return role === 'worker_standard' || role === 'worker_isolated'
}

// ─── Helper: safe daily target from config ───────────────────────────────────
async function getDailyTarget(): Promise<number> {
  const admin = adminClient()
  const { data } = await admin
    .from('engagement_config')
    .select('config_value')
    .eq('config_key', 'default_daily_target')
    .maybeSingle()
  const parsed = parseInt(data?.config_value ?? '', 10)
  return isNaN(parsed) ? 10 : parsed
}

// ─── 1. Get active categories (for operators) ────────────────────────────────
export async function getActiveEngagementCategories(): Promise<EngagementCategory[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('engagement_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getActiveEngagementCategories]', error.message)
    return []
  }
  return (data ?? []) as EngagementCategory[]
}

// ─── 2. Get all categories (for admin) ──────────────────────────────────────
export async function getAllEngagementCategories(): Promise<EngagementCategory[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('engagement_categories')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getAllEngagementCategories]', error.message)
    return []
  }
  return (data ?? []) as EngagementCategory[]
}

// ─── 3. Create engagement category (admin) ───────────────────────────────────
export interface CreateCategoryData {
  name: string
  description?: string
  platform?: string
  points_value?: number
}

export async function createEngagementCategory(
  data: CreateCategoryData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin only' }

  const admin = adminClient()

  // Try full insert first; fall back to name-only if extra columns missing
  const { data: row, error } = await admin
    .from('engagement_categories')
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      platform: data.platform?.trim() || null,
      points_value: data.points_value ?? 1,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    // If error mentions missing column, try minimal insert (name + is_active only)
    if (error.message.includes('column') || error.message.includes('schema')) {
      console.warn('[createEngagementCategory] Schema mismatch, trying minimal insert:', error.message)
      const { data: fallback, error: fallbackErr } = await admin
        .from('engagement_categories')
        .insert({ name: data.name.trim(), is_active: true })
        .select('id')
        .single()
      if (fallbackErr) return { success: false, error: `Schema issue — run engagement migration SQL. Error: ${fallbackErr.message}` }
      return { success: true, id: fallback!.id as string }
    }
    return { success: false, error: error.message }
  }
  return { success: true, id: row!.id as string }
}

// ─── 4. Update engagement category (admin) ───────────────────────────────────
export interface UpdateCategoryData {
  name?: string
  description?: string
  platform?: string
  points_value?: number
  is_active?: boolean
}

export async function updateEngagementCategory(
  categoryId: string,
  data: UpdateCategoryData
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin only' }

  const admin = adminClient()
  const updatePayload: Record<string, unknown> = {}
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null
  if (data.platform !== undefined) updatePayload.platform = data.platform?.trim() || null
  if (data.points_value !== undefined) updatePayload.points_value = data.points_value
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active

  const { error } = await admin
    .from('engagement_categories')
    .update(updatePayload)
    .eq('id', categoryId)

  if (error) {
    // If schema error (columns missing), retry with only known-safe fields
    if (error.message.includes('column') || error.message.includes('schema')) {
      const safePayload: Record<string, unknown> = {}
      if (updatePayload.name !== undefined) safePayload.name = updatePayload.name
      if (updatePayload.is_active !== undefined) safePayload.is_active = updatePayload.is_active
      const { error: safeErr } = await admin.from('engagement_categories').update(safePayload).eq('id', categoryId)
      if (safeErr) return { success: false, error: `Schema issue — run engagement migration SQL. Error: ${safeErr.message}` }
      return { success: true }
    }
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ─── 5. Get my submissions (operator) ────────────────────────────────────────
export async function getMyEngagementSubmissions(): Promise<EngagementSubmission[]> {
  const me = await getCurrentUser()
  if (!me) return []

  const admin = adminClient()
  // Try with FK joins first; fall back to basic query if schema is missing columns
  const { data, error } = await admin
    .from('engagement_submissions')
    .select(`
      *,
      category:category_id(id, name, is_active, created_at, updated_at),
      reviewer:reviewed_by(full_name)
    `)
    .eq('operator_id', me.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    // Fallback: query without reviewer join (handles missing reviewed_by FK)
    console.warn('[getMyEngagementSubmissions] FK join failed, using fallback:', error.message)
    const { data: fallback } = await admin
      .from('engagement_submissions')
      .select(`*, category:category_id(id, name, is_active, created_at, updated_at)`)
      .eq('operator_id', me.id)
      .order('created_at', { ascending: false })
      .limit(100)
    return (fallback ?? []) as unknown as EngagementSubmission[]
  }
  return (data ?? []) as unknown as EngagementSubmission[]
}

// ─── 6. Get all submissions (manager/admin) ──────────────────────────────────
export interface SubmissionFilters {
  status?: EngagementSubmission['status'] | 'all'
  operator_id?: string
  category_id?: string
  date_from?: string
  date_to?: string
}

export async function getAllEngagementSubmissions(
  filters?: SubmissionFilters
): Promise<EngagementSubmission[]> {
  const me = await getCurrentUser()
  if (!me) return []
  if (!isAdminRole(me.role)) return []

  const admin = adminClient()
  // Try with FK joins; fall back to basic query if reviewed_by FK missing
  let q = admin
    .from('engagement_submissions')
    .select(`
      *,
      operator:operator_id(full_name),
      category:category_id(id, name, is_active, created_at, updated_at),
      reviewer:reviewed_by(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters?.operator_id) q = q.eq('operator_id', filters.operator_id)
  if (filters?.category_id) q = q.eq('category_id', filters.category_id)
  if (filters?.date_from) q = q.gte('submitted_at', filters.date_from)
  if (filters?.date_to) q = q.lte('submitted_at', filters.date_to)

  const { data, error } = await q
  if (error) {
    // Fallback: query without reviewer join (handles missing reviewed_by FK)
    console.warn('[getAllEngagementSubmissions] FK join failed, using fallback:', error.message)
    let fq = admin
      .from('engagement_submissions')
      .select(`*, operator:operator_id(full_name), category:category_id(id, name, is_active, created_at, updated_at)`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters?.status && filters.status !== 'all') fq = fq.eq('status', filters.status)
    if (filters?.operator_id) fq = fq.eq('operator_id', filters.operator_id)

    const { data: fallback } = await fq
    return (fallback ?? []) as unknown as EngagementSubmission[]
  }
  return (data ?? []) as unknown as EngagementSubmission[]
}

// ─── 7. Submit engagement proof (operator) ───────────────────────────────────
export async function submitEngagementProof(
  formData: FormData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isWorkerRole(me.role) && !isAdminRole(me.role)) {
    return { success: false, error: 'Workers only may submit proofs' }
  }

  const categoryId = formData.get('category_id') as string | null
  const notes = formData.get('notes') as string | null
  const file = formData.get('proof_file') as File | null

  if (!categoryId) return { success: false, error: 'Category is required' }
  if (!file || file.size === 0) return { success: false, error: 'Proof file is required' }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: 'File too large (max 10MB)' }

  const admin = adminClient()

  // Verify category is active
  const { data: cat } = await admin
    .from('engagement_categories')
    .select('id, is_active')
    .eq('id', categoryId)
    .single()
  if (!cat || !cat.is_active) return { success: false, error: 'Category is inactive or not found' }

  // Upload file to private bucket
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${me.id}/${Date.now()}-proof.${ext}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('engagement-proofs')
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` }

  // Insert DB record (with fallback if notes/submitted_at columns missing)
  const now = new Date().toISOString()
  const { data: row, error: insertError } = await admin
    .from('engagement_submissions')
    .insert({
      operator_id: me.id,
      category_id: categoryId,
      notes: notes?.trim() || null,
      storage_path: storagePath,
      proof_url: null,
      status: 'pending',
      submitted_at: now,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.message.includes('column') || insertError.message.includes('schema')) {
      // Try minimal insert (base columns only)
      const { data: fallback, error: fallbackErr } = await admin
        .from('engagement_submissions')
        .insert({
          operator_id: me.id,
          category_id: categoryId,
          storage_path: storagePath,
          proof_url: null,
          status: 'pending',
        })
        .select('id')
        .single()
      if (fallbackErr) {
        await admin.storage.from('engagement-proofs').remove([storagePath])
        return { success: false, error: `Schema issue — run engagement migration SQL. Error: ${fallbackErr.message}` }
      }
      // Log activity (try with notes, ignore errors if notes column missing)
      await admin.from('engagement_activity_log').insert({
        submission_id: fallback!.id,
        actor_id: me.id,
        action: 'submitted',
      }).select().maybeSingle()
      return { success: true, id: fallback!.id as string }
    }
    // Safety: cleanup newly uploaded file on DB failure
    await admin.storage.from('engagement-proofs').remove([storagePath])
    return { success: false, error: insertError.message }
  }

  // Log activity
  await admin.from('engagement_activity_log').insert({
    submission_id: row!.id,
    actor_id: me.id,
    action: 'submitted',
    notes: `Proof submitted by ${me.full_name ?? me.id}`,
  }).select().maybeSingle()

  return { success: true, id: row!.id as string }
}

// ─── 8. Resubmit rejected proof (operator) — safety rule enforced ────────────
export async function resubmitEngagementProof(
  submissionId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }

  const admin = adminClient()

  // Step 1: Validate ownership & status
  const { data: existing, error: fetchErr } = await admin
    .from('engagement_submissions')
    .select('id, operator_id, status, storage_path')
    .eq('id', submissionId)
    .single()

  if (fetchErr || !existing) return { success: false, error: 'Submission not found' }
  if (existing.operator_id !== me.id) return { success: false, error: 'Not your submission' }
  if (existing.status !== 'rejected') return { success: false, error: 'Only rejected submissions can be resubmitted' }

  const file = formData.get('proof_file') as File | null
  const notes = formData.get('notes') as string | null

  if (!file || file.size === 0) return { success: false, error: 'New proof file is required' }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: 'File too large (max 10MB)' }

  // Step 2: Upload new file
  const ext = file.name.split('.').pop() ?? 'jpg'
  const newStoragePath = `${me.id}/${Date.now()}-resubmit.${ext}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('engagement-proofs')
    .upload(newStoragePath, fileBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` }

  // Step 3+4: Update DB
  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from('engagement_submissions')
    .update({
      storage_path: newStoragePath,
      notes: notes?.trim() || null,
      status: 'pending',
      reviewed_by: null,
      review_note: null,
      reviewed_at: null,
      submitted_at: now,
    })
    .eq('id', submissionId)

  if (updateError) {
    // Safety: cleanup newly uploaded file on DB failure
    await admin.storage.from('engagement-proofs').remove([newStoragePath])
    return { success: false, error: updateError.message }
  }

  // Step 5: Delete old file (after DB success)
  const oldPath = existing.storage_path as string | null
  if (oldPath && oldPath !== newStoragePath) {
    await admin.storage.from('engagement-proofs').remove([oldPath])
  }

  // Log activity
  await admin.from('engagement_activity_log').insert({
    submission_id: submissionId,
    actor_id: me.id,
    action: 'resubmitted',
    notes: `Resubmitted by ${me.full_name ?? me.id}`,
  }).select().maybeSingle()

  return { success: true }
}

// ─── 9. Validate submission (manager/admin approve or reject) ─────────────────
export async function validateEngagementSubmission(
  submissionId: string,
  decision: 'approved' | 'rejected',
  reviewNote?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin or manager only' }

  const admin = adminClient()
  const now = new Date().toISOString()

  const { error } = await admin
    .from('engagement_submissions')
    .update({
      status: decision,
      reviewed_by: me.id,
      review_note: reviewNote?.trim() || null,
      reviewed_at: now,
    })
    .eq('id', submissionId)
    .eq('status', 'pending')

  if (error) return { success: false, error: error.message }

  // Log activity
  await admin.from('engagement_activity_log').insert({
    submission_id: submissionId,
    actor_id: me.id,
    action: decision,
    notes: `${decision} by ${me.full_name ?? me.id}${reviewNote ? ': ' + reviewNote : ''}`,
  }).select().maybeSingle()

  return { success: true }
}

// ─── 10. Get engagement dashboard data ──────────────────────────────────────
export async function getEngagementDashboard(): Promise<EngagementDashboardData> {
  const me = await getCurrentUser()
  const admin = adminClient()
  const daily_target = await getDailyTarget()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

  const todayISO = todayStart.toISOString()
  const tomorrowISO = new Date(todayStart.getTime() + 86400000).toISOString()
  const monthStartISO = monthStart.toISOString()

  let operator_stats: EngagementOperatorStats = {
    today_submitted: 0,
    today_approved: 0,
    today_pending: 0,
    today_rejected: 0,
    daily_target,
    total_this_month: 0,
  }

  let team_entries: EngagementTeamEntry[] = []
  let recent_submissions: EngagementSubmission[] = []
  let pending_count = 0

  if (!me) return { operator_stats, team_entries, recent_submissions, pending_count }

  // Personal stats (for operators and admins)
  const [todayRes, monthRes] = await Promise.all([
    admin
      .from('engagement_submissions')
      .select('status')
      .eq('operator_id', me.id)
      .gte('submitted_at', todayISO)
      .lt('submitted_at', tomorrowISO),
    admin
      .from('engagement_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('operator_id', me.id)
      .gte('submitted_at', monthStartISO),
  ])

  const todayRows = todayRes.data ?? []
  operator_stats = {
    today_submitted: todayRows.length,
    today_approved: todayRows.filter(r => r.status === 'approved').length,
    today_pending: todayRows.filter(r => r.status === 'pending').length,
    today_rejected: todayRows.filter(r => r.status === 'rejected').length,
    daily_target,
    total_this_month: monthRes.count ?? 0,
  }

  // Pending count (global) — for managers/admins
  if (isAdminRole(me.role)) {
    const { count } = await admin
      .from('engagement_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    pending_count = count ?? 0

    // Team leaderboard for today
    const { data: teamData } = await admin
      .from('engagement_submissions')
      .select(`
        operator_id,
        status,
        operator:operator_id(full_name)
      `)
      .gte('submitted_at', todayISO)
      .lt('submitted_at', tomorrowISO)

    const teamMap = new Map<string, EngagementTeamEntry>()
    for (const row of teamData ?? []) {
      const id = row.operator_id as string
      const name = ((row.operator as unknown as { full_name: string | null } | null))?.full_name ?? null
      if (!teamMap.has(id)) {
        teamMap.set(id, { operator_id: id, operator_name: name, today_count: 0, approved_count: 0, month_total: 0 })
      }
      const entry = teamMap.get(id)!
      entry.today_count++
      if (row.status === 'approved') entry.approved_count++
    }

    // Month totals per operator
    const { data: monthTeam } = await admin
      .from('engagement_submissions')
      .select('operator_id')
      .gte('submitted_at', monthStartISO)

    for (const row of monthTeam ?? []) {
      const id = row.operator_id as string
      if (teamMap.has(id)) {
        teamMap.get(id)!.month_total++
      }
    }

    team_entries = Array.from(teamMap.values()).sort((a, b) => b.today_count - a.today_count)
  }

  // Recent submissions (with fallback for missing FK)
  const { data: recent, error: recentErr } = await admin
    .from('engagement_submissions')
    .select(`
      *,
      operator:operator_id(full_name),
      category:category_id(id, name, is_active, created_at, updated_at),
      reviewer:reviewed_by(full_name)
    `)
    .eq(isAdminRole(me.role) ? 'status' : 'operator_id', isAdminRole(me.role) ? 'pending' : me.id)
    .order('created_at', { ascending: false })
    .limit(isAdminRole(me.role) ? 10 : 5)

  if (recentErr) {
    // Fallback without reviewed_by FK join
    const { data: recentFallback } = await admin
      .from('engagement_submissions')
      .select(`*, operator:operator_id(full_name), category:category_id(id, name, is_active, created_at, updated_at)`)
      .eq(isAdminRole(me.role) ? 'status' : 'operator_id', isAdminRole(me.role) ? 'pending' : me.id)
      .order('created_at', { ascending: false })
      .limit(isAdminRole(me.role) ? 10 : 5)
    recent_submissions = (recentFallback ?? []) as unknown as EngagementSubmission[]
  } else {
    recent_submissions = (recent ?? []) as unknown as EngagementSubmission[]
  }

  return { operator_stats, team_entries, recent_submissions, pending_count }
}

// ─── 11. Get engagement config ────────────────────────────────────────────────
export async function getEngagementConfig(): Promise<EngagementConfig[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('engagement_config')
    .select('*')
    .order('config_key', { ascending: true })

  if (error) {
    console.error('[getEngagementConfig]', error.message)
    return []
  }
  return (data ?? []) as EngagementConfig[]
}

// ─── 12. Update engagement config (admin) ────────────────────────────────────
export async function updateEngagementConfig(
  key: string,
  value: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin only' }

  const admin = adminClient()
  const now = new Date().toISOString()

  // Try update first, then insert if not found
  const { data: existing } = await admin
    .from('engagement_config')
    .select('id')
    .eq('config_key', key)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('engagement_config')
      .update({ config_value: value, updated_by: me.id, updated_at: now })
      .eq('config_key', key)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await admin
      .from('engagement_config')
      .insert({ config_key: key, config_value: value, updated_by: me.id, updated_at: now })
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ─── 13. Generate signed URL for proof image ─────────────────────────────────
export async function getSignedProofUrl(storagePath: string): Promise<string | null> {
  const me = await getCurrentUser()
  if (!me) return null

  const admin = adminClient()
  // 1-hour expiry for proof viewing
  const { data } = await admin.storage
    .from('engagement-proofs')
    .createSignedUrl(storagePath, 3600)

  return data?.signedUrl ?? null
}

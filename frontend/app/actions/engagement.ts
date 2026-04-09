'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type {
  EngagementCategory,
  EngagementSubmission,
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
    .select('id, name, is_active, created_at')
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
    .select('id, name, is_active, created_at')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getAllEngagementCategories]', error.message)
    return []
  }
  return (data ?? []) as EngagementCategory[]
}

// ─── 3. Create engagement category (admin) ───────────────────────────────────
export async function createEngagementCategory(
  name: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin only' }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('engagement_categories')
    .insert({ name: name.trim(), is_active: true })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: row!.id as string }
}

// ─── 4. Update engagement category (admin) ───────────────────────────────────
export async function updateEngagementCategory(
  categoryId: string,
  data: { name?: string; is_active?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin only' }

  const admin = adminClient()
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.is_active !== undefined) payload.is_active = data.is_active

  const { error } = await admin
    .from('engagement_categories')
    .update(payload)
    .eq('id', categoryId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 5. Get my submissions (operator) ────────────────────────────────────────
export async function getMyEngagementSubmissions(): Promise<EngagementSubmission[]> {
  const me = await getCurrentUser()
  if (!me) return []

  const admin = adminClient()
  const { data, error } = await admin
    .from('engagement_submissions')
    .select(`
      id, operator_id, category_id, status, proof_url, storage_path, expires_at, created_at,
      category:category_id(id, name, is_active, created_at)
    `)
    .eq('operator_id', me.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[getMyEngagementSubmissions]', error.message)
    return []
  }
  return (data ?? []) as unknown as EngagementSubmission[]
}

// ─── 6. Get all submissions (admin) ─────────────────────────────────────────
export interface SubmissionFilters {
  status?: EngagementSubmission['status'] | 'all'
  operator_id?: string
  category_id?: string
}

export async function getAllEngagementSubmissions(
  filters?: SubmissionFilters
): Promise<EngagementSubmission[]> {
  const me = await getCurrentUser()
  if (!me) return []
  if (!isAdminRole(me.role)) return []

  const admin = adminClient()
  let q = admin
    .from('engagement_submissions')
    .select(`
      id, operator_id, category_id, status, proof_url, storage_path, expires_at, created_at,
      operator:operator_id(full_name),
      category:category_id(id, name, is_active, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters?.operator_id) q = q.eq('operator_id', filters.operator_id)
  if (filters?.category_id) q = q.eq('category_id', filters.category_id)

  const { data, error } = await q
  if (error) {
    console.error('[getAllEngagementSubmissions]', error.message)
    return []
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

  // Insert DB record — all required NOT NULL columns included
  // expires_at is NOT NULL — set to now() + 7 days as required
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const submissionDate = new Date().toISOString().split('T')[0]

  const { data: row, error: insertError } = await admin
    .from('engagement_submissions')
    .insert({
      operator_id: me.id,
      category_id: categoryId,
      storage_path: storagePath,
      proof_url: storagePath,           // legacy compatibility — storage_path is canonical
      status: 'PENDING',
      expires_at: expiresAt,
      submission_date: submissionDate,
      file_size_bytes: file.size,
      mime_type: file.type,
    })
    .select('id')
    .single()

  if (insertError) {
    // Safety: cleanup newly uploaded file on DB failure
    await admin.storage.from('engagement-proofs').remove([storagePath])
    return { success: false, error: insertError.message }
  }

  // Log activity
  await admin.from('engagement_activity_log').insert({
    submission_id: row!.id,
    actor_id: me.id,
    action: 'submitted',
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
  if (existing.status !== 'REJECTED') return { success: false, error: 'Only rejected submissions can be resubmitted' }

  const file = formData.get('proof_file') as File | null
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

  // Step 3+4: Update DB — refresh storage_path, status, and expires_at (spec: expires_at reset on resubmit)
  const refreshedExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await admin
    .from('engagement_submissions')
    .update({
      storage_path: newStoragePath,
      proof_url: newStoragePath,        // keep proof_url in sync (legacy compat)
      status: 'PENDING',
      expires_at: refreshedExpiresAt,
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
  }).select().maybeSingle()

  return { success: true }
}

// ─── 9. Validate submission (admin approve/reject) ────────────────────────────
export async function validateEngagementSubmission(
  submissionId: string,
  decision: 'APPROVED' | 'REJECTED',
  rejectReason?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (!isAdminRole(me.role)) return { success: false, error: 'Admin or manager only' }

  // Enforce reason required for rejections server-side
  if (decision === 'REJECTED' && (!rejectReason || !rejectReason.trim())) {
    return { success: false, error: 'Rejection reason is required' }
  }

  const admin = adminClient()
  const now = new Date().toISOString()

  // Build update payload — include approval/rejection metadata columns
  const updatePayload: Record<string, unknown> = { status: decision }
  if (decision === 'APPROVED') {
    updatePayload.approved_by = me.id
    updatePayload.approved_at = now
  } else {
    updatePayload.rejected_by = me.id
    updatePayload.rejected_at = now
    updatePayload.rejection_reason = rejectReason?.trim() ?? null
  }

  const { error } = await admin
    .from('engagement_submissions')
    .update(updatePayload)
    .eq('id', submissionId)
    .eq('status', 'PENDING')

  if (error) return { success: false, error: error.message }

  // Log decision — encode reason into action field for rejected proofs
  const actionValue = decision === 'REJECTED' && rejectReason?.trim()
    ? `rejected:${rejectReason.trim()}`
    : decision.toLowerCase()

  await admin.from('engagement_activity_log').insert({
    submission_id: submissionId,
    actor_id: me.id,
    action: actionValue,
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

  // Personal stats — use created_at (confirmed standard column)
  const [todayRes, monthRes] = await Promise.all([
    admin
      .from('engagement_submissions')
      .select('status')
      .eq('operator_id', me.id)
      .gte('created_at', todayISO)
      .lt('created_at', tomorrowISO),
    admin
      .from('engagement_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('operator_id', me.id)
      .gte('created_at', monthStartISO),
  ])

  const todayRows = todayRes.data ?? []
  operator_stats = {
    today_submitted: todayRows.length,
    today_approved: todayRows.filter(r => r.status === 'APPROVED').length,
    today_pending: todayRows.filter(r => r.status === 'PENDING').length,
    today_rejected: todayRows.filter(r => r.status === 'REJECTED').length,
    daily_target,
    total_this_month: monthRes.count ?? 0,
  }

  if (isAdminRole(me.role)) {
    // Pending count
    const { count } = await admin
      .from('engagement_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
    pending_count = count ?? 0

    // Team leaderboard for today
    const { data: teamData } = await admin
      .from('engagement_submissions')
      .select('operator_id, status, operator:operator_id(full_name)')
      .gte('created_at', todayISO)
      .lt('created_at', tomorrowISO)

    const teamMap = new Map<string, EngagementTeamEntry>()
    for (const row of teamData ?? []) {
      const id = row.operator_id as string
      const name = ((row.operator as unknown as { full_name: string | null } | null))?.full_name ?? null
      if (!teamMap.has(id)) {
        teamMap.set(id, { operator_id: id, operator_name: name, today_count: 0, approved_count: 0, month_total: 0 })
      }
      const entry = teamMap.get(id)!
      entry.today_count++
      if (row.status === 'APPROVED') entry.approved_count++
    }

    // Month totals per operator
    const { data: monthTeam } = await admin
      .from('engagement_submissions')
      .select('operator_id')
      .gte('created_at', monthStartISO)

    for (const row of monthTeam ?? []) {
      const id = row.operator_id as string
      if (teamMap.has(id)) teamMap.get(id)!.month_total++
    }

    team_entries = Array.from(teamMap.values()).sort((a, b) => b.today_count - a.today_count)

    // Recent pending for admin
    const { data: recent } = await admin
      .from('engagement_submissions')
      .select(`
        id, operator_id, category_id, status, proof_url, storage_path, expires_at, created_at,
        operator:operator_id(full_name),
        category:category_id(id, name, is_active, created_at)
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(10)
    recent_submissions = (recent ?? []) as unknown as EngagementSubmission[]
  } else {
    // Recent for worker
    const { data: recent } = await admin
      .from('engagement_submissions')
      .select(`
        id, operator_id, category_id, status, proof_url, storage_path, expires_at, created_at,
        category:category_id(id, name, is_active, created_at)
      `)
      .eq('operator_id', me.id)
      .order('created_at', { ascending: false })
      .limit(5)
    recent_submissions = (recent ?? []) as unknown as EngagementSubmission[]
  }

  return { operator_stats, team_entries, recent_submissions, pending_count }
}

// ─── 11. Get engagement config ────────────────────────────────────────────────
export async function getEngagementConfig(): Promise<EngagementConfig[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('engagement_config')
    .select('id, config_key, config_value')
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
  // Upsert using only confirmed columns
  const { error } = await admin
    .from('engagement_config')
    .upsert({ config_key: key, config_value: value }, { onConflict: 'config_key' })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 13. Generate signed URL for proof image ─────────────────────────────────
export async function getSignedProofUrl(storagePath: string): Promise<string | null> {
  const me = await getCurrentUser()
  if (!me) return null

  const admin = adminClient()
  const { data } = await admin.storage
    .from('engagement-proofs')
    .createSignedUrl(storagePath, 3600)

  return data?.signedUrl ?? null
}

'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { id: user.id, role: profile?.role ?? null }
}

export interface SCActionResult {
  success: boolean
  error?: string
  sc_ref?: string
  id?: string
}

export interface SocialTaskData {
  title: string
  brief?: string
  assigned_to?: string | null
  platform?: string[]
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'submitted'
  deadline?: string | null
  content_draft?: string | null
}

export async function createSocialTask(data: SocialTaskData): Promise<SCActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('social_tasks')
    .insert({
      title: data.title.trim(),
      brief: data.brief?.trim() || null,
      task_type: 'caption', // only valid task_type enum value
      assigned_to: data.assigned_to || null,
      platform: data.platform ?? [],
      priority: data.priority ?? 'normal',
      status: data.status ?? 'pending',
      deadline: data.deadline || null,
      content_draft: data.content_draft || null,
      created_by: me.id,
    })
    .select('id, sc_ref')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'task_created',
    user_id: me.id,
    metadata: { action_type: 'social_task_created', sc_ref: row?.sc_ref, title: data.title, assigned_to: data.assigned_to },
  })

  return { success: true, sc_ref: row?.sc_ref, id: row?.id }
}

export async function updateSocialTask(
  id: string,
  data: Partial<SocialTaskData>,
  requestingUserId?: string
): Promise<SCActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }

  const admin = adminClient()
  // worker_isolated can only edit their own tasks
  if (me.role === 'worker_isolated') {
    const { data: existing } = await admin.from('social_tasks').select('created_by, assigned_to').eq('id', id).single()
    if (existing?.created_by !== me.id && existing?.assigned_to !== me.id) {
      return { success: false, error: 'You can only edit tasks assigned to you.' }
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) updates.title = data.title.trim()
  if (data.brief !== undefined) updates.brief = data.brief?.trim() || null
  if (data.assigned_to !== undefined) updates.assigned_to = data.assigned_to
  if (data.platform !== undefined) updates.platform = data.platform
  if (data.priority !== undefined) updates.priority = data.priority
  if (data.status !== undefined) updates.status = data.status
  if (data.deadline !== undefined) updates.deadline = data.deadline || null
  if (data.content_draft !== undefined) updates.content_draft = data.content_draft

  const { data: row, error } = await admin
    .from('social_tasks')
    .update(updates)
    .eq('id', id)
    .select('sc_ref')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'task_assigned',
    user_id: me.id,
    metadata: { action_type: 'social_task_updated', sc_ref: row?.sc_ref, changes: Object.keys(updates) },
  })

  return { success: true, sc_ref: row?.sc_ref }
}

export async function submitSocialTask(id: string): Promise<SCActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('social_tasks')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('sc_ref, title')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'stage_submitted',
    user_id: me.id,
    metadata: { action_type: 'social_task_submitted', sc_ref: row?.sc_ref, title: row?.title },
  })

  return { success: true, sc_ref: row?.sc_ref }
}

export async function deleteSocialTask(id: string): Promise<SCActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }

  const admin = adminClient()
  if (me.role === 'worker_isolated') {
    const { data: existing } = await admin.from('social_tasks').select('created_by, assigned_to').eq('id', id).single()
    if (existing?.created_by !== me.id && existing?.assigned_to !== me.id) {
      return { success: false, error: 'You can only delete your own tasks.' }
    }
  }

  const { data: row } = await admin.from('social_tasks').select('sc_ref, title').eq('id', id).single()
  const { error } = await admin.from('social_tasks').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'task_assigned',
    user_id: me.id,
    metadata: { action_type: 'social_task_deleted', sc_ref: row?.sc_ref, title: row?.title },
  })

  return { success: true }
}

export interface SocialTaskRow {
  id: string
  sc_ref: string
  task_type: string
  title: string
  brief: string | null
  platform: string[] | null
  assigned_to: string | null
  priority: string
  status: string
  content_draft: string | null
  submitted_at: string | null
  deadline: string | null
  created_by: string
  created_at: string
  updated_at: string
  assignee_name?: string | null
}

export async function fetchAllSocialTasks(): Promise<SocialTaskRow[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('social_tasks')
    .select('*, assignee:assigned_to(full_name)')
    .order('created_at', { ascending: false })

  if (error) return []
  return (data || []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as SocialTaskRow),
    assignee_name: (r.assignee as { full_name?: string } | null)?.full_name ?? null,
  }))
}

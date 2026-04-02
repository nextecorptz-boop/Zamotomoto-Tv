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

export interface SPActionResult {
  success: boolean
  error?: string
  sp_ref?: string
  id?: string
}

export interface SpecialProjectData {
  title: string
  description?: string
  owner_id: string
  urgency: 'standard' | 'breaking' | 'high' | 'critical'
  status: 'draft' | 'active' | 'archived'
  progress_pct?: number
  deadline?: string | null
}

export async function createSpecialProject(data: SpecialProjectData): Promise<SPActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'super_admin' && me.role !== 'admin') return { success: false, error: 'Insufficient permissions' }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('special_projects')
    .insert({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      owner_id: data.owner_id,
      urgency: data.urgency,
      status: data.status,
      progress_pct: data.progress_pct ?? 0,
      deadline: data.deadline || null,
      created_by: me.id,
    })
    .select('id, sp_ref')
    .single()

  if (error) return { success: false, error: error.message }

  // Log to activity_log
  await admin.from('activity_log').insert({
    action: 'user_invited',
    user_id: me.id,
    sp_id: row?.sp_ref ? null : null, // sp_id is UUID on activity_log but sp_ref is text — use metadata
    metadata: {
      action_type: 'special_project_created',
      sp_ref: row?.sp_ref,
      title: data.title,
      urgency: data.urgency,
      status: data.status,
      owner_id: data.owner_id,
    },
  })

  return { success: true, sp_ref: row?.sp_ref, id: row?.id }
}

export async function updateSpecialProject(
  id: string,
  data: Partial<SpecialProjectData>
): Promise<SPActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'super_admin' && me.role !== 'admin') return { success: false, error: 'Insufficient permissions' }

  const admin = adminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) updates.title = data.title.trim()
  if (data.description !== undefined) updates.description = data.description?.trim() || null
  if (data.owner_id !== undefined) updates.owner_id = data.owner_id
  if (data.urgency !== undefined) updates.urgency = data.urgency
  if (data.status !== undefined) updates.status = data.status
  if (data.progress_pct !== undefined) updates.progress_pct = data.progress_pct
  if (data.deadline !== undefined) updates.deadline = data.deadline || null

  const { data: row, error } = await admin
    .from('special_projects')
    .update(updates)
    .eq('id', id)
    .select('sp_ref')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'user_invited',
    user_id: me.id,
    metadata: { action_type: 'special_project_updated', sp_ref: row?.sp_ref, changes: updates },
  })

  return { success: true, sp_ref: row?.sp_ref }
}

export async function deleteSpecialProject(id: string): Promise<SPActionResult> {
  const me = await getCurrentUser()
  if (!me) return { success: false, error: 'Not authenticated' }
  if (me.role !== 'super_admin' && me.role !== 'admin') return { success: false, error: 'Insufficient permissions' }

  const admin = adminClient()
  const { data: row } = await admin.from('special_projects').select('sp_ref, title').eq('id', id).single()

  const { error } = await admin.from('special_projects').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_log').insert({
    action: 'user_invited',
    user_id: me.id,
    metadata: { action_type: 'special_project_deleted', sp_ref: row?.sp_ref, title: row?.title },
  })

  return { success: true }
}

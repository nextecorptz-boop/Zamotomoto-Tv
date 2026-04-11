'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Role } from '@/types'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface UpdateProfileResult {
  success: boolean
  error?: string
}

/** Update role, department, or is_active on a profile. Logs to activity_log. */
export async function updateProfile(
  targetId: string,
  updates: { role?: Role; department?: string | null; is_active?: boolean }
): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // Both super_admin and admin may call this action
  if (me?.role !== 'super_admin' && me?.role !== 'admin') {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Admin cannot modify a super_admin account (server-side enforcement)
  if (me?.role === 'admin') {
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', targetId)
      .single()
    if (target?.role === 'super_admin') {
      return { success: false, error: 'Admins cannot modify a Super Admin account' }
    }
  }

  const admin = getAdminClient()

  const { error } = await admin.from('profiles').update(updates).eq('id', targetId)
  if (error) return { success: false, error: error.message }

  // Log to activity_log using nearest valid enum action
  await admin.from('activity_log').insert({
    action: 'user_invited', // closest valid enum for user management actions
    user_id: user.id,
    metadata: {
      action_type: 'profile_updated',
      target_user_id: targetId,
      changes: updates,
    },
  })

  return { success: true }
}

export interface ActivityLogEntry {
  id: string
  action: string
  user_id: string
  task_id: string | null
  sp_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor_name: string | null
}

export interface FetchLogsResult {
  logs: ActivityLogEntry[]
  total: number
}

/** Paginated activity logs with actor name joined from profiles. */
export async function fetchActivityLogs(
  page: number = 1,
  limit: number = 20
): Promise<FetchLogsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { logs: [], total: 0 }

  const admin = getAdminClient()
  const offset = (page - 1) * limit

  const [{ data: logs, error }, { count }] = await Promise.all([
    admin
      .from('activity_log')
      .select('*, actor:user_id(full_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    admin
      .from('activity_log')
      .select('id', { count: 'exact', head: true }),
  ])

  if (error) return { logs: [], total: 0 }

  const mapped: ActivityLogEntry[] = (logs || []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    action: l.action as string,
    user_id: l.user_id as string,
    task_id: l.task_id as string | null,
    sp_id: l.sp_id as string | null,
    metadata: l.metadata as Record<string, unknown> | null,
    created_at: l.created_at as string,
    actor_name: (l.actor as { full_name?: string } | null)?.full_name ?? null,
  }))

  return { logs: mapped, total: count ?? 0 }
}

export interface SystemStats {
  total: number
  active: number
  inactive: number
  byRole: Record<string, number>
  byDept: Record<string, number>
  totalLogs: number
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const admin = getAdminClient()

  const [{ data: profiles }, { count: logCount }] = await Promise.all([
    admin.from('profiles').select('role, department, is_active'),
    admin.from('activity_log').select('id', { count: 'exact', head: true }),
  ])

  const list = profiles || []
  const byRole: Record<string, number> = {}
  const byDept: Record<string, number> = {}

  for (const p of list) {
    byRole[p.role] = (byRole[p.role] ?? 0) + 1
    const d = p.department ?? 'Unassigned'
    byDept[d] = (byDept[d] ?? 0) + 1
  }

  return {
    total: list.length,
    active: list.filter(p => p.is_active).length,
    inactive: list.filter(p => !p.is_active).length,
    byRole,
    byDept,
    totalLogs: logCount ?? 0,
  }
}

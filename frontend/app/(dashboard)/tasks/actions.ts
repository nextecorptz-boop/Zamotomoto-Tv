'use server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Task } from '@/types'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── Fetch tasks list (bypasses recursive SELECT policy) ──────────────────────
export async function fetchTasks(
  filterPriority?: string,
  userId?: string,
  isAdminOrAbove?: boolean
): Promise<Task[]> {
  const admin = adminClient()
  let query = admin.from('tasks').select('*').order('created_at', { ascending: false })
  if (filterPriority && filterPriority !== 'all') query = query.eq('priority', filterPriority)
  // Non-admins only see their own assigned tasks
  if (!isAdminOrAbove && userId) query = query.eq('assigned_to', userId)
  const { data } = await query
  return (data ?? []) as Task[]
}

// ─── Fetch single task by ID (bypasses recursive SELECT policy) ───────────────
export async function fetchTaskById(taskId: string): Promise<Task | null> {
  const admin = adminClient()
  const { data } = await admin
    .from('tasks')
    .select('*, assignee:assigned_to(id,full_name,avatar_url)')
    .eq('id', taskId)
    .single()
  return data as Task | null
}

// ─── Create a task (bypasses recursive SELECT on RETURNING) ───────────────────
export interface CreateTaskData {
  title: string
  brief?: string | null
  current_stage?: string
  priority: string
  assigned_to?: string | null
  special_project_id?: string | null
  deadline?: string | null
  publish_target: string[]
  created_by: string
}

export async function createTask(
  data: CreateTaskData
): Promise<{ id: string; task_ref: string } | { error: string }> {
  const admin = adminClient()
  const { data: result, error } = await admin
    .from('tasks')
    .insert({
      title: data.title,
      brief: data.brief ?? null,
      current_stage: data.current_stage ?? 'script',
      priority: data.priority,
      assigned_to: data.assigned_to ?? null,
      special_project_id: data.special_project_id ?? null,
      deadline: data.deadline ?? null,
      publish_target: data.publish_target.length > 0 ? data.publish_target : ['youtube', 'instagram'],
      created_by: data.created_by,
      updated_at: new Date().toISOString(),
    })
    .select('id, task_ref')
    .single()

  if (error) return { error: error.message }
  return result as { id: string; task_ref: string }
}

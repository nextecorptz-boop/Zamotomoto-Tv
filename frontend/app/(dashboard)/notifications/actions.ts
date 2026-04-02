'use server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface ActivityItem {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// Fetch recent activity log entries (bypasses RLS — admin read only)
export async function fetchRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('activity_log')
    .select('id, action, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[fetchRecentActivity] error:', error.message)
    return []
  }

  return (data ?? []) as ActivityItem[]
}

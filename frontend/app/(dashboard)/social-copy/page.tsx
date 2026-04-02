import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { SocialCopyClient } from '@/components/social-copy/SocialCopyClient'
import { fetchAllSocialTasks, type SocialTaskRow } from './actions'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  id: string
  full_name: string | null
  role: string
}

export default async function SocialCopyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const currentRole = (profileData?.role as string) ?? 'worker_standard'

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
    .order('full_name')

  let tasks: SocialTaskRow[]

  if (currentRole === 'worker_isolated') {
    // Isolated workers see only tasks they created or are assigned to
    const { data } = await admin
      .from('social_tasks')
      .select('*, assignee:assigned_to(full_name)')
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .order('created_at', { ascending: false })

    tasks = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      sc_ref: r.sc_ref as string,
      task_type: r.task_type as string,
      title: r.title as string,
      brief: (r.brief as string | null) ?? null,
      platform: (r.platform as string[] | null) ?? null,
      assigned_to: (r.assigned_to as string | null) ?? null,
      priority: r.priority as string,
      status: r.status as string,
      content_draft: (r.content_draft as string | null) ?? null,
      submitted_at: (r.submitted_at as string | null) ?? null,
      deadline: (r.deadline as string | null) ?? null,
      created_by: r.created_by as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      assignee_name: (r.assignee as { full_name?: string } | null)?.full_name ?? null,
    }))
  } else {
    tasks = await fetchAllSocialTasks()
  }

  return (
    <SocialCopyClient
      initialTasks={tasks}
      profiles={((profiles ?? []) as ProfileRow[]).map(p => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
      }))}
      currentUserId={user.id}
      currentRole={currentRole}
    />
  )
}

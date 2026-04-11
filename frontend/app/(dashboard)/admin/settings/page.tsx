import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient'
import type { Profile } from '@/types'
import { fetchSystemStats } from './actions'
import { fetchAllSocialTasks } from '@/app/(dashboard)/social-copy/actions'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // Both super_admin and admin have access; all other roles are redirected home
  if (me?.role !== 'super_admin' && me?.role !== 'admin') redirect('/')

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch emails from auth.users via admin API (profiles has no email col)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const emailMap: Record<string, string> = {}
  for (const u of (authUsers?.users ?? [])) {
    if (u.email) emailMap[u.id] = u.email
  }

  // Stats and social tasks
  const [stats, socialTasks] = await Promise.all([
    fetchSystemStats(),
    fetchAllSocialTasks(),
  ])

  const membersWithEmail = ((profiles ?? []) as Profile[]).map(p => ({
    ...p,
    email: emailMap[p.id] ?? '—',
  }))

  return (
    <AdminSettingsClient
      profiles={membersWithEmail}
      currentUserId={user.id}
      currentUserRole={me!.role as import('@/types').Role}
      stats={stats}
      socialTasks={socialTasks}
    />
  )
}

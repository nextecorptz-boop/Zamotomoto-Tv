import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Profile, Role } from '@/types'
import { TeamPageClient } from '@/components/team/TeamPageClient'
import type { ProfileWithEmail } from '@/components/admin/AdminSettingsClient'

export default async function TeamPage() {
  const supabase = await createClient()

  // Fetch current user identity and role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const isSuperAdmin = currentProfile?.role === 'super_admin'
  const isAdminOrAbove = isSuperAdmin || currentProfile?.role === 'admin'

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch emails via service-role client (profiles has no email column)
  let emailMap: Record<string, string> = {}
  if (isAdminOrAbove) {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    for (const u of authUsers?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email
    }
  }

  const membersWithEmail = ((profiles ?? []) as Profile[]).map(p => ({
    ...p,
    email: emailMap[p.id] ?? '—',
  })) as ProfileWithEmail[]

  return (
    <TeamPageClient
      members={membersWithEmail}
      currentUserId={user?.id ?? ''}
      currentUserRole={(currentProfile?.role ?? 'worker_standard') as Role}
      isSuperAdmin={isSuperAdmin}
    />
  )
}

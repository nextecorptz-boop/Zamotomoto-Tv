import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { SpecialProjectsClient } from '@/components/special-projects/SpecialProjectsClient'
import type { SpecialProject } from '@/types'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  id: string
  full_name: string | null
  role: string
}

export default async function SpecialProjectsPage() {
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

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    admin
      .from('special_projects')
      .select('*')
      .order('created_at', { ascending: false }),
    admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true)
      .order('full_name'),
  ])

  return (
    <SpecialProjectsClient
      initialProjects={(projects ?? []) as SpecialProject[]}
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

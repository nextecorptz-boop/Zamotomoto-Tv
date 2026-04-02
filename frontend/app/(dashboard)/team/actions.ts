'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Role } from '@/types'

export interface InviteResult {
  success: boolean
  error?: string
  tempPassword?: string
  userId?: string
}

export async function inviteTeamMember(data: {
  full_name: string
  email: string
  role: Role
  department: string
}): Promise<InviteResult> {
  // 1. Auth guard — only super_admin may invite
  const supabase = await createClient()
  const { data: { user }, error: sessionErr } = await supabase.auth.getUser()
  if (sessionErr || !user) return { success: false, error: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'super_admin') {
    return { success: false, error: 'Only super admins can invite members.' }
  }

  // 2. Admin client (service role) for user creation
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 3. Generate a temporary password (shown once to the inviting admin)
  const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  const tempPassword = `ZMM-${rand()}-${rand()}`

  // 4. Create auth user (email auto-confirmed so they can log in immediately)
  const { data: created, error: authErr } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authErr) return { success: false, error: authErr.message }

  const newUserId = created.user.id

  // 5. Insert profile row
  const { error: profileErr } = await adminClient
    .from('profiles')
    .insert({
      id: newUserId,
      full_name: data.full_name.trim(),
      role: data.role,
      department: data.department || null,
      is_active: true,
      invited_by: user.id,
    })

  if (profileErr) {
    // Roll back: remove the orphaned auth user
    await adminClient.auth.admin.deleteUser(newUserId)
    return { success: false, error: profileErr.message }
  }

  return { success: true, tempPassword, userId: newUserId }
}

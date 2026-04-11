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

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
  const adminClient = getAdminClient()

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

// ─── Delete team member ──────────────────────────────────────────────────────
export interface DeleteMemberResult {
  success: boolean
  error?: string
  /** auth_delete_failed=true means profile was deactivated but auth.admin.deleteUser failed */
  auth_delete_failed?: boolean
}

export async function deleteTeamMember(targetId: string): Promise<DeleteMemberResult> {
  // 1. Auth guard
  const supabase = await createClient()
  const { data: { user }, error: sessionErr } = await supabase.auth.getUser()
  if (sessionErr || !user) return { success: false, error: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const callerRole = callerProfile?.role
  if (callerRole !== 'super_admin' && callerRole !== 'admin') {
    return { success: false, error: 'Insufficient permissions' }
  }

  // 2. Cannot delete yourself
  if (targetId === user.id) {
    return { success: false, error: 'You cannot delete your own account' }
  }

  // 3. Server-side guard: admin cannot delete a super_admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetId)
    .single()

  if (!targetProfile) return { success: false, error: 'Target user not found' }

  if (callerRole === 'admin' && targetProfile.role === 'super_admin') {
    return { success: false, error: 'Admins cannot delete a Super Admin account' }
  }

  const adminClient = getAdminClient()

  // 4. Soft-delete: deactivate profile first (preserves FK integrity across tables)
  const { error: deactivateErr } = await adminClient
    .from('profiles')
    .update({ is_active: false })
    .eq('id', targetId)

  if (deactivateErr) {
    return { success: false, error: deactivateErr.message }
  }

  // 5. Hard-delete auth user — fail gracefully; profile is already deactivated
  const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(targetId)
  if (authDeleteErr) {
    // Profile is deactivated so the user cannot log in; report partial success
    console.error('[deleteTeamMember] auth.admin.deleteUser failed:', authDeleteErr.message)
    return { success: true, auth_delete_failed: true }
  }

  return { success: true }
}

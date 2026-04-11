import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /settings is a smart redirect gate:
 * - super_admin + admin  → /admin/settings (full control panel)
 * - everyone else        → / (home, no access)
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role === 'super_admin' || role === 'admin') {
    redirect('/admin/settings')
  }

  redirect('/')
}

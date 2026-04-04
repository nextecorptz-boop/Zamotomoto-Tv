import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Route guard for all /accounting/* routes
// Workers (worker_standard / worker_isolated) are blocked.
// Accountants may access /accounting/workspace but NOT /accounting (handled per-page).
export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  // Workers cannot access any accounting route
  if (role === 'worker_standard' || role === 'worker_isolated') {
    redirect('/')
  }

  return <>{children}</>
}

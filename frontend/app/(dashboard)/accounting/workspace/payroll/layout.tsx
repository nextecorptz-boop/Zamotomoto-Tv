import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Route guard for /accounting/workspace/payroll/* routes
// Workers are blocked.
export default async function WorkspacePayrollLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  if (role === 'worker_standard' || role === 'worker_isolated') {
    redirect('/')
  }

  return <>{children}</>
}

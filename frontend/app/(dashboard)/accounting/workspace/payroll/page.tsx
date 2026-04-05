import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPayrollMonthList } from './payroll-actions'
import AccountantPayrollWorkspaceClient from '@/components/accounting/payroll/AccountantPayrollWorkspaceClient'

export default async function AccountantPayrollWorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  if (role === 'super_admin' || role === 'admin') redirect('/accounting/payroll')
  if (role !== 'accountant') redirect('/')

  const months = await getPayrollMonthList()

  return <AccountantPayrollWorkspaceClient months={months} />
}

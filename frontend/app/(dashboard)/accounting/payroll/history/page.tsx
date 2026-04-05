import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPayrollHistory } from '../admin-payroll-actions'
import PayrollHistoryClient from '@/components/accounting/payroll/PayrollHistoryClient'

export default async function PayrollHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null
  if (role !== 'super_admin' && role !== 'admin') redirect('/')

  const history = await getPayrollHistory()

  return <PayrollHistoryClient history={history} />
}

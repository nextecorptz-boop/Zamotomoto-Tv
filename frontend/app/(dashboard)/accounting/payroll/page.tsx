import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPayrollEntries, getPayrollSummary } from './actions'
import AdminPayrollClient from '@/components/accounting/payroll/AdminPayrollClient'

// Admin payroll dashboard — super_admin and admin only.
// Accountants are redirected to their workspace.
export default async function AdminPayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  if (role === 'accountant') redirect('/accounting/workspace/payroll')
  if (role !== 'super_admin' && role !== 'admin') redirect('/')

  const [entries, summary] = await Promise.all([
    getPayrollEntries(),
    getPayrollSummary(),
  ])

  return <AdminPayrollClient entries={entries} summary={summary} />
}

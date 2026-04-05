import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPayrollMonth } from '../payroll-actions'
import PayrollBatchPreparationClient from '@/components/accounting/payroll/PayrollBatchPreparationClient'

interface Props {
  params: Promise<{ month_id: string }>
}

export default async function PayrollBatchPreparationPage({ params }: Props) {
  const { month_id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null
  if (role !== 'accountant') redirect('/')

  const monthDetail = await getPayrollMonth(month_id)
  if (!monthDetail) redirect('/accounting/workspace/payroll')

  return <PayrollBatchPreparationClient monthDetail={monthDetail} />
}

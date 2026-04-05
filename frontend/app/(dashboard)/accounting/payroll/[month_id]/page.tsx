import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPayrollMonth } from '../../workspace/payroll/payroll-actions'
import AdminPayrollReviewClient from '@/components/accounting/payroll/AdminPayrollReviewClient'

interface Props {
  params: Promise<{ month_id: string }>
}

export default async function AdminPayrollMonthPage({ params }: Props) {
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
  if (role !== 'super_admin' && role !== 'admin') redirect('/')

  const monthDetail = await getPayrollMonth(month_id)

  return <AdminPayrollReviewClient monthDetail={monthDetail} month_id={month_id} />
}

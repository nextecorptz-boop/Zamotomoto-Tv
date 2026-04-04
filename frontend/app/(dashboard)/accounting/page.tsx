import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountingEntries, getAccountingSummary, getAccountingCategories } from './actions'
import { AdminAccountingClient } from '@/components/accounting/AdminAccountingClient'

// Admin view — super_admin and admin only.
// Accountants are redirected to workspace.
export default async function AccountingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  if (role === 'accountant') redirect('/accounting/workspace')
  if (role !== 'super_admin' && role !== 'admin') redirect('/')

  const [entries, summary, categories] = await Promise.all([
    getAccountingEntries(),
    getAccountingSummary(),
    getAccountingCategories(),
  ])

  return (
    <AdminAccountingClient
      entries={entries}
      summary={summary}
      categories={categories}
    />
  )
}

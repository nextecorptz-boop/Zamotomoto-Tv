import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountingEntries, getAccountingCategories } from '../actions'
import { AccountantWorkspaceClient } from '@/components/accounting/AccountantWorkspaceClient'

// Accountant workspace — accountant role only.
// Admins are redirected to the full dashboard view.
export default async function AccountingWorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  if (role === 'super_admin' || role === 'admin') redirect('/accounting')
  if (role !== 'accountant') redirect('/')

  const [entries, categories] = await Promise.all([
    getAccountingEntries(),
    getAccountingCategories(),
  ])

  return (
    <AccountantWorkspaceClient
      entries={entries}
      categories={categories}
    />
  )
}

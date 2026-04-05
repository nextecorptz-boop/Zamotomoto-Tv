import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSalaryRecords } from '../../payroll/salary-actions'
import SalaryRecordsClient from '@/components/accounting/payroll/SalaryRecordsClient'

// Accountant read-only salary records view
export default async function AccountantSalaryRecordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null
  if (role !== 'accountant' && role !== 'super_admin' && role !== 'admin') redirect('/')

  const employees = await getSalaryRecords()

  const isAdmin = role === 'super_admin' || role === 'admin'

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/accounting/workspace/payroll" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>← PAYROLL WORKSPACE</a>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>SALARY RECORDS</h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          {isAdmin ? 'Admin view — records are editable' : 'Read-only view — salary records set by admin'}
        </p>
      </div>
      <SalaryRecordsClient employees={employees} isAdmin={isAdmin} />
    </div>
  )
}

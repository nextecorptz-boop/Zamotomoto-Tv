import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveEngagementCategories, getEngagementDashboard } from '@/app/actions/engagement'
import { SubmitProofForm } from '@/components/engagement/operator/SubmitProofForm'

export default async function EngagementSubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  // Only workers can submit
  if (!role || role === 'accountant') redirect('/')
  if (role === 'super_admin' || role === 'admin') redirect('/engagement/validate')

  const [categories, dashData] = await Promise.all([
    getActiveEngagementCategories(),
    getEngagementDashboard(),
  ])

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
          SUBMIT PROOF
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          Upload your engagement proof for review
        </p>
      </div>

      <SubmitProofForm
        categories={categories}
        dailyTarget={dashData.operator_stats.daily_target}
        todaySubmitted={dashData.operator_stats.today_submitted}
      />
    </div>
  )
}

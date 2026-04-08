import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEngagementDashboard } from '@/app/actions/engagement'
import { EngagementDashboardClient } from '@/components/engagement/EngagementDashboardClient'

export default async function EngagementDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null
  if (!role || role === 'accountant') redirect('/')

  const dashboardData = await getEngagementDashboard()

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
          ENGAGEMENT DESK
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          Engagement Tracking — {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
        </p>
      </div>

      <EngagementDashboardClient
        data={dashboardData}
        role={role}
        userName={profile?.full_name ?? null}
      />
    </div>
  )
}

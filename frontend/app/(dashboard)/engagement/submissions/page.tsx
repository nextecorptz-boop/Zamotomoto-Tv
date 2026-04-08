import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyEngagementSubmissions } from '@/app/actions/engagement'
import { MySubmissionsClient } from '@/components/engagement/operator/MySubmissionsClient'

export default async function EngagementSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null
  if (!role || role === 'accountant') redirect('/')

  const submissions = await getMyEngagementSubmissions()

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
              MY SUBMISSIONS
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
              Your engagement proof history
            </p>
          </div>
          {(role === 'worker_standard' || role === 'worker_isolated') && (
            <a
              href="/engagement/submit"
              data-testid="new-submission-link"
              style={{ background: '#CC1F1F', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.15em', padding: '0.5rem 1.25rem', textDecoration: 'none', alignSelf: 'center' }}
            >
              + NEW SUBMISSION
            </a>
          )}
        </div>
      </div>

      <MySubmissionsClient submissions={submissions} />
    </div>
  )
}

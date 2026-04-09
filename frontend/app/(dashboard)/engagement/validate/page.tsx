import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllEngagementSubmissions } from '@/app/actions/engagement'
import { ValidateQueueClient } from '@/components/engagement/manager/ValidateQueueClient'

export default async function EngagementValidatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null

  // Only admins can validate
  if (role !== 'super_admin' && role !== 'admin') redirect('/engagement/dashboard')

  const submissions = await getAllEngagementSubmissions({ status: 'PENDING' })

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
              VALIDATION QUEUE
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
              Review and approve operator engagement proofs
            </p>
          </div>
          <a
            href="/engagement/admin/categories"
            data-testid="admin-categories-link"
            style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0.4rem 0.85rem', textDecoration: 'none', alignSelf: 'center' }}
          >
            MANAGE CATEGORIES
          </a>
        </div>
      </div>

      <ValidateQueueClient submissions={submissions} />
    </div>
  )
}

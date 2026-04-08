import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEngagementConfig } from '@/app/actions/engagement'
import { EngagementSettingsClient } from '@/components/engagement/admin/EngagementSettingsClient'

export default async function EngagementSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | null
  if (role !== 'super_admin' && role !== 'admin') redirect('/engagement/dashboard')

  const configs = await getEngagementConfig()
  // Surface config error if daily_target is missing
  const configError = !configs.find(c => c.config_key === 'default_daily_target')

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
              ENGAGEMENT SETTINGS
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
              Configure targets, limits, and engagement behaviour
            </p>
          </div>
          <a
            href="/engagement/admin/categories"
            style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0.4rem 0.85rem', textDecoration: 'none', alignSelf: 'center' }}
          >
            MANAGE CATEGORIES
          </a>
        </div>
      </div>

      <EngagementSettingsClient configs={configs} configError={configError} />
    </div>
  )
}

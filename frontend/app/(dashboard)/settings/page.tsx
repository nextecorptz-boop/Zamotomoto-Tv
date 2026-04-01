import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROLE_LABELS } from '@/lib/constants'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#CC1F1F' }}>ACCESS DENIED</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#888888' }}>
          System settings are restricted to Super Admin only.
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#666666' }}>
          Your role: <span style={{ color: '#FFFFFF' }}>{ROLE_LABELS[profile?.role || 'worker_standard']}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>System Settings</h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>
          Super Admin — system configuration
        </p>
      </div>

      {/* System Info */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>SYSTEM INFORMATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem' }}>
          {[
            ['System', 'ZAMOTOMOTO TV — Media Operations'],
            ['Version', '1.0.0'],
            ['Environment', 'Production'],
            ['Database', 'Supabase PostgreSQL'],
            ['Timezone', 'Africa/Nairobi (EAT UTC+3)'],
            ['Super Admin', profile?.full_name || profile?.email || '—'],
          ].map(([label, value]) => (
            <React.Fragment key={label}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF' }}>{value}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Role limits */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>ROLE LIMITS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { role: 'super_admin', limit: 'Max 1', color: '#CC1F1F' },
            { role: 'admin', limit: 'Max 2', color: '#F59E0B' },
            { role: 'worker_standard', limit: 'Unlimited', color: '#22C55E' },
            { role: 'worker_isolated', limit: 'Unlimited (Social Only)', color: '#8B5CF6' },
          ].map(item => (
            <div key={item.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: item.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ROLE_LABELS[item.role]}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888' }}>{item.limit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline stages */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>PIPELINE STAGES</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', lineHeight: 1.8 }}>
          Script → Voice → Editing → Publishing
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#666666' }}>
          Stage transitions are logged to activity_log automatically.
        </div>
      </div>
    </div>
  )
}

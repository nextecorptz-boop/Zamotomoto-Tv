import { createClient } from '@/lib/supabase/server'
import { formatDate, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile } from '@/types'
import Link from 'next/link'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const members = (profiles || []) as Profile[]
  const admins = members.filter(m => m.role === 'admin' || m.role === 'super_admin')
  const workers = members.filter(m => m.role !== 'admin' && m.role !== 'super_admin')

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Team</h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>{members.length} members</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {[
          { label: 'Total Members', value: members.length },
          { label: 'Admins', value: admins.length, color: '#CC1F1F' },
          { label: 'Staff', value: workers.filter(m => m.role === 'worker_standard').length, color: '#22C55E' },
          { label: 'Social Team', value: workers.filter(m => m.role === 'worker_isolated').length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{s.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: s.color || '#FFFFFF', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2A2A2A' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>ALL MEMBERS</div>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 140px 120px', gap: '0.5rem', padding: '0.4rem 1.5rem', borderBottom: '1px solid #1A1A1A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span></span><span>Member</span><span>Role</span><span>Department</span><span>Joined</span>
          </div>
          {members.map(member => (
            <div
              key={member.id}
              data-testid={`team-member-${member.id}`}
              style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 140px 120px', gap: '0.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid #1A1A1A', alignItems: 'center', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1A1A1A'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '9999px', background: member.role === 'super_admin' || member.role === 'admin' ? '#CC1F1F' : '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#FFFFFF' }}>
                {getInitials(member.full_name || member.email || '')}
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#FFFFFF' }}>{member.full_name || member.email || '—'}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#666666' }}>{member.email || '—'}</div>
              </div>
              <div>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: member.role === 'super_admin' ? '#CC1F1F' : member.role === 'admin' ? '#F59E0B' : '#22C55E',
                  border: `1px solid ${member.role === 'super_admin' ? '#CC1F1F' : member.role === 'admin' ? '#F59E0B' : '#2A2A2A'}`,
                  padding: '0.1rem 0.4rem',
                }}>
                  {ROLE_LABELS[member.role]}
                </span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', textTransform: 'uppercase' }}>
                {member.department || '—'}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#666666' }}>
                {formatDate(member.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

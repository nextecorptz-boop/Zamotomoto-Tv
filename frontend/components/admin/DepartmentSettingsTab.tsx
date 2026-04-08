'use client'
import { DEPT_LABELS } from '@/lib/constants'
import type { ProfileWithEmail } from './AdminSettingsClient'

const DEPTS = [
  { id: 'script', label: 'Script', color: '#CC1F1F' },
  { id: 'voice', label: 'Voice', color: '#F59E0B' },
  { id: 'editing', label: 'Editing', color: '#22C55E' },
  { id: 'publishing', label: 'Publishing', color: '#8B5CF6' },
  { id: 'social_copy', label: 'Engagement', color: '#06B6D4' },
]

interface Props {
  profiles: ProfileWithEmail[]
}

export function DepartmentSettingsTab({ profiles }: Props) {
  const activeProfiles = profiles.filter(p => p.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888' }}>
        Department worker assignment (active members only)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {DEPTS.map(dept => {
          const assigned = activeProfiles.filter(p => p.department === dept.id)
          const workers = assigned.filter(p => p.role === 'worker_standard' || p.role === 'worker_isolated')
          const admins = assigned.filter(p => p.role === 'admin' || p.role === 'super_admin')

          return (
            <div
              key={dept.id}
              data-testid={`dept-settings-${dept.id}`}
              style={{ background: '#111111', padding: '1.5rem', borderLeft: `3px solid ${dept.color}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.1em', color: dept.color }}>
                  {dept.label}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: dept.color, border: `1px solid ${dept.color}`, padding: '0.15rem 0.5rem', letterSpacing: '0.1em' }}>
                  {assigned.length} assigned
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Total', value: assigned.length, color: '#FFFFFF' },
                  { label: 'Workers', value: workers.length, color: '#22C55E' },
                  { label: 'Admins', value: admins.length, color: '#F59E0B' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#1A1A1A', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Members list */}
              {assigned.length === 0 ? (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#444444' }}>No members assigned</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {assigned.slice(0, 4).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem' }}>
                      <span style={{ color: '#CCCCCC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name || p.email}</span>
                      <span style={{ color: '#666666', flexShrink: 0, marginLeft: '0.5rem' }}>{p.role.replace('worker_', '')}</span>
                    </div>
                  ))}
                  {assigned.length > 4 && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888' }}>+{assigned.length - 4} more</div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Unassigned */}
        {(() => {
          const unassigned = activeProfiles.filter(p => !p.department || !DEPTS.some(d => d.id === p.department))
          return (
            <div
              data-testid="dept-settings-unassigned"
              style={{ background: '#111111', padding: '1.5rem', borderLeft: '3px solid #2A2A2A' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.1em', color: '#888888' }}>UNASSIGNED</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', border: '1px solid #2A2A2A', padding: '0.15rem 0.5rem', letterSpacing: '0.1em' }}>
                  {unassigned.length} members
                </div>
              </div>
              {unassigned.length === 0 ? (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#444444' }}>All members assigned</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {unassigned.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem' }}>
                      <span style={{ color: '#CCCCCC' }}>{p.full_name || p.email}</span>
                      <span style={{ color: '#666666' }}>{p.role.replace('worker_', '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

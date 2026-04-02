'use client'
import { ROLE_LABELS } from '@/lib/constants'
import type { SystemStats } from '@/app/(dashboard)/admin/settings/actions'
import type { ProfileWithEmail } from './AdminSettingsClient'

interface Props {
  stats: SystemStats
  profiles: ProfileWithEmail[]
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#CC1F1F',
  admin: '#F59E0B',
  worker_standard: '#22C55E',
  worker_isolated: '#06B6D4',
}

const DEPT_COLORS: Record<string, string> = {
  script: '#CC1F1F',
  voice: '#F59E0B',
  editing: '#22C55E',
  publishing: '#8B5CF6',
  social_copy: '#06B6D4',
  Unassigned: '#2A2A2A',
}

export function SystemStatusTab({ stats, profiles }: Props) {
  const maxByRole = Math.max(...Object.values(stats.byRole), 1)
  const maxByDept = Math.max(...Object.values(stats.byDept), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {[
          { label: 'Total Users', value: stats.total, color: '#FFFFFF' },
          { label: 'Active', value: stats.active, color: '#22C55E' },
          { label: 'Inactive', value: stats.inactive, color: '#888888' },
          { label: 'Activity Logs', value: stats.totalLogs, color: '#CC1F1F' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{kpi.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* DB Status */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '8px', height: '8px', background: '#22C55E', borderRadius: '9999px', flexShrink: 0 }} className="live-dot" />
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF' }}>Supabase PostgreSQL — Connected</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', marginTop: '0.15rem' }}>
            project: trgzfntbzzkxtbyycegw · region: eu-central-1
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#22C55E', letterSpacing: '0.15em' }}>
          LIVE
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* By Role chart */}
        <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>USERS BY ROLE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {Object.entries(stats.byRole).map(([roleKey, count]) => (
              <div key={roleKey} data-testid={`stat-role-${roleKey}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: ROLE_COLORS[roleKey] ?? '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {ROLE_LABELS[roleKey] ?? roleKey}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#FFFFFF' }}>{count}</span>
                </div>
                <div style={{ height: '4px', background: '#1A1A1A' }}>
                  <div style={{ height: '100%', width: `${(count / maxByRole) * 100}%`, background: ROLE_COLORS[roleKey] ?? '#888888', transition: 'width 500ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Dept chart */}
        <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>USERS BY DEPARTMENT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {Object.entries(stats.byDept).map(([dept, count]) => (
              <div key={dept} data-testid={`stat-dept-${dept}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: DEPT_COLORS[dept] ?? '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {dept}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#FFFFFF' }}>{count}</span>
                </div>
                <div style={{ height: '4px', background: '#1A1A1A' }}>
                  <div style={{ height: '100%', width: `${(count / maxByDept) * 100}%`, background: DEPT_COLORS[dept] ?? '#888888', transition: 'width 500ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent profiles */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>
          RECENT MEMBERS
        </div>
        {profiles.slice(0, 5).map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1.5rem', borderBottom: '1px solid #1A1A1A' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FFFFFF' }}>{p.full_name || '—'}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: ROLE_COLORS[p.role] ?? '#888888', textTransform: 'uppercase' }}>{ROLE_LABELS[p.role]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

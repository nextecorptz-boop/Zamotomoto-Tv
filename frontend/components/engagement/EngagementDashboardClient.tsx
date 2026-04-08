'use client'
import type { EngagementDashboardData } from '@/types/engagement'

interface Props {
  data: EngagementDashboardData
  role: string
  userName: string | null
}

function StatCard({ label, value, color = '#FFFFFF' }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color, letterSpacing: '0.05em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.3rem' }}>
        {label}
      </div>
    </div>
  )
}

export function EngagementDashboardClient({ data, role, userName }: Props) {
  const { operator_stats, team_entries, pending_count } = data
  const progressPct = Math.min(100, (operator_stats.today_submitted / Math.max(1, operator_stats.daily_target)) * 100)
  const isAdmin = role === 'super_admin' || role === 'admin'

  return (
    <div data-testid="engagement-dashboard-client">
      {/* My stats */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 1rem' }}>
          {userName ? `${userName}'s Stats — Today` : 'My Stats — Today'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <StatCard label="Submitted Today" value={operator_stats.today_submitted} />
          <StatCard label="Approved" value={operator_stats.today_approved} color="#22C55E" />
          <StatCard label="Pending" value={operator_stats.today_pending} color="#F59E0B" />
          <StatCard label="Rejected" value={operator_stats.today_rejected} color="#CC1F1F" />
          <StatCard label="This Month" value={operator_stats.total_this_month} />
        </div>

        {/* Progress bar */}
        <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Daily Target</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: progressPct >= 100 ? '#22C55E' : '#FFFFFF' }}>
              {operator_stats.today_submitted} / {operator_stats.daily_target}
            </span>
          </div>
          <div style={{ background: '#1A1A1A', height: '8px', width: '100%' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct >= 100 ? '#22C55E' : '#CC1F1F', transition: 'width 600ms ease' }} />
          </div>
          {progressPct >= 100 ? (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#22C55E', marginTop: '0.35rem' }}>Daily target reached!</div>
          ) : (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#555555', marginTop: '0.35rem' }}>
              {Math.max(0, operator_stats.daily_target - operator_stats.today_submitted)} more to reach target
            </div>
          )}
        </div>
      </div>

      {/* Admin: pending queue */}
      {isAdmin && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 1rem' }}>
            Validation Queue
          </h2>
          <div style={{ background: pending_count > 0 ? 'rgba(245,158,11,0.08)' : '#111111', border: `1px solid ${pending_count > 0 ? '#F59E0B' : '#2A2A2A'}`, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: pending_count > 0 ? '#F59E0B' : '#555555', lineHeight: 1 }}>
              {pending_count}
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF' }}>
                {pending_count === 1 ? 'Submission awaiting review' : 'Submissions awaiting review'}
              </div>
              {pending_count > 0 && (
                <a href="/engagement/validate" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', textDecoration: 'none', letterSpacing: '0.08em' }}>
                  Go to validation queue →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team leaderboard (admins) */}
      {isAdmin && team_entries.length > 0 && (
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 1rem' }}>
            Team Leaderboard — Today
          </h2>
          <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2rem 2fr 1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A' }}>
              {['#', 'OPERATOR', 'SUBMITTED', 'APPROVED', 'MONTH'].map(col => (
                <div key={col} style={{ padding: '0.5rem 0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#555555', letterSpacing: '0.15em' }}>{col}</div>
              ))}
            </div>
            {team_entries.map((entry, idx) => (
              <div
                key={entry.operator_id}
                data-testid={`team-entry-${entry.operator_id}`}
                style={{ display: 'grid', gridTemplateColumns: '2rem 2fr 1fr 1fr 1fr', borderBottom: idx < team_entries.length - 1 ? '1px solid #1A1A1A' : 'none', background: idx === 0 ? 'rgba(204,31,31,0.05)' : 'transparent' }}
              >
                <div style={{ padding: '0.65rem 0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: idx === 0 ? '#CC1F1F' : '#555555' }}>{idx + 1}</div>
                <div style={{ padding: '0.65rem 0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FFFFFF' }}>{entry.operator_name ?? 'Unknown'}</div>
                <div style={{ padding: '0.65rem 0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FFFFFF' }}>{entry.today_count}</div>
                <div style={{ padding: '0.65rem 0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#22C55E' }}>{entry.approved_count}</div>
                <div style={{ padding: '0.65rem 0.85rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#888888' }}>{entry.month_total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && team_entries.length === 0 && (
        <div style={{ background: '#111111', border: '1px solid #1A1A1A', padding: '2rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#444444', letterSpacing: '0.1em' }}>
          NO TEAM SUBMISSIONS TODAY
        </div>
      )}
    </div>
  )
}

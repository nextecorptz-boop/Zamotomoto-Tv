import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/utils'
import { STAGE_MAP, PRIORITY_COLORS } from '@/lib/constants'
import type { Task, ActivityLog } from '@/types'
import Link from 'next/link'

async function getDashboardData() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: activity }, { data: upcoming }] = await Promise.all([
    supabase.from('tasks').select('id,task_ref,title,brief,priority,current_stage,deadline,assigned_to,created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('tasks').select('id,task_ref,title,deadline,current_stage,priority').not('deadline', 'is', null).lte('deadline', new Date(Date.now() + 14 * 86400000).toISOString()).order('deadline', { ascending: true }).limit(5),
  ])

  return {
    tasks: (tasks || []) as Task[],
    activity: (activity || []) as ActivityLog[],
    upcoming: (upcoming || []) as Task[],
  }
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="card-tilt" data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g,'-')}`} style={{ background: '#111111', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: color || '#FFFFFF', letterSpacing: '0.05em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888' }}>{sub}</div>}
    </div>
  )
}

export default async function DashboardPage() {
  const { tasks, activity, upcoming } = await getDashboardData()

  const stageGroups = {
    script: tasks.filter(t => t.current_stage === 'script').length,
    voice: tasks.filter(t => t.current_stage === 'voice').length,
    editing: tasks.filter(t => t.current_stage === 'editing').length,
    publishing: tasks.filter(t => t.current_stage === 'publishing').length,
  }
  const urgent = tasks.filter(t => t.priority === 'urgent').length
  const overdue = tasks.filter(t => t.is_overdue).length

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0, lineHeight: 1 }}>Newsroom Operations</h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.35rem' }}>
          Prime time readiness and pipeline status — East Africa Time
        </p>
      </div>

      {/* KPI Cards */}
      <div data-testid="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        <StatCard label="Total Tasks" value={tasks.length} sub="in pipeline" />
        <StatCard label="Urgent" value={urgent} color="#CC1F1F" sub="need attention" />
        <StatCard label="Overdue" value={overdue} color="#F59E0B" sub="past deadline" />
        <StatCard label="Publishing" value={stageGroups.publishing} color="#8B5CF6" sub="near air" />
      </div>

      {/* Pipeline + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#2A2A2A' }}>
        {/* Pipeline */}
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            PIPELINE STATUS
            <Link href="/tasks" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', textDecoration: 'none' }}>View Kanban →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(['script','voice','editing','publishing'] as const).map(stage => {
              const s = STAGE_MAP[stage]
              const count = stageGroups[stage]
              const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0
              return (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: s.color }}>{count}</span>
                  </div>
                  <div style={{ height: '4px', background: '#1A1A1A' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, transition: 'width 400ms ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>RECENT ACTIVITY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activity.length === 0 ? (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>No recent activity</div>
            ) : (
              activity.map((log: ActivityLog) => (
                <div key={log.id} data-testid="activity-item" style={{ display: 'flex', gap: '0.6rem', paddingBottom: '0.5rem', borderBottom: '1px solid #1A1A1A' }}>
                  <div style={{ width: '6px', height: '6px', background: '#CC1F1F', borderRadius: '9999px', marginTop: '6px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', textTransform: 'capitalize' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666' }}>
                      {formatRelative(log.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming + Recent Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1px', background: '#2A2A2A' }}>
        {/* Deadlines */}
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>UPCOMING DEADLINES</div>
          {upcoming.length === 0 ? (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>No upcoming deadlines</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcoming.map(task => (
                <Link key={task.id} href={`/tasks/${task.id}`} data-testid="deadline-item" className="hover-border-primary" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#1A1A1A', textDecoration: 'none', border: '1px solid transparent', transition: 'border-color 150ms' }}>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF' }}>{task.title}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888' }}>{task.task_ref} · {STAGE_MAP[task.current_stage]?.label}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: PRIORITY_COLORS[task.priority], border: `1px solid ${PRIORITY_COLORS[task.priority]}`, padding: '0.1rem 0.35rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{task.priority}</span>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', marginTop: '0.2rem' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short' }) : '—'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            RECENT TASKS
            <Link href="/tasks/new" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', textDecoration: 'none', background: 'rgba(204,31,31,0.1)', border: '1px solid rgba(204,31,31,0.3)', padding: '0.3rem 0.75rem', letterSpacing: '0.1em' }}>+ NEW TASK</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px', gap: '0.5rem', padding: '0.4rem 0.5rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span>REF</span><span>TITLE</span><span>STAGE</span><span>PRIORITY</span>
          </div>
          {tasks.slice(0, 8).map(task => {
            const stage = STAGE_MAP[task.current_stage]
            return (
              <Link key={task.id} href={`/tasks/${task.id}`} data-testid="task-row" className="hover-row" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px', gap: '0.5rem', padding: '0.6rem 0.5rem', borderBottom: '1px solid #1A1A1A', textDecoration: 'none', transition: 'background 120ms', alignItems: 'center' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F' }}>{task.task_ref}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: stage?.color || '#888888' }}>{stage?.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: PRIORITY_COLORS[task.priority] || '#888888', textTransform: 'uppercase' }}>{task.priority}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

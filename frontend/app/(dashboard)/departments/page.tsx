import { createClient } from '@/lib/supabase/server'
import { STAGES } from '@/lib/constants'
import Link from 'next/link'

export default async function DepartmentsPage() {
  const supabase = await createClient()

  // Get tasks per stage (tasks have no status column — status lives in task_stages)
  const { data: tasks } = await supabase.from('tasks').select('current_stage')
  const taskList = tasks || []

  // Get stage status breakdown from task_stages
  const { data: stageData } = await supabase.from('task_stages').select('stage, status')
  const stageList = stageData || []

  const deptStats = STAGES.map(stage => ({
    ...stage,
    total: taskList.filter(t => t.current_stage === stage.id).length,
    inProgress: stageList.filter(s => s.stage === stage.id && s.status === 'in_progress').length,
    review: stageList.filter(s => s.stage === stage.id && s.status === 'review').length,
  }))

  // Get worker counts per department
  const { data: profiles } = await supabase.from('profiles').select('department, role')
  const profileList = profiles || []

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Departments</h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>
          Main production pipeline departments
        </p>
      </div>

      {/* Department Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {deptStats.map(dept => {
          const workers = profileList.filter(p => p.department === dept.id).length
          return (
            <Link
              key={dept.id}
              href={`/departments/${dept.id}`}
              data-testid={`dept-card-${dept.id}`}
              className="card-tilt hover-card"
              style={{
                background: '#111111',
                padding: '1.5rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderLeft: `3px solid ${dept.color}`,
                transition: 'background 150ms',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.1em', color: dept.color }}>{dept.label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: dept.color, border: `1px solid ${dept.color}`, padding: '0.2rem 0.5rem', letterSpacing: '0.1em' }}>
                  {dept.total} TASKS
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div style={{ background: '#1A1A1A', padding: '0.75rem' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFFFFF', lineHeight: 1 }}>{dept.total}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</div>
                </div>
                <div style={{ background: '#1A1A1A', padding: '0.75rem' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#F59E0B', lineHeight: 1 }}>{dept.inProgress}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Active</div>
                </div>
                <div style={{ background: '#1A1A1A', padding: '0.75rem' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#8B5CF6', lineHeight: 1 }}>{dept.review}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Review</div>
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888' }}>
                {workers} worker{workers !== 1 ? 's' : ''} assigned
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

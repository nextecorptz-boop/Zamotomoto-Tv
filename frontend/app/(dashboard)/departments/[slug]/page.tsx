import { createClient } from '@/lib/supabase/server'
import { STAGES, PRIORITY_COLORS } from '@/lib/constants'
import Link from 'next/link'
import type { Task } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const stageMeta = STAGES.find(s => s.id === slug)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:assigned_to(full_name)')
    .eq('current_stage', slug)
    .order('created_at', { ascending: false })

  const taskList = (tasks || []) as Task[]

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <Link href="/departments" style={{ color: '#888888', textDecoration: 'none' }}>Departments</Link> / {stageMeta?.label || slug}
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: stageMeta?.color || '#FFFFFF', margin: 0 }}>
          {stageMeta?.label || slug.toUpperCase()} Department
        </h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>
          {taskList.length} tasks in this stage
        </p>
      </div>

      {/* Tasks in this department */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2A2A2A' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>CURRENT TASKS</div>
        </div>
        {taskList.length === 0 ? (
          <div style={{ padding: '2rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444', textAlign: 'center' }}>
            No tasks currently in this stage
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 80px 100px', gap: '0.5rem', padding: '0.4rem 1.5rem', borderBottom: '1px solid #1A1A1A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <span>REF</span><span>TITLE</span><span>ASSIGNEE</span><span>PRIORITY</span><span>DEADLINE</span>
            </div>
            {taskList.map(task => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                data-testid={`dept-task-${task.id}`}
                className="hover-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 120px 80px 100px',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderBottom: '1px solid #1A1A1A',
                  textDecoration: 'none',
                  transition: 'background 120ms',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F' }}>{task.task_ref}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(task.assignee as { full_name?: string } | null)?.full_name || '—'}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: PRIORITY_COLORS[task.priority], textTransform: 'uppercase' }}>{task.priority}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888' }}>
                  {task.deadline ? new Date(task.deadline).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short' }) : '—'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

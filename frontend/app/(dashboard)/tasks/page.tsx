'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { STAGES, PRIORITY_COLORS } from '@/lib/constants'
import { fetchTasks } from './actions'
import type { Task } from '@/types'
import Link from 'next/link'

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (e: React.DragEvent, id: string) => void }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      data-testid={`task-card-${task.id}`}
      className="card-tilt"
      style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '0.75rem', cursor: 'grab', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.1em' }}>{task.task_ref}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: PRIORITY_COLORS[task.priority], border: `1px solid ${PRIORITY_COLORS[task.priority]}`, padding: '0.05rem 0.3rem' }}>
          {task.priority}
        </span>
      </div>
      <Link href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF', lineHeight: 1.4, marginBottom: '0.35rem' }}>{task.title}</div>
      </Link>
      {task.brief && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.brief}</div>
      )}
      {task.deadline && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: task.is_overdue ? '#CC1F1F' : '#888888', marginTop: '0.3rem' }}>
          {task.is_overdue ? '⚠ OVERDUE · ' : ''}
          {new Date(task.deadline).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short' })}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { profile, isAdminOrAbove } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [filterPriority, setFilterPriority] = useState('all')
  const supabase = createClient()

  const loadTasks = useCallback(async () => {
    // fetchTasks server action uses admin client — bypasses broken SELECT RLS policy
    const data = await fetchTasks(
      filterPriority !== 'all' ? filterPriority : undefined,
      profile?.id,
      isAdminOrAbove
    )
    setTasks(data)
    setLoading(false)
  }, [filterPriority, profile, isAdminOrAbove])

  useEffect(() => { if (profile !== undefined) loadTasks() }, [loadTasks, profile])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadTasks])

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '0.4'
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement
    if (element) element.style.opacity = '1'
  }

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    setDragOverStage(null)
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.current_stage === newStage) return

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, current_stage: newStage as Task['current_stage'] } : t))

    const { error } = await supabase.from('tasks').update({ current_stage: newStage, updated_at: new Date().toISOString() }).eq('id', taskId)
    if (error) { loadTasks(); return }

    // Log to activity_log
    if (profile) {
      await supabase.from('activity_log').insert({
        task_id: taskId,
        user_id: profile.id,
        action: 'stage_transition',
        metadata: { from: task.current_stage, to: newStage, task_ref: task.task_ref, user_name: profile.full_name || profile.email },
      })
    }
  }

  const stageGroups = STAGES.reduce((acc, stage) => {
    acc[stage.id] = tasks.filter(t => t.current_stage === stage.id)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ background: '#111111', borderBottom: '1px solid #2A2A2A', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['kanban', 'list'] as const).map(v => (
            <button key={v} data-testid={`view-${v}-btn`} onClick={() => setView(v)} style={{ background: view === v ? '#CC1F1F' : 'transparent', border: '1px solid', borderColor: view === v ? '#CC1F1F' : '#2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
              {v}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select data-testid="filter-priority" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.3rem 0.5rem' }}>
            <option value="all">All Priority</option>
            {['urgent','high','normal','low'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {isAdminOrAbove && (
            <Link href="/tasks/new" data-testid="new-task-btn" style={{ background: '#CC1F1F', border: '1px solid #CC1F1F', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.35rem 0.75rem', textDecoration: 'none', display: 'inline-block' }}>
              + New Task
            </Link>
          )}
        </div>
      </div>

      {/* Board or List */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', gap: '1px', background: '#2A2A2A' }}>
          {STAGES.map(s => <div key={s.id} style={{ flex: 1, background: '#0A0A0A', padding: '1rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '0.5rem' }} />)}</div>)}
        </div>
      ) : view === 'kanban' ? (
        <div data-testid="kanban-board" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {STAGES.map(stage => (
            <div key={stage.id} data-testid={`kanban-column-${stage.id}`}
              onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id) }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => handleDrop(e, stage.id)}
              style={{ flex: 1, borderRight: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', background: dragOverStage === stage.id ? 'rgba(204,31,31,0.03)' : '#0A0A0A', borderTop: `2px solid ${dragOverStage === stage.id ? stage.color : 'transparent'}`, transition: 'all 150ms', overflow: 'hidden' }}
            >
              <div style={{ padding: '0.75rem 1rem', borderBottom: `2px solid ${stage.color}`, background: '#111111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.1em', color: stage.color }}>{stage.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '0.1rem 0.4rem' }}>{stageGroups[stage.id]?.length || 0}</span>
              </div>
              <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stageGroups[stage.id]?.map(task => (
                  <div key={task.id} onDragEnd={handleDragEnd}>
                    <TaskCard task={task} onDragStart={handleDragStart} />
                  </div>
                ))}
                {!stageGroups[stage.id]?.length && (
                  <div style={{ border: `1px dashed ${dragOverStage === stage.id ? stage.color : '#2A2A2A'}`, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: dragOverStage === stage.id ? stage.color : '#444444', letterSpacing: '0.1em' }}>
                    {dragOverStage === stage.id ? 'DROP HERE' : 'EMPTY'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px 100px', gap: '0.5rem', padding: '0.5rem 1rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <span>REF</span><span>TITLE</span><span>STAGE</span><span>PRIORITY</span><span>DEADLINE</span>
            </div>
            {tasks.map(task => {
              const stage = STAGES.find(s => s.id === task.current_stage)
              return (
                <Link key={task.id} href={`/tasks/${task.id}`} data-testid={`task-list-row-${task.id}`} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px 100px', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid #1A1A1A', textDecoration: 'none', transition: 'background 120ms', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1A1A1A'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F' }}>{task.task_ref}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: stage?.color || '#888888', textTransform: 'uppercase' }}>{stage?.label}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: PRIORITY_COLORS[task.priority], textTransform: 'uppercase' }}>{task.priority}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: task.is_overdue ? '#CC1F1F' : '#888888' }}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short' }) : '—'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

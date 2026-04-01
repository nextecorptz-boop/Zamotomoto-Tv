'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { SocialTask } from '@/types'

export default function SocialCopyPage() {
  const { profile, isAdminOrAbove } = useUser()
  const [tasks, setTasks] = useState<SocialTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('social_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') query = query.eq('status', filterStatus)

      const { data } = await query
      setTasks(data || [])
      setLoading(false)
    }
    load()
  }, [filterStatus])

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Social Copy</h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>
          Social media copy tasks — isolated department workflow
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {[
          { label: 'Total', value: tasks.length, color: '#FFFFFF' },
          { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: '#888888' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#F59E0B' },
          { label: 'Done', value: tasks.filter(t => t.status === 'approved').length, color: '#22C55E' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111111', padding: '1rem 1.5rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {['all', 'pending', 'in_progress', 'review', 'approved'].map(s => (
          <button
            key={s}
            data-testid={`social-filter-${s}`}
            onClick={() => setFilterStatus(s)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.35rem 0.75rem', cursor: 'pointer',
              background: filterStatus === s ? '#CC1F1F' : 'transparent',
              border: `1px solid ${filterStatus === s ? '#CC1F1F' : '#2A2A2A'}`,
              color: filterStatus === s ? '#FFFFFF' : '#888888',
              transition: 'all 150ms',
            }}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px' }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444' }}>
          No social copy tasks
        </div>
      ) : (
        <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 80px 100px 100px', gap: '0.5rem', padding: '0.4rem 1.5rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span>REF</span><span>TITLE</span><span>PLATFORM</span><span>PRIORITY</span><span>STATUS</span><span>DEADLINE</span>
          </div>
          {tasks.map(task => (
            <div
              key={task.id}
              data-testid={`social-task-${task.id}`}
              style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 80px 100px 100px', gap: '0.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid #1A1A1A', alignItems: 'center', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1A1A1A'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F' }}>{task.task_ref}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888' }}>{task.platform?.join(', ') || '—'}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: PRIORITY_COLORS[task.priority], textTransform: 'uppercase' }}>{task.priority}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: STATUS_COLORS[task.status], textTransform: 'uppercase' }}>{task.status?.replace('_', ' ')}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888' }}>{task.deadline ? formatDate(task.deadline) : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

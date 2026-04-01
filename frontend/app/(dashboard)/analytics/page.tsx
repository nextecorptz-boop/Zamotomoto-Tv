'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGES, STATUS_COLORS } from '@/lib/constants'
import type { Task, TaskStage } from '@/types'

function BarChart({ data, colors }: { data: { label: string; value: number; color: string }[]; colors: string[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '120px' }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#FFFFFF' }}>{d.value}</div>
          <div style={{ width: '100%', background: d.color || colors[i % colors.length], height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : 0, transition: 'height 400ms ease' }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stageRecords, setStageRecords] = useState<Pick<TaskStage, 'status'>[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('task_stages').select('status'),
    ]).then(([{ data: t }, { data: s }]) => {
      setTasks(t || [])
      setStageRecords((s || []) as Pick<TaskStage, 'status'>[])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '180px' }} />)}
    </div>
  )

  const total = tasks.length
  // Status lives in task_stages, not tasks
  const approved = stageRecords.filter(s => s.status === 'approved').length
  const inProgress = stageRecords.filter(s => s.status === 'in_progress').length
  const review = stageRecords.filter(s => s.status === 'review').length
  const pending = stageRecords.filter(s => s.status === 'pending').length

  const byStage = STAGES.map(s => ({ label: s.label, value: tasks.filter(t => t.current_stage === s.id).length, color: s.color }))
  const byPriority = ['urgent', 'high', 'normal', 'low'].map(p => ({
    label: p.toUpperCase(),
    value: tasks.filter(t => t.priority === p).length,
    color: p === 'urgent' ? '#CC1F1F' : p === 'high' ? '#F59E0B' : '#22C55E',
  }))
  const byStatus = Object.entries(STATUS_COLORS).map(([s, c]) => ({
    label: s.replace('_', ' ').toUpperCase(),
    value: stageRecords.filter(r => r.status === s).length,
    color: c,
  }))

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
          Executive Performance
        </h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>
          Pipeline metrics — production analytics
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {[
          { label: 'Total Tasks', value: total, color: '#FFFFFF' },
          { label: 'Completed', value: approved, color: '#22C55E' },
          { label: 'In Progress', value: inProgress, color: '#F59E0B' },
          { label: 'In Review', value: review, color: '#8B5CF6' },
        ].map(kpi => (
          <div key={kpi.label} className="card-tilt" data-testid={`analytics-kpi-${kpi.label}`} style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{kpi.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.8rem', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: '#2A2A2A' }}>
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>TASKS BY STAGE</div>
          <BarChart data={byStage} colors={['#CC1F1F', '#F59E0B', '#22C55E', '#8B5CF6']} />
        </div>
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>TASKS BY PRIORITY</div>
          <BarChart data={byPriority} colors={['#CC1F1F', '#F59E0B', '#22C55E', '#888888']} />
        </div>
        <div style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>TASKS BY STATUS</div>
          <BarChart data={byStatus} colors={['#888888', '#F59E0B', '#8B5CF6', '#22C55E', '#CC1F1F']} />
        </div>
      </div>

      {/* Completion Rate */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>COMPLETION RATE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '8px', background: '#1A1A1A' }}>
            <div style={{ height: '100%', width: `${total > 0 ? (approved / total) * 100 : 0}%`, background: 'linear-gradient(to right, #CC1F1F, #22C55E)', transition: 'width 600ms ease' }} />
          </div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#22C55E', letterSpacing: '0.05em', minWidth: '60px' }}>
            {total > 0 ? Math.round((approved / total) * 100) : 0}%
          </span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.5rem' }}>
          {approved} of {total} tasks completed · {pending} pending
        </div>
      </div>

      {/* Task table summary */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>STAGE BREAKDOWN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {STAGES.map(stage => {
            const count = tasks.filter(t => t.current_stage === stage.id).length
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: stage.color, letterSpacing: '0.1em', textTransform: 'uppercase', width: '100px', flexShrink: 0 }}>{stage.label}</span>
                <div style={{ flex: 1, height: '4px', background: '#1A1A1A' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: stage.color }} />
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', width: '40px', textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

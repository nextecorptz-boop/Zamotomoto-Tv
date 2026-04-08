'use client'
import { useState } from 'react'
import type { SocialTaskRow } from '@/app/(dashboard)/social-copy/actions'

const STATUS_COLORS: Record<string, string> = {
  pending: '#3B82F6',
  in_progress: '#F59E0B',
  submitted: '#22C55E',
  approved: '#22C55E',
  rejected: '#CC1F1F',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#888888',
  normal: '#22C55E',
  high: '#F59E0B',
  urgent: '#CC1F1F',
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  tasks: SocialTaskRow[]
}

export function AdminSocialCopyTab({ tasks }: Props) {
  const [filterStatus, setFilterStatus] = useState('all')

  const counts: Record<string, number> = {
    pending: 0, in_progress: 0, submitted: 0, approved: 0, rejected: 0,
  }
  for (const t of tasks) {
    if (t.status in counts) counts[t.status]++
  }

  const filtered = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#CC1F1F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Read-Only Monitor
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#FFFFFF' }}>
            {tasks.length} total engagement tasks
          </div>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '0.35rem 0.75rem' }}>
          No edit access from this panel
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} style={{ background: '#0A0A0A', padding: '0.65rem 0.85rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {status.replace('_', ' ')}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: STATUS_COLORS[status] ?? '#888888', lineHeight: 1 }}>
              {count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'in_progress', 'submitted', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            data-testid={`admin-social-filter-${s}`}
            onClick={() => setFilterStatus(s)}
            style={{
              background: filterStatus === s ? '#CC1F1F' : '#1A1A1A',
              border: `1px solid ${filterStatus === s ? '#CC1F1F' : '#2A2A2A'}`,
              color: '#FFFFFF',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.28rem 0.6rem',
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            {s === 'all' ? `All (${tasks.length})` : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '95px 75px 1fr 130px 110px 80px 80px',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderBottom: '1px solid #2A2A2A',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.58rem',
            color: '#666666',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span>Status</span>
          <span>Ref</span>
          <span>Title</span>
          <span>Assigned To</span>
          <span>Platform</span>
          <span>Priority</span>
          <span>Created</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444' }}>
            No tasks found.
          </div>
        ) : (
          filtered.map(task => (
            <div
              key={task.id}
              data-testid={`admin-sc-row-${task.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '95px 75px 1fr 130px 110px 80px 80px',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderBottom: '1px solid #1A1A1A',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.58rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: STATUS_COLORS[task.status] ?? '#888888',
                  border: `1px solid ${STATUS_COLORS[task.status] ?? '#2A2A2A'}`,
                  padding: '0.1rem 0.3rem',
                  display: 'inline-block',
                }}
              >
                {task.status.replace('_', ' ')}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#CC1F1F' }}>
                {task.sc_ref}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.72rem',
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.title}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.62rem',
                  color: '#888888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.assignee_name ?? '—'}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888' }}>
                {task.platform && task.platform.length > 0 ? task.platform.slice(0, 2).join(', ') : '—'}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6rem',
                  color: PRIORITY_COLORS[task.priority] ?? '#888888',
                  textTransform: 'uppercase',
                }}
              >
                {task.priority}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#666666' }}>
                {timeAgo(task.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

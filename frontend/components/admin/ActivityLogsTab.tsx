'use client'
import { useState } from 'react'
import { fetchActivityLogs } from '@/app/(dashboard)/admin/settings/actions'
import type { ActivityLogEntry } from '@/app/(dashboard)/admin/settings/actions'

interface Props {
  initialLogs: ActivityLogEntry[]
  initialTotal: number
}

const PAGE_SIZE = 20

const ACTION_COLORS: Record<string, string> = {
  task_created: '#22C55E',
  stage_approved: '#22C55E',
  stage_rejected: '#CC1F1F',
  stage_submitted: '#F59E0B',
  stage_started: '#8B5CF6',
  file_uploaded: '#06B6D4',
  task_assigned: '#F59E0B',
  comment_added: '#888888',
  user_invited: '#CC1F1F',
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function describeAction(log: ActivityLogEntry): string {
  const meta = log.metadata as Record<string, unknown> | null
  if (meta?.action_type === 'profile_updated') {
    const changes = meta.changes as Record<string, unknown> | null
    if (changes?.role) return `Role → ${changes.role}`
    if (changes?.is_active !== undefined) return `Account ${changes.is_active ? 'activated' : 'deactivated'}`
    if (changes?.department) return `Dept → ${changes.department}`
    return 'Profile updated'
  }
  return ''
}

export function ActivityLogsTab({ initialLogs, initialTotal }: Props) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  async function goToPage(p: number) {
    setLoading(true)
    const result = await fetchActivityLogs(p, PAGE_SIZE)
    setLogs(result.logs)
    setTotal(result.total)
    setPage(p)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888' }}>
          {total} total entries · page {page} of {totalPages || 1}
        </div>
        <button
          data-testid="refresh-logs-btn"
          onClick={() => goToPage(page)}
          disabled={loading}
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.75rem', cursor: 'pointer', borderRadius: 0 }}
        >
          {loading ? '...' : '↺ REFRESH'}
        </button>
      </div>

      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 130px 1fr 120px', gap: '0.5rem', padding: '0.4rem 1rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Timestamp (EAT)</span>
          <span>Actor</span>
          <span>Action / Detail</span>
          <span>Context</span>
        </div>

        {logs.length === 0 && !loading ? (
          <div style={{ padding: '2rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444', textAlign: 'center' }}>
            No activity logs yet
          </div>
        ) : (
          logs.map(log => {
            const actionColor = ACTION_COLORS[log.action] ?? '#888888'
            const detail = describeAction(log)
            return (
              <div
                key={log.id}
                data-testid={`log-row-${log.id}`}
                className="hover-row"
                style={{ display: 'grid', gridTemplateColumns: '160px 130px 1fr 120px', gap: '0.5rem', padding: '0.65rem 1rem', borderBottom: '1px solid #1A1A1A', alignItems: 'center', transition: 'background 120ms' }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#666666' }}>
                  {formatTs(log.created_at)}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CCCCCC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.actor_name ?? '—'}
                </span>
                <div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: actionColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  {detail && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', marginLeft: '0.5rem' }}>
                      · {detail}
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.task_id ? `task` : log.sp_id ? `sp` : log.metadata ? 'user mgmt' : '—'}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
          <button
            data-testid="logs-prev-btn"
            onClick={() => goToPage(page - 1)}
            disabled={page === 1 || loading}
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: page === 1 ? '#444' : '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.35rem 0.85rem', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 0 }}
          >
            ← PREV
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              data-testid={`logs-page-${p}`}
              onClick={() => goToPage(p)}
              disabled={loading}
              style={{ background: p === page ? '#CC1F1F' : '#1A1A1A', border: `1px solid ${p === page ? '#CC1F1F' : '#2A2A2A'}`, color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.35rem 0.65rem', cursor: 'pointer', minWidth: '32px', borderRadius: 0 }}
            >
              {p}
            </button>
          ))}
          <button
            data-testid="logs-next-btn"
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages || loading}
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: page === totalPages ? '#444' : '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.35rem 0.85rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 0 }}
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  )
}

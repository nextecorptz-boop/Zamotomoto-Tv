'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SocialTaskRow } from '@/app/(dashboard)/social-copy/actions'
import { deleteSocialTask, submitSocialTask } from '@/app/(dashboard)/social-copy/actions'
import { SCModal } from './SCModal'
import { useSocialTasksRealtime } from '@/hooks/useSocialTasksRealtime'

interface ProfileOption { id: string; full_name: string | null; role: string }

const STATUS_COLORS: Record<string, string> = {
  pending: '#3B82F6',
  in_progress: '#F59E0B',
  submitted: '#22C55E',
  approved: '#22C55E',
  rejected: '#CC1F1F',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#888888', normal: '#22C55E', high: '#F59E0B', urgent: '#CC1F1F',
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
  initialTasks: SocialTaskRow[]
  profiles: ProfileOption[]
  currentUserId: string
  currentRole: string
}

export function SocialCopyClient({ initialTasks, profiles, currentUserId, currentRole }: Props) {
  const [tasks, setTasks] = useState<SocialTaskRow[]>(initialTasks)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTask, setEditingTask] = useState<SocialTaskRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SocialTaskRow | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [toast, setToast] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync state when server re-renders with fresh props (via router.refresh())
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Realtime: debounced router refresh
  const handleRealtimeChange = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      router.refresh()
      refreshTimerRef.current = null
    }, 400)
  }, [router])

  useSocialTasksRealtime(handleRealtimeChange)

  const isAdmin = currentRole === 'super_admin' || currentRole === 'admin'
  const isIsolated = currentRole === 'worker_isolated'

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const filtered = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus)
  const counts = { pending: 0, in_progress: 0, submitted: 0, approved: 0, rejected: 0 }
  for (const t of tasks) { counts[t.status as keyof typeof counts] = (counts[t.status as keyof typeof counts] ?? 0) + 1 }

  async function handleSubmit(task: SocialTaskRow) {
    setActionLoading(task.id)
    const result = await submitSocialTask(task.id)
    setActionLoading(null)
    if (result.success) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'submitted', submitted_at: new Date().toISOString() } : t))
      showToast(`${result.sc_ref} submitted for review`)
    } else { showToast(`Error: ${result.error}`) }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setActionLoading(confirmDelete.id)
    const result = await deleteSocialTask(confirmDelete.id)
    setActionLoading(null)
    if (result.success) {
      setTasks(prev => prev.filter(t => t.id !== confirmDelete.id))
      showToast(`${confirmDelete.sc_ref} deleted`)
      setConfirmDelete(null)
    } else { showToast(`Error: ${result.error}`) }
  }

  function canEditTask(task: SocialTaskRow) {
    if (isAdmin) return true
    return task.created_by === currentUserId || task.assigned_to === currentUserId
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#111111', border: '1px solid #CC1F1F', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.75rem 1.25rem', zIndex: 9000 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            {isIsolated ? 'Social Copy Team' : 'Admin View — All Social Tasks'}
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Social Copy</h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', marginTop: '0.2rem' }}>Social media content creation & scheduling</p>
        </div>
        <button
          data-testid="create-sc-btn"
          onClick={() => setShowCreate(true)}
          style={{ background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem 1.5rem', cursor: 'pointer', borderRadius: 0 }}
        >
          + CREATE TASK
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} style={{ background: '#111111', padding: '0.6rem 0.75rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{status.replace('_', ' ')}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: STATUS_COLORS[status] ?? '#888888', lineHeight: 1 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'in_progress', 'submitted', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            data-testid={`filter-sc-${s}`}
            onClick={() => setFilterStatus(s)}
            style={{ background: filterStatus === s ? '#CC1F1F' : '#1A1A1A', border: `1px solid ${filterStatus === s ? '#CC1F1F' : '#2A2A2A'}`, color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.3rem 0.65rem', cursor: 'pointer', borderRadius: 0 }}
          >
            {s === 'all' ? `All (${tasks.length})` : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '95px 75px 1fr 120px 100px 90px 160px', gap: '0.5rem', padding: '0.45rem 1rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Status</span>
          <span>Ref</span>
          <span>Title</span>
          <span>Assigned To</span>
          <span>Priority</span>
          <span>Created</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444' }}>
            No tasks assigned.
          </div>
        ) : (
          filtered.map(task => (
            <div
              key={task.id}
              data-testid={`sc-row-${task.id}`}
              className="hover-row"
              style={{ display: 'grid', gridTemplateColumns: '95px 75px 1fr 120px 100px 90px 160px', gap: '0.5rem', padding: '0.7rem 1rem', borderBottom: '1px solid #1A1A1A', alignItems: 'center', transition: 'background 120ms', opacity: task.status === 'rejected' ? 0.6 : 1 }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: STATUS_COLORS[task.status] ?? '#888888', border: `1px solid ${STATUS_COLORS[task.status] ?? '#2A2A2A'}`, padding: '0.1rem 0.3rem', display: 'inline-block' }}>
                {task.status.replace('_', ' ')}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#CC1F1F', letterSpacing: '0.05em' }}>{task.sc_ref}</span>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                {task.platform && task.platform.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    {task.platform.map(p => (
                      <span key={p} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#888888', border: '1px solid #2A2A2A', padding: '0 0.25rem' }}>{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.assignee_name ?? '—'}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: PRIORITY_COLORS[task.priority] ?? '#888888', textTransform: 'uppercase' }}>
                {task.priority}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666' }}>
                {timeAgo(task.created_at)}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem' }}>
                {canEditTask(task) && (
                  <button
                    data-testid={`edit-sc-${task.id}`}
                    onClick={() => setEditingTask(task)}
                    style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', padding: '0.22rem 0.5rem', cursor: 'pointer', borderRadius: 0 }}
                  >
                    EDIT
                  </button>
                )}
                {canEditTask(task) && (task.status === 'pending' || task.status === 'in_progress') && (
                  <button
                    data-testid={`submit-sc-${task.id}`}
                    onClick={() => handleSubmit(task)}
                    disabled={actionLoading === task.id}
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', color: '#22C55E', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', padding: '0.22rem 0.5rem', cursor: 'pointer', borderRadius: 0 }}
                  >
                    SUBMIT
                  </button>
                )}
                {canEditTask(task) && (
                  <button
                    data-testid={`delete-sc-${task.id}`}
                    onClick={() => setConfirmDelete(task)}
                    style={{ background: 'rgba(204,31,31,0.08)', border: '1px solid rgba(204,31,31,0.3)', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', padding: '0.22rem 0.4rem', cursor: 'pointer', borderRadius: 0 }}
                  >
                    DEL
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <SCModal profiles={profiles} currentUserId={currentUserId} currentRole={currentRole}
          onClose={() => setShowCreate(false)}
          onSaved={(t) => { setTasks(prev => [t, ...prev]); showToast(`${t.sc_ref} created`); setShowCreate(false) }}
        />
      )}

      {/* Edit modal */}
      {editingTask && (
        <SCModal task={editingTask} profiles={profiles} currentUserId={currentUserId} currentRole={currentRole}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) => {
            setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
            showToast(`${updated.sc_ref} updated`)
            setEditingTask(null)
          }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#111111', border: '1px solid #CC1F1F', padding: '2rem', maxWidth: '380px', width: '100%' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#CC1F1F', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>CONFIRM DELETE</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#CCCCCC', marginBottom: '1.5rem' }}>
              Delete <span style={{ color: '#CC1F1F' }}>{confirmDelete.sc_ref}</span> &ldquo;{confirmDelete.title}&rdquo;?
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.65rem', cursor: 'pointer', borderRadius: 0 }}>CANCEL</button>
              <button data-testid="confirm-delete-sc-btn" onClick={handleDelete} disabled={!!actionLoading} style={{ flex: 2, background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: 'pointer', borderRadius: 0 }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

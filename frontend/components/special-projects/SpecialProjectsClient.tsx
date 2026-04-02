'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SpecialProject } from '@/types'
import type { Profile } from '@/types'
import { deleteSpecialProject } from '@/app/(dashboard)/special-projects/actions'
import { SPModal } from './SPModal'
import { useSpecialProjectsRealtime } from '@/hooks/useSpecialProjectsRealtime'

interface ProfileOption { id: string; full_name: string | null; role: string }

const STATUS_COLORS: Record<string, string> = {
  draft: '#888888',
  active: '#22C55E',
  archived: '#6B7280',
}

const URGENCY_COLORS: Record<string, string> = {
  standard: '#888888',
  high: '#F59E0B',
  breaking: '#CC1F1F',
  critical: '#FF2B2B',
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface Props {
  initialProjects: SpecialProject[]
  profiles: ProfileOption[]
  currentUserId: string
  currentRole: string
}

export function SpecialProjectsClient({ initialProjects, profiles, currentUserId, currentRole }: Props) {
  const [projects, setProjects] = useState<SpecialProject[]>(initialProjects)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<SpecialProject | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SpecialProject | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<'created_at' | 'urgency' | 'status' | 'title'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [toast, setToast] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync state when server re-renders with fresh props (via router.refresh())
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  // Realtime: debounced router refresh to re-run server data fetching
  const handleRealtimeChange = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      router.refresh()
      refreshTimerRef.current = null
    }, 400)
  }, [router])

  useSpecialProjectsRealtime(handleRealtimeChange)

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = projects
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .sort((a, b) => {
      const va = String(a[sortField] ?? '')
      const vb = String(b[sortField] ?? '')
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    const result = await deleteSpecialProject(confirmDelete.id)
    setDeleting(false)
    if (result.success) {
      setProjects(prev => prev.filter(p => p.id !== confirmDelete.id))
      showToast(`${confirmDelete.sp_ref} deleted`)
      setConfirmDelete(null)
    } else {
      showToast(`Error: ${result.error}`)
    }
  }

  const ownerMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '—']))

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#111111', border: '1px solid #CC1F1F', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.75rem 1.25rem', zIndex: 9000, letterSpacing: '0.05em' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Admin / Super Admin Only
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Special Projects</h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', marginTop: '0.2rem' }}>
            Breaking news, urgent content, ad-hoc assignments
          </p>
        </div>
        {canEdit && (
          <button
            data-testid="create-sp-btn"
            onClick={() => setShowCreate(true)}
            style={{ background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem 1.5rem', cursor: 'pointer', borderRadius: 0 }}
          >
            + CREATE PROJECT
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {[
          { label: 'Total', value: projects.length, color: '#FFFFFF' },
          { label: 'Active', value: projects.filter(p => p.status === 'active').length, color: '#22C55E' },
          { label: 'Draft', value: projects.filter(p => p.status === 'draft').length, color: '#888888' },
          { label: 'Breaking', value: projects.filter(p => p.urgency === 'breaking').length, color: '#CC1F1F' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#111111', padding: '0.75rem 1rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{stat.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {(['all', 'draft', 'active', 'archived'] as const).map(s => (
          <button
            key={s}
            data-testid={`filter-sp-${s}`}
            onClick={() => setFilterStatus(s)}
            style={{ background: filterStatus === s ? '#CC1F1F' : '#1A1A1A', border: `1px solid ${filterStatus === s ? '#CC1F1F' : '#2A2A2A'}`, color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', cursor: 'pointer', borderRadius: 0 }}
          >
            {s === 'all' ? `All (${projects.length})` : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr 140px 100px 80px 140px', gap: '0.5rem', padding: '0.45rem 1rem', borderBottom: '1px solid #2A2A2A', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Status</span>
          <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('title')}>Ref</span>
          <span>Title</span>
          <span>Owner</span>
          <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('urgency')}>Urgency</span>
          <span style={{ cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>Created</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444' }}>
            No projects yet. Create one to get started.
          </div>
        ) : (
          filtered.map(project => (
            <div
              key={project.id}
              data-testid={`sp-row-${project.id}`}
              className="hover-row"
              style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr 140px 100px 80px 140px', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid #1A1A1A', alignItems: 'center', transition: 'background 120ms' }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: STATUS_COLORS[project.status] ?? '#888888', border: `1px solid ${STATUS_COLORS[project.status] ?? '#2A2A2A'}`, padding: '0.1rem 0.35rem', display: 'inline-block' }}>
                {project.status}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#CC1F1F', letterSpacing: '0.05em' }}>
                {project.sp_ref}
              </span>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project.title}
                </div>
                {project.description && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.description}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ownerMap[project.owner_id ?? ''] ?? '—'}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: URGENCY_COLORS[project.urgency ?? 'standard'] ?? '#888888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {project.urgency ?? 'standard'}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666' }}>
                {timeAgo(project.created_at)}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                {canEdit && (
                  <>
                    <button
                      data-testid={`edit-sp-${project.id}`}
                      onClick={() => setEditingProject(project)}
                      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.05em', padding: '0.25rem 0.55rem', cursor: 'pointer', borderRadius: 0 }}
                    >
                      EDIT
                    </button>
                    <button
                      data-testid={`delete-sp-${project.id}`}
                      onClick={() => setConfirmDelete(project)}
                      style={{ background: 'rgba(204,31,31,0.08)', border: '1px solid rgba(204,31,31,0.3)', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', padding: '0.25rem 0.55rem', cursor: 'pointer', borderRadius: 0 }}
                    >
                      DEL
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <SPModal
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setShowCreate(false)}
          onSaved={(newProject) => {
            setProjects(prev => [newProject as unknown as SpecialProject, ...prev])
            showToast(`${newProject.sp_ref} created`)
            setShowCreate(false)
          }}
        />
      )}

      {/* Edit modal */}
      {editingProject && (
        <SPModal
          project={editingProject}
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setEditingProject(null)}
          onSaved={(updated) => {
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } as SpecialProject : p))
            showToast(`${updated.sp_ref} updated`)
            setEditingProject(null)
          }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <div style={{ background: '#111111', border: '1px solid #CC1F1F', padding: '2rem', maxWidth: '400px', width: '100%' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#CC1F1F', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>CONFIRM DELETE</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#CCCCCC', marginBottom: '1.5rem' }}>
              Delete <span style={{ color: '#CC1F1F' }}>{confirmDelete.sp_ref}</span> &ldquo;{confirmDelete.title}&rdquo;? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.65rem', cursor: 'pointer', borderRadius: 0 }}>CANCEL</button>
              <button data-testid="confirm-delete-sp-btn" onClick={handleDelete} disabled={deleting} style={{ flex: 2, background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: deleting ? 'not-allowed' : 'pointer', borderRadius: 0 }}>
                {deleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

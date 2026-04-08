'use client'
import { useState } from 'react'
import { createSocialTask, updateSocialTask } from '@/app/(dashboard)/social-copy/actions'
import type { SocialTaskRow } from '@/app/(dashboard)/social-copy/actions'

interface ProfileOption { id: string; full_name: string | null; role: string }

const PLATFORMS = ['instagram', 'twitter', 'facebook', 'tiktok', 'youtube', 'linkedin', 'whatsapp']
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const STATUSES = ['pending', 'in_progress'] as const

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A',
  color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem',
  padding: '0.65rem 0.85rem', borderRadius: 0, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem',
  color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.3rem',
}

interface Props {
  task?: SocialTaskRow
  profiles: ProfileOption[]
  currentUserId: string
  currentRole: string
  onClose: () => void
  onSaved: (task: SocialTaskRow) => void
}

export function SCModal({ task, profiles, currentUserId, currentRole, onClose, onSaved }: Props) {
  const isEdit = !!task
  const isAdmin = currentRole === 'super_admin' || currentRole === 'admin'

  const [title, setTitle] = useState(task?.title ?? '')
  const [brief, setBrief] = useState(task?.brief ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? currentUserId)
  const [platform, setPlatform] = useState<string[]>(task?.platform ?? [])
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>((task?.priority as typeof PRIORITIES[number]) ?? 'normal')
  const [status, setStatus] = useState<string>(task?.status ?? 'pending')
  const [contentDraft, setContentDraft] = useState(task?.content_draft ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 10) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function togglePlatform(p: string) {
    setPlatform(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || title.trim().length < 3) { setError('Title must be at least 3 characters.'); return }
    setLoading(true)
    setError('')

    const data = {
      title: title.trim(),
      brief: brief.trim() || undefined,
      assigned_to: assignedTo || null,
      platform,
      priority,
      status: status as 'pending' | 'in_progress',
      content_draft: contentDraft.trim() || null,
      deadline: deadline || null,
    }

    const result = isEdit
      ? await updateSocialTask(task!.id, data)
      : await createSocialTask(data)

    setLoading(false)
    if (!result.success) { setError(result.error ?? 'Failed'); return }

    onSaved({
      id: result.id ?? task?.id ?? crypto.randomUUID(),
      sc_ref: result.sc_ref ?? task?.sc_ref ?? '',
      task_type: 'caption',
      title: title.trim(),
      brief: brief.trim() || null,
      platform,
      assigned_to: assignedTo || null,
      priority,
      status,
      content_draft: contentDraft.trim() || null,
      submitted_at: task?.submitted_at ?? null,
      deadline: deadline || null,
      created_by: task?.created_by ?? currentUserId,
      created_at: task?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignee_name: profiles.find(p => p.id === assignedTo)?.full_name ?? null,
    })
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <div data-testid="sc-modal" style={{ background: '#111111', border: '1px solid #2A2A2A', width: '100%', maxWidth: '520px', borderRadius: 0, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111111' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>
              {isEdit ? `EDIT ${task!.sc_ref}` : 'NEW ENGAGEMENT TASK'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', marginTop: '0.1rem' }}>
              sc_ref auto-generated · type: caption
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle} htmlFor="sc-title">Title *</label>
            <input id="sc-title" data-testid="sc-title-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Instagram caption for election night coverage" maxLength={100} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle} htmlFor="sc-brief">Brief</label>
            <textarea id="sc-brief" data-testid="sc-brief-input" value={brief} onChange={e => setBrief(e.target.value)} placeholder="Context for the copy writer..." rows={3} maxLength={500} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
          </div>

          <div>
            <label style={labelStyle} htmlFor="sc-content">Content Draft (optional)</label>
            <textarea id="sc-content" data-testid="sc-content-input" value={contentDraft} onChange={e => setContentDraft(e.target.value)} placeholder="Write the draft copy here..." rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} />
          </div>

          {/* Platforms */}
          <div>
            <span style={labelStyle}>Platforms</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  data-testid={`platform-${p}`}
                  onClick={() => togglePlatform(p)}
                  style={{ background: platform.includes(p) ? 'rgba(204,31,31,0.15)' : '#1A1A1A', border: `1px solid ${platform.includes(p) ? '#CC1F1F' : '#2A2A2A'}`, color: platform.includes(p) ? '#CC1F1F' : '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.08em', padding: '0.3rem 0.65rem', cursor: 'pointer', borderRadius: 0, transition: 'all 120ms' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned to + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {isAdmin && (
              <div>
                <label style={labelStyle} htmlFor="sc-assigned">Assigned To</label>
                <select id="sc-assigned" data-testid="sc-assigned-select" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— Unassigned —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || p.id}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle} htmlFor="sc-priority">Priority</label>
              <select id="sc-priority" data-testid="sc-priority-select" value={priority} onChange={e => setPriority(e.target.value as typeof PRIORITIES[number])} style={{ ...inputStyle, cursor: 'pointer' }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Status + Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle} htmlFor="sc-status">Status</label>
              <select id="sc-status" data-testid="sc-status-select" value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="pending">PENDING</option>
                <option value="in_progress">IN PROGRESS</option>
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="sc-deadline">Deadline</label>
              <input id="sc-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {error && (
            <div data-testid="sc-error" style={{ background: 'rgba(204,31,31,0.08)', border: '1px solid rgba(204,31,31,0.35)', color: '#FF2B2B', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.6rem 0.85rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.65rem', cursor: 'pointer', borderRadius: 0 }}>CANCEL</button>
            <button type="submit" data-testid="sc-submit-btn" disabled={loading} style={{ flex: 2, background: loading ? '#1A0000' : '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 0 }}>
              {loading ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'CREATE TASK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

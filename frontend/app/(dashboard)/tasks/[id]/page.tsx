'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useParams } from 'next/navigation'
import { STAGES, STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants'
import { formatDateTime, formatRelative } from '@/lib/utils'
import { fetchTaskById } from '../actions'
import type { Task, TaskStage, TaskFile, ActivityLog } from '@/types'

function ApprovalModal({ stage, taskId, onClose, onUpdate, profile }: {
  stage: TaskStage; taskId: string; onClose: () => void; onUpdate: () => void;
  profile: { id: string; full_name: string | null; email?: string } | null
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setLoading(true)
    const now = new Date().toISOString()
    const update: Record<string, unknown> = { status: decision }
    if (decision === 'approved') { update.approved_at = now; update.approved_by = profile?.id }
    else { update.rejected_at = now; update.reject_reason = reason }

    await supabase.from('task_stages').update(update).eq('id', stage.id)
    if (profile) {
      await supabase.from('activity_log').insert({
        task_id: taskId, user_id: profile.id,
        action: decision === 'approved' ? 'stage_approved' : 'stage_rejected',
        metadata: { stage: stage.stage, reject_reason: reason, user_name: profile.full_name || profile.email },
      })
    }
    setLoading(false); onUpdate(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div data-testid="approval-modal" style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.5rem', width: '460px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '0.5rem' }}>Review Stage</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', marginBottom: '1rem' }}>
          Stage: <span style={{ color: STAGES.find(s => s.id === stage.stage)?.color }}>{stage.stage.toUpperCase()}</span> ·
          Status: <span style={{ color: STATUS_COLORS[stage.status] }}>{stage.status.replace('_', ' ')}</span>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Rejection Reason (required if rejecting)
          </label>
          <textarea
            data-testid="rejection-reason-input"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Explain what needs to be fixed..."
            style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', padding: '0.65rem', outline: 'none', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button data-testid="approve-btn" onClick={() => handleDecision('approved')} disabled={loading} style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1px solid #22C55E', color: '#22C55E', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.65rem', cursor: 'pointer' }}>
            Approve
          </button>
          <button data-testid="reject-btn" onClick={() => handleDecision('rejected')} disabled={loading || !reason} style={{ flex: 1, background: 'rgba(204,31,31,0.15)', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.65rem', cursor: 'pointer', opacity: !reason ? 0.5 : 1 }}>
            Reject
          </button>
          <button data-testid="close-modal-btn" onClick={onClose} style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.65rem 1rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string
  const { profile, isAdminOrAbove } = useUser()
  const supabase = createClient()

  const [task, setTask] = useState<Task | null>(null)
  const [stages, setStages] = useState<TaskStage[]>([])
  const [files, setFiles] = useState<TaskFile[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewStage, setReviewStage] = useState<TaskStage | null>(null)
  const [driveLink, setDriveLink] = useState('')
  const [driveFilename, setDriveFilename] = useState('')
  const [uploadError, setUploadError] = useState('')

  const loadData = async () => {
    // fetchTaskById server action uses admin client — bypasses broken SELECT RLS policy
    const [taskData, { data: ts }, { data: tf }, { data: al }] = await Promise.all([
      fetchTaskById(taskId),
      supabase.from('task_stages').select('*').eq('task_id', taskId).order('created_at'),
      supabase.from('task_files').select('*').eq('task_id', taskId).eq('is_deleted', false).order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*').eq('task_id', taskId).order('created_at', { ascending: false }).limit(20),
    ])
    if (taskData) setTask(taskData)
    setStages(ts || [])
    setFiles(tf || [])
    setActivity(al || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [taskId])

  const handleAddFile = async () => {
    if (!driveLink || !profile) return
    setUploadError('')
    const { error } = await supabase.from('task_files').insert({
      task_id: taskId,
      file_name: driveFilename || 'Drive Link',
      storage_key: driveLink,
      provider: 'google_drive',
      category: 'script',
      file_size_bytes: 0,
      mime_type: 'application/octet-stream',
      uploaded_by: profile.id,
      is_deleted: false,
    })
    if (error) { setUploadError(error.message); return }
    await supabase.from('activity_log').insert({
      task_id: taskId, user_id: profile.id, action: 'file_added',
      metadata: { file_name: driveFilename || driveLink, user_name: profile.full_name || profile.email },
    })
    setDriveLink(''); setDriveFilename(''); loadData()
  }

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '100px' }} />)}
    </div>
  )

  if (!task) return <div style={{ padding: '2rem', fontFamily: "'IBM Plex Mono', monospace", color: '#888888' }}>Task not found.</div>

  const currentStageIdx = STAGES.findIndex(s => s.id === task.current_stage)
  const assignee = task.assignee as { full_name?: string; email?: string } | null

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#CC1F1F', letterSpacing: '0.1em' }}>{task.task_ref}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: STAGES.find(s => s.id === task.current_stage)?.color, border: `1px solid ${STAGES.find(s => s.id === task.current_stage)?.color}`, padding: '0.1rem 0.4rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {task.current_stage}
            </span>
            {task.is_overdue && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', border: '1px solid #CC1F1F', padding: '0.1rem 0.4rem' }}>OVERDUE</span>}
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.05em', color: '#FFFFFF', margin: 0 }}>{task.title}</h2>
          {task.brief && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.35rem', maxWidth: '600px' }}>{task.brief}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: PRIORITY_COLORS[task.priority], border: `1px solid ${PRIORITY_COLORS[task.priority]}`, padding: '0.3rem 0.75rem' }}>{task.priority}</span>
          {task.deadline && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '0.3rem 0.75rem' }}>Air: {formatDateTime(task.deadline)}</span>}
          {assignee && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '0.3rem 0.75rem' }}>{assignee.full_name || assignee.email || '—'}</span>}
        </div>
      </div>

      {/* Stage Tracker */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>PIPELINE TRACKER</div>
        <div style={{ display: 'flex' }}>
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx
            const isCurrent = idx === currentStageIdx
            const stageData = stages.find(s => s.stage === stage.id)
            return (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div data-testid={`stage-tracker-${stage.id}`} style={{ flex: 1, padding: '0.65rem 0.75rem', background: isCurrent ? stage.bgColor : isCompleted ? 'rgba(34,197,94,0.05)' : 'transparent', border: `1px solid ${isCurrent ? stage.color : isCompleted ? '#22C55E' : '#2A2A2A'}` }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em', color: isCurrent ? stage.color : isCompleted ? '#22C55E' : '#666666' }}>
                    {stage.label}{isCompleted && ' ✓'}
                  </div>
                  {stageData && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: STATUS_COLORS[stageData.status], textTransform: 'uppercase' }}>{stageData.status.replace('_', ' ')}</div>}
                </div>
                {idx < STAGES.length - 1 && <div style={{ width: '1px', height: '32px', background: '#2A2A2A', flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage Cards + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1px', background: '#2A2A2A' }}>
        {/* Left: Stage Cards + Files */}
        <div style={{ background: '#0A0A0A', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {stages.map(stage => {
            const sm = STAGES.find(s => s.id === stage.stage)
            if (!sm) return null
            const isCurrent = stage.stage === task.current_stage
            return (
              <div key={stage.id} data-testid={`stage-card-${stage.stage}`} style={{ background: '#111111', padding: '1.25rem 1.5rem', borderLeft: `3px solid ${isCurrent ? sm.color : 'transparent'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: isCurrent ? sm.color : '#888888' }}>{sm.label}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: STATUS_COLORS[stage.status], textTransform: 'uppercase' }}>{stage.status.replace('_', ' ')}</span>
                    {isAdminOrAbove && stage.status === 'review' && (
                      <button data-testid={`review-stage-btn-${stage.stage}`} onClick={() => setReviewStage(stage)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#FFFFFF', background: 'rgba(139,92,246,0.2)', border: '1px solid #8B5CF6', padding: '0.25rem 0.65rem', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Review</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem' }}>
                  {[
                    { label: 'Started', val: stage.started_at ? formatDateTime(stage.started_at) : '—' },
                    { label: 'Submitted', val: stage.submitted_at ? formatDateTime(stage.submitted_at) : '—' },
                    { label: 'Approved', val: stage.approved_at ? formatDateTime(stage.approved_at) : stage.rejected_at ? 'Rejected' : '—' },
                    { label: 'Rev', val: `#${stage.revision_num}` },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.55rem', marginBottom: '0.15rem' }}>{item.label}</div>
                      <div style={{ color: item.label === 'Approved' && stage.approved_at ? '#22C55E' : item.label === 'Approved' && stage.rejected_at ? '#CC1F1F' : '#FFFFFF' }}>{item.val}</div>
                    </div>
                  ))}
                </div>
                {stage.reject_reason && (
                  <div style={{ marginTop: '0.6rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FF2B2B', background: 'rgba(204,31,31,0.08)', border: '1px solid rgba(204,31,31,0.2)', padding: '0.5rem 0.75rem' }}>
                    Rejection: {stage.reject_reason}
                  </div>
                )}
              </div>
            )
          })}

          {/* File Upload */}
          <div data-testid="file-upload-area" style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>FILE ATTACHMENTS</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" placeholder="Google Drive link" value={driveLink} onChange={e => setDriveLink(e.target.value)} data-testid="drive-link-input" style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.5rem 0.75rem', outline: 'none' }} />
              <input type="text" placeholder="Label" value={driveFilename} onChange={e => setDriveFilename(e.target.value)} style={{ width: '140px', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.5rem 0.75rem', outline: 'none' }} />
              <button onClick={handleAddFile} data-testid="add-file-btn" disabled={!driveLink} style={{ background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.5rem 1rem', cursor: 'pointer', opacity: !driveLink ? 0.5 : 1, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Add</button>
            </div>
            {uploadError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FF2B2B', marginBottom: '0.5rem' }}>{uploadError}</div>}
            {files.map(f => (
              <div key={f.id} data-testid="file-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A' }}>
                <a href={f.storage_key} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#CC1F1F', textDecoration: 'none' }}>{f.file_name}</a>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666' }}>{new Date(f.created_at).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div data-testid="activity-timeline" style={{ background: '#111111', padding: '1.25rem 1.5rem', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: '1rem' }}>ACTIVITY TIMELINE</div>
          {activity.length === 0 ? (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>No activity yet</div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '1px', background: '#2A2A2A' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem' }}>
                {activity.map(log => (
                  <div key={log.id} data-testid="timeline-item" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.25rem', top: '4px', width: '6px', height: '6px', background: '#CC1F1F', borderRadius: '9999px' }} />
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ')}</div>
                    {log.metadata?.user_name && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', marginTop: '0.1rem' }}>by {String(log.metadata.user_name)}</div>}
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#444444', marginTop: '0.1rem' }}>{formatRelative(log.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {reviewStage && <ApprovalModal stage={reviewStage} taskId={taskId} onClose={() => setReviewStage(null)} onUpdate={loadData} profile={profile} />}
    </div>
  )
}

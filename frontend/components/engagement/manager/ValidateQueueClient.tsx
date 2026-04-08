'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SubmissionCard } from '../shared/SubmissionCard'
import { validateEngagementSubmission } from '@/app/actions/engagement'
import type { EngagementSubmission } from '@/types/engagement'

interface Props {
  submissions: EngagementSubmission[]
}

export function ValidateQueueClient({ submissions }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<EngagementSubmission | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [toastMsg, setToastMsg] = useState('')
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set())

  const visible = submissions.filter(s => !optimisticDone.has(s.id))

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (!selected) return

    startTransition(async () => {
      const result = await validateEngagementSubmission(selected.id, decision, reviewNote || undefined)
      if (!result.success) {
        showToast('error' in result ? result.error : 'Validation failed')
        return
      }
      setOptimisticDone(prev => new Set([...prev, selected.id]))
      showToast(`Submission ${decision === 'approved' ? 'APPROVED' : 'REJECTED'}`)
      setSelected(null)
      setReviewNote('')
      router.refresh()
    })
  }

  return (
    <div data-testid="validate-queue-client">
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998,
          background: toastMsg.includes('APPROVED') ? '#22C55E' : toastMsg.includes('REJECTED') ? '#CC1F1F' : '#F59E0B',
          color: toastMsg.includes('APPROVED') ? '#000' : '#FFF',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.68rem', padding: '0.55rem 1rem', letterSpacing: '0.05em',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid #F59E0B',
          padding: '0.5rem 1rem',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.68rem',
          color: '#F59E0B',
          letterSpacing: '0.08em',
        }}>
          {visible.length} PENDING REVIEW
        </div>
        {visible.length === 0 && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#555555', letterSpacing: '0.1em' }}>
            — Queue clear
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div style={{
          background: '#111111',
          border: '1px solid #1A1A1A',
          padding: '3rem',
          textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.68rem',
          color: '#444444',
          letterSpacing: '0.1em',
        }}>
          NO PENDING SUBMISSIONS — QUEUE IS CLEAR
        </div>
      ) : (
        visible.map(sub => (
          <SubmissionCard
            key={sub.id}
            submission={sub}
            showOperator
            actions={
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => { setSelected(sub); setReviewNote('') }}
                  data-testid={`validate-btn-${sub.id}`}
                  style={{
                    background: 'rgba(204,31,31,0.1)',
                    border: '1px solid #CC1F1F',
                    color: '#CC1F1F',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.3rem 0.65rem',
                    cursor: 'pointer',
                  }}
                >
                  REVIEW
                </button>
              </div>
            }
          />
        ))
      )}

      {/* Review modal */}
      {selected && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget && !isPending) setSelected(null) }}
        >
          <div style={{
            background: '#111111',
            border: '1px solid #2A2A2A',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '520px',
          }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 0.35rem' }}>
              REVIEW SUBMISSION
            </h2>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', margin: '0 0 1.25rem' }}>
              {selected.operator?.full_name ?? 'Unknown'} — {selected.category?.name}
            </p>

            {selected.notes && (
              <div style={{ background: '#0E0E0E', borderLeft: '2px solid #2A2A2A', padding: '0.6rem 0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#555555', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Operator Notes</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#AAAAAA' }}>{selected.notes}</div>
              </div>
            )}

            {/* Review note */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Review Note (required for rejection)
              </label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                data-testid="review-note-input"
                placeholder="Optional note for operator..."
                style={{ width: '100%', background: '#0E0E0E', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.6rem 0.85rem', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleDecision('approved')}
                disabled={isPending}
                data-testid="approve-btn"
                style={{ flex: 1, background: isPending ? '#2A2A2A' : 'rgba(34,197,94,0.15)', border: `1px solid ${isPending ? '#2A2A2A' : '#22C55E'}`, color: isPending ? '#555' : '#22C55E', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.7rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                APPROVE
              </button>
              <button
                onClick={() => handleDecision('rejected')}
                disabled={isPending || !reviewNote.trim()}
                data-testid="reject-btn"
                style={{ flex: 1, background: isPending ? '#2A2A2A' : 'rgba(204,31,31,0.15)', border: `1px solid ${isPending || !reviewNote.trim() ? '#2A2A2A' : '#CC1F1F'}`, color: isPending || !reviewNote.trim() ? '#555' : '#CC1F1F', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.7rem', cursor: isPending || !reviewNote.trim() ? 'not-allowed' : 'pointer' }}
              >
                REJECT
              </button>
              <button
                onClick={() => { setSelected(null); setReviewNote('') }}
                disabled={isPending}
                style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.08em', padding: '0.5rem 0.85rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                CANCEL
              </button>
            </div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#444444', marginTop: '0.65rem' }}>
              Rejection requires a review note. Operator can resubmit after rejection.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

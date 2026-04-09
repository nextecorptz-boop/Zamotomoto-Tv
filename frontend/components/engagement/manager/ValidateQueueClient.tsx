'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SubmissionCard } from '../shared/SubmissionCard'
import { validateEngagementSubmission } from '@/app/actions/engagement'
import type { EngagementActionError } from '@/app/actions/engagement'
import type { EngagementSubmission } from '@/types/engagement'

interface Props {
  submissions: EngagementSubmission[]
}

export function ValidateQueueClient({ submissions }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<EngagementSubmission | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toastMsg, setToastMsg] = useState('')
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set())

  // Reject reason state — required before confirming rejection
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')

  const visible = submissions.filter(s => !optimisticDone.has(s.id))

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  const closeModal = () => {
    if (isPending) return
    setSelected(null)
    setShowRejectInput(false)
    setRejectReason('')
    setRejectReasonError('')
  }

  // Internal close after action success — bypasses isPending guard
  const resetModalState = () => {
    setSelected(null)
    setShowRejectInput(false)
    setRejectReason('')
    setRejectReasonError('')
  }

  const handleApprove = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await validateEngagementSubmission(selected.id, 'APPROVED')
      if (!result.success) {
        const err = result as EngagementActionError
        if (err.errorType === 'conflict_error') {
          showToast('Already processed by another admin — refreshing queue')
          resetModalState()
          router.refresh()
        } else {
          showToast(err.error)
        }
        return
      }
      setOptimisticDone(prev => new Set([...prev, selected.id]))
      resetModalState()
      showToast('Submission APPROVED')
      router.refresh()
    })
  }

  // Step 1: clicking Reject opens the reason input
  const handleRejectClick = () => {
    setShowRejectInput(true)
    setRejectReason('')
    setRejectReasonError('')
  }

  // Step 2: confirming rejection (reason must be non-empty)
  const handleRejectConfirm = () => {
    if (!selected) return
    if (!rejectReason.trim()) {
      setRejectReasonError('Rejection reason is required')
      return
    }
    setRejectReasonError('')
    startTransition(async () => {
      const result = await validateEngagementSubmission(selected.id, 'REJECTED', rejectReason.trim())
      if (!result.success) {
        const err = result as EngagementActionError
        if (err.errorType === 'conflict_error') {
          showToast('Already processed by another admin — refreshing queue')
          resetModalState()
          router.refresh()
        } else {
          showToast(err.error)
        }
        return
      }
      setOptimisticDone(prev => new Set([...prev, selected.id]))
      resetModalState()
      showToast('Submission REJECTED')
      router.refresh()
    })
  }

  return (
    <div data-testid="validate-queue-client">
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: toastMsg.includes('APPROVED') ? '#22C55E' : '#CC1F1F', color: toastMsg.includes('APPROVED') ? '#000' : '#FFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem', letterSpacing: '0.05em' }}>
          {toastMsg}
        </div>
      )}

      {/* Summary */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(245,158,11,0.1)', border: '1px solid #F59E0B', padding: '0.5rem 1rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#F59E0B', letterSpacing: '0.08em' }}>
          {visible.length} PENDING REVIEW
        </div>
      </div>

      {visible.length === 0 ? (
        <div style={{ background: '#111111', border: '1px solid #1A1A1A', padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#444444', letterSpacing: '0.1em' }}>
          NO PENDING SUBMISSIONS — QUEUE IS CLEAR
        </div>
      ) : (
        visible.map(sub => (
          <SubmissionCard
            key={sub.id}
            submission={sub}
            showOperator
            actions={
              <button
                onClick={() => { if (!isPending) { setSelected(sub); setShowRejectInput(false); setRejectReason(''); setRejectReasonError('') } }}
                disabled={isPending}
                data-testid={`validate-btn-${sub.id}`}
                style={{ background: 'rgba(204,31,31,0.1)', border: '1px solid #CC1F1F', color: isPending ? '#555555' : '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.3rem 0.65rem', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1 }}
              >
                {isPending && selected?.id === sub.id ? 'PROCESSING...' : 'REVIEW'}
              </button>
            }
          />
        ))
      )}

      {/* Review modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 0.35rem' }}>
              REVIEW SUBMISSION
            </h2>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', margin: '0 0 0.35rem' }}>
              {selected.operator?.full_name ?? 'Unknown'} — {selected.category?.name}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#555555', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              Submitted {new Date(selected.created_at).toLocaleString('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>

            {/* Phase 1: Approve/Reject choice */}
            {!showRejectInput && (
              <>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem' }}>
                  <button
                    onClick={handleApprove}
                    disabled={isPending}
                    data-testid="approve-btn"
                    style={{ flex: 1, background: isPending ? '#2A2A2A' : 'rgba(34,197,94,0.15)', border: `1px solid ${isPending ? '#2A2A2A' : '#22C55E'}`, color: isPending ? '#555' : '#22C55E', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.75rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
                  >
                    {isPending ? 'PROCESSING...' : 'APPROVE'}
                  </button>
                  <button
                    onClick={handleRejectClick}
                    disabled={isPending}
                    data-testid="reject-btn"
                    style={{ flex: 1, background: isPending ? '#2A2A2A' : 'rgba(204,31,31,0.15)', border: `1px solid ${isPending ? '#2A2A2A' : '#CC1F1F'}`, color: isPending ? '#555' : '#CC1F1F', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.75rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
                  >
                    REJECT
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={isPending}
                    style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.5rem 0.85rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
                  >
                    CANCEL
                  </button>
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#444444', marginTop: '0.25rem' }}>
                  View proof before deciding. Rejected operators can resubmit.
                </p>
              </>
            )}

            {/* Phase 2: Reject reason input — required */}
            {showRejectInput && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => { setRejectReason(e.target.value); if (e.target.value.trim()) setRejectReasonError('') }}
                    placeholder="Explain why this proof is being rejected..."
                    rows={3}
                    data-testid="reject-reason-input"
                    style={{ width: '100%', background: '#0E0E0E', border: `1px solid ${rejectReasonError ? '#CC1F1F' : '#2A2A2A'}`, color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', padding: '0.65rem 0.75rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  {rejectReasonError && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#CC1F1F', marginTop: '0.3rem' }}>
                      {rejectReasonError}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleRejectConfirm}
                    disabled={isPending}
                    data-testid="confirm-reject-btn"
                    style={{ flex: 1, background: isPending ? '#2A2A2A' : '#CC1F1F', border: 'none', color: isPending ? '#555' : '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.75rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
                  >
                    {isPending ? 'PROCESSING...' : 'CONFIRM REJECT'}
                  </button>
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectReason(''); setRejectReasonError('') }}
                    disabled={isPending}
                    style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.5rem 0.85rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
                  >
                    BACK
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

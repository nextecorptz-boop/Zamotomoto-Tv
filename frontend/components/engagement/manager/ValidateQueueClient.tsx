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
  const [isPending, startTransition] = useTransition()
  const [toastMsg, setToastMsg] = useState('')
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set())

  const visible = submissions.filter(s => !optimisticDone.has(s.id))

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (!selected) return

    startTransition(async () => {
      const result = await validateEngagementSubmission(selected.id, decision)
      if (!result.success) {
        showToast('error' in result ? result.error : 'Validation failed')
        return
      }
      setOptimisticDone(prev => new Set([...prev, selected.id]))
      showToast(`Submission ${decision === 'approved' ? 'APPROVED' : 'REJECTED'}`)
      setSelected(null)
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
                onClick={() => setSelected(sub)}
                data-testid={`validate-btn-${sub.id}`}
                style={{ background: 'rgba(204,31,31,0.1)', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.3rem 0.65rem', cursor: 'pointer' }}
              >
                REVIEW
              </button>
            }
          />
        ))
      )}

      {/* Review modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget && !isPending) setSelected(null) }}
        >
          <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 0.35rem' }}>
              REVIEW SUBMISSION
            </h2>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', margin: '0 0 1.5rem' }}>
              {selected.operator?.full_name ?? 'Unknown'} — {selected.category?.name}
            </p>

            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#555555', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              Submitted {new Date(selected.created_at).toLocaleString('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleDecision('approved')}
                disabled={isPending}
                data-testid="approve-btn"
                style={{ flex: 1, background: isPending ? '#2A2A2A' : 'rgba(34,197,94,0.15)', border: `1px solid ${isPending ? '#2A2A2A' : '#22C55E'}`, color: isPending ? '#555' : '#22C55E', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.75rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                APPROVE
              </button>
              <button
                onClick={() => handleDecision('rejected')}
                disabled={isPending}
                data-testid="reject-btn"
                style={{ flex: 1, background: isPending ? '#2A2A2A' : 'rgba(204,31,31,0.15)', border: `1px solid ${isPending ? '#2A2A2A' : '#CC1F1F'}`, color: isPending ? '#555' : '#CC1F1F', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', padding: '0.75rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                REJECT
              </button>
              <button
                onClick={() => setSelected(null)}
                disabled={isPending}
                style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.5rem 0.85rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                CANCEL
              </button>
            </div>

            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#444444', marginTop: '0.65rem' }}>
              View proof above before deciding. Rejected operators can resubmit.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

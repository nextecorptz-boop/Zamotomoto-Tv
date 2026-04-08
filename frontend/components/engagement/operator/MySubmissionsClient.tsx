'use client'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SubmissionCard } from '../shared/SubmissionCard'
import { resubmitEngagementProof } from '@/app/actions/engagement'
import type { EngagementSubmission } from '@/types/engagement'

interface Props {
  submissions: EngagementSubmission[]
}

export function MySubmissionsClient({ submissions }: Props) {
  const router = useRouter()
  const [resubmitTarget, setResubmitTarget] = useState<EngagementSubmission | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = statusFilter === 'all' ? submissions : submissions.filter(s => s.status === statusFilter)

  const handleResubmit = () => {
    if (!resubmitTarget) return
    setError(null)
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Select a new proof file'); return }

    const fd = new FormData()
    fd.append('proof_file', file)

    startTransition(async () => {
      const result = await resubmitEngagementProof(resubmitTarget.id, fd)
      if (!result.success) { setError('error' in result ? result.error : 'Resubmit failed'); return }
      setSuccess(true)
      setTimeout(() => {
        setResubmitTarget(null)
        setSuccess(false)
        setFileName(null)
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      }, 1500)
    })
  }

  return (
    <div data-testid="my-submissions-client">
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            data-testid={`filter-${s}`}
            style={{ background: statusFilter === s ? '#CC1F1F' : 'transparent', border: `1px solid ${statusFilter === s ? '#CC1F1F' : '#2A2A2A'}`, color: statusFilter === s ? '#FFFFFF' : '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', cursor: 'pointer' }}
          >
            {s} {s !== 'all' && `(${submissions.filter(x => x.status === s).length})`}
          </button>
        ))}
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#555555', alignSelf: 'center', marginLeft: 'auto' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#111111', border: '1px solid #1A1A1A', padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#444444', letterSpacing: '0.1em' }}>
          NO SUBMISSIONS {statusFilter !== 'all' ? `WITH STATUS "${statusFilter.toUpperCase()}"` : 'YET'}
        </div>
      ) : (
        filtered.map(sub => (
          <SubmissionCard
            key={sub.id}
            submission={sub}
            actions={
              sub.status === 'rejected' ? (
                <button
                  onClick={() => { setResubmitTarget(sub); setFileName(null); setError(null) }}
                  data-testid={`resubmit-btn-${sub.id}`}
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #F59E0B', color: '#F59E0B', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.3rem 0.65rem', cursor: 'pointer' }}
                >
                  RESUBMIT
                </button>
              ) : null
            }
          />
        ))
      )}

      {/* Resubmit modal */}
      {resubmitTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setResubmitTarget(null) }}
        >
          <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#F59E0B', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>
              RESUBMIT PROOF
            </h2>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginBottom: '1.25rem' }}>
              Category: {resubmitTarget.category?.name} — upload a new proof file
            </p>

            {success && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22C55E', color: '#22C55E', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.6rem 0.85rem', marginBottom: '0.75rem' }}>
                Resubmitted successfully!
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(204,31,31,0.1)', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.6rem 0.85rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: `1px dashed ${fileName ? '#22C55E' : '#2A2A2A'}`, padding: '1rem', background: '#0E0E0E', cursor: 'pointer', textAlign: 'center', marginBottom: '1rem' }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: fileName ? '#22C55E' : '#555555' }}>
                {fileName ?? 'Click to select new proof file'}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFileName(f.name) }}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleResubmit}
                disabled={isPending}
                data-testid="confirm-resubmit-btn"
                style={{ flex: 1, background: isPending ? '#2A2A2A' : '#F59E0B', border: 'none', color: isPending ? '#555' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em', padding: '0.7rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                {isPending ? 'SUBMITTING...' : 'CONFIRM RESUBMIT'}
              </button>
              <button
                onClick={() => setResubmitTarget(null)}
                style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

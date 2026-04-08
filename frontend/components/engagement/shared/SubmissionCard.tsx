'use client'
import { useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { getSignedProofUrl } from '@/app/actions/engagement'
import type { EngagementSubmission } from '@/types/engagement'

interface Props {
  submission: EngagementSubmission
  showOperator?: boolean
  actions?: React.ReactNode
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function SubmissionCard({ submission, showOperator = false, actions }: Props) {
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleViewProof = async () => {
    if (!submission.storage_path) return
    setLoading(true)
    const url = await getSignedProofUrl(submission.storage_path)
    setProofUrl(url)
    setLoading(false)
  }

  return (
    <div
      data-testid={`submission-card-${submission.id}`}
      style={{
        background: '#111111',
        border: '1px solid #2A2A2A',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1rem',
              color: '#FFFFFF',
              letterSpacing: '0.05em',
            }}>
              {submission.category?.name ?? 'Unknown Category'}
            </span>
            {submission.category?.platform && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6rem',
                color: '#888888',
                background: '#1A1A1A',
                padding: '0.1rem 0.4rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                {submission.category.platform}
              </span>
            )}
          </div>

          {showOperator && submission.operator?.full_name && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.2rem' }}>
              BY: {submission.operator.full_name.toUpperCase()}
            </div>
          )}

          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#555555', marginTop: '0.2rem' }}>
            {fmtDate(submission.submitted_at ?? submission.created_at)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
          <StatusBadge status={submission.status} />
          {submission.category?.points_value !== undefined && submission.category.points_value > 1 && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.1em' }}>
              +{submission.category.points_value} PTS
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      {submission.notes && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.7rem',
          color: '#AAAAAA',
          background: '#0E0E0E',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.65rem',
          borderLeft: '2px solid #2A2A2A',
        }}>
          {submission.notes}
        </div>
      )}

      {/* Rejection note */}
      {submission.status === 'rejected' && submission.review_note && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.65rem',
          color: '#CC1F1F',
          background: 'rgba(204,31,31,0.06)',
          padding: '0.4rem 0.75rem',
          marginBottom: '0.65rem',
          borderLeft: '2px solid #CC1F1F',
        }}>
          REJECTION NOTE: {submission.review_note}
        </div>
      )}

      {/* View Proof + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {submission.storage_path && !proofUrl && (
          <button
            onClick={handleViewProof}
            disabled={loading}
            data-testid={`view-proof-btn-${submission.id}`}
            style={{
              background: 'transparent',
              border: '1px solid #2A2A2A',
              color: '#888888',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.35rem 0.75rem',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'LOADING...' : 'VIEW PROOF'}
          </button>
        )}

        {proofUrl && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`proof-link-${submission.id}`}
            style={{
              background: 'rgba(204,31,31,0.1)',
              border: '1px solid #CC1F1F',
              color: '#CC1F1F',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.35rem 0.75rem',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            OPEN PROOF
          </a>
        )}

        {actions}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import type { AccountingEntry, AccountingDocument } from '@/types'
import { DocumentList } from './DocumentList'
import { getSignedDocumentUrl } from '@/app/(dashboard)/accounting/actions'

const STATUS_COLORS: Record<string, string> = {
  pending:  '#F59E0B',
  approved: '#22C55E',
  rejected: '#EF4444',
}

const TYPE_COLORS: Record<string, string> = {
  debit:  '#FF2B2B',
  credit: '#22C55E',
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function LabelValue({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Bebas Neue', sans-serif", fontSize: mono ? '0.75rem' : '1rem', color: '#FFFFFF', letterSpacing: mono ? 0 : '0.05em', wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  )
}

interface EntryDetailModalProps {
  entry: AccountingEntry | null
  documents: AccountingDocument[]
  onClose: () => void
  onReview?: (decision: 'approved' | 'rejected', note: string) => Promise<void>
  isAdmin?: boolean
  isLoading?: boolean
}

export function EntryDetailModal({ entry, documents, onClose, onReview, isAdmin = false, isLoading = false }: EntryDetailModalProps) {
  const [reviewNote, setReviewNote] = useState('')
  const [confirmAction, setConfirmAction] = useState<'approved' | 'rejected' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!entry) return null

  async function handleReview(decision: 'approved' | 'rejected') {
    if (!onReview) return
    setSubmitting(true)
    try {
      await onReview(decision, reviewNote)
      setConfirmAction(null)
      setReviewNote('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-testid="entry-detail-modal"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#111111',
          borderTop: '2px solid #CC1F1F',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#CC1F1F', letterSpacing: '0.1em' }}>
              {entry.reference_code}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.15rem' }}>
              {entry.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#888888', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.3rem 0.6rem' }}
          >
            CLOSE ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {/* Left: entry details */}
          <div style={{ padding: '1.5rem', borderRight: '1px solid #1A1A1A' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', color: '#888888', letterSpacing: '0.15em', marginBottom: '1rem', borderBottom: '1px solid #1A1A1A', paddingBottom: '0.5rem' }}>
              ENTRY DETAILS
            </div>

            <LabelValue label="Title" value={entry.title} />
            <LabelValue label="Reference" value={<span style={{ color: '#CC1F1F' }}>{entry.reference_code}</span>} />
            <LabelValue label="Amount" value={formatAmount(entry.amount, entry.currency)} />
            <LabelValue label="Entry Type" value={
              <span style={{ color: TYPE_COLORS[entry.entry_type] }}>{entry.entry_type.toUpperCase()}</span>
            } />
            <LabelValue label="Category" value={entry.category?.name ?? entry.category_id ?? '—'} />
            <LabelValue label="Status" value={
              <span style={{
                background: STATUS_COLORS[entry.status],
                color: '#000000',
                padding: '0.1rem 0.45rem',
                fontSize: '0.65rem',
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.1em',
                display: 'inline-block',
              }}>
                {entry.status.toUpperCase()}
              </span>
            } />
            <LabelValue label="Entry Date" value={entry.entry_date} />
            <LabelValue label="Submitted By" value={entry.submitter?.full_name ?? entry.submitted_by} />
            <LabelValue label="Created" value={new Date(entry.created_at).toLocaleString()} />
            {entry.description && <LabelValue label="Description" value={entry.description} />}
            {entry.reviewed_by && (
              <>
                <LabelValue label="Reviewed By" value={entry.reviewer?.full_name ?? entry.reviewed_by} />
                {entry.review_note && <LabelValue label="Review Note" value={entry.review_note} />}
              </>
            )}
          </div>

          {/* Right: documents */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', color: '#888888', letterSpacing: '0.15em', marginBottom: '1rem', borderBottom: '1px solid #1A1A1A', paddingBottom: '0.5rem' }}>
              ATTACHED DOCUMENTS ({documents.length})
            </div>
            {isLoading ? (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#555555' }}>Loading documents…</div>
            ) : (
              <DocumentList documents={documents} getSignedUrl={getSignedDocumentUrl} />
            )}
          </div>
        </div>

        {/* Admin review footer */}
        {isAdmin && entry.status === 'pending' && onReview && (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #2A2A2A', flexShrink: 0, background: '#0D0D0D' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', color: '#888888', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              REVIEW DECISION
            </div>

            {confirmAction ? (
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF', marginBottom: '0.75rem' }}>
                  Confirm {confirmAction === 'approved' ? 'APPROVAL' : 'REJECTION'} of {entry.reference_code}?
                  {reviewNote && <span style={{ color: '#888888' }}> Note: &ldquo;{reviewNote}&rdquo;</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    data-testid="confirm-review-btn"
                    onClick={() => handleReview(confirmAction)}
                    disabled={submitting}
                    style={{
                      background: confirmAction === 'approved' ? '#22C55E' : '#CC1F1F',
                      border: 'none', color: '#FFFFFF',
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.1em',
                      padding: '0.5rem 1.25rem', cursor: submitting ? 'wait' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting ? 'PROCESSING…' : `YES, ${confirmAction.toUpperCase()}`}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    style={{ background: 'transparent', border: '1px solid #3A3A3A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.5rem 0.9rem', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  data-testid="review-note-input"
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Review note (optional)…"
                  rows={2}
                  style={{
                    width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
                    color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
                    padding: '0.6rem 0.75rem', resize: 'vertical', outline: 'none',
                    marginBottom: '0.75rem', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    data-testid="approve-entry-btn"
                    onClick={() => setConfirmAction('approved')}
                    style={{
                      background: 'transparent', border: '1px solid #22C55E', color: '#22C55E',
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em',
                      padding: '0.5rem 1.5rem', cursor: 'pointer',
                    }}
                  >
                    APPROVE
                  </button>
                  <button
                    data-testid="reject-entry-btn"
                    onClick={() => setConfirmAction('rejected')}
                    style={{
                      background: '#CC1F1F', border: 'none', color: '#FFFFFF',
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em',
                      padding: '0.5rem 1.5rem', cursor: 'pointer',
                    }}
                  >
                    REJECT
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

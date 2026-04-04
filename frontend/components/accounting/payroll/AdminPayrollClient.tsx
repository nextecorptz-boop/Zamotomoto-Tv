'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PayrollEntry, PayrollSummary } from '@/types'
import { PayrollSummaryCard } from './PayrollSummaryCard'
import { PayrollTable } from './PayrollTable'
import { approvePayrollEntry, markPayrollPaid } from '@/app/(dashboard)/accounting/payroll/actions'

interface Props {
  entries: PayrollEntry[]
  summary: PayrollSummary
}

function fmtTZS(n: number) {
  return `TZS ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getCurrentMonthYear() {
  return new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' }).toUpperCase()
}

// ── Inline Review Modal ──────────────────────────────────────────────────────
function PayrollReviewModal({
  entry,
  onClose,
  onReview,
}: {
  entry: PayrollEntry
  onClose: () => void
  onReview: (decision: 'approved' | 'rejected' | 'paid', reason?: string, paidDate?: string) => Promise<void>
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [paymentDate, setPaymentDate]   = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading]           = useState(false)
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'paid' | null>(null)

  async function handleAction(decision: 'approved' | 'rejected' | 'paid') {
    setLoading(true)
    await onReview(decision, rejectReason || undefined, paymentDate)
    setLoading(false)
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '0.5rem 0', borderBottom: '1px solid #1A1A1A',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem',
    color: '#666666', letterSpacing: '0.12em', textTransform: 'uppercase',
  }
  const valueStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FFFFFF',
  }

  return (
    <div
      data-testid="payroll-review-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #2A2A2A' }}>
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
              PAYROLL REVIEW
            </h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#CC1F1F', letterSpacing: '0.08em' }}>
              {entry.pr_ref}
            </span>
          </div>
          <button
            data-testid="payroll-modal-close"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#888888', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
          >
            ✕
          </button>
        </div>

        {/* Entry details */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Employee</span>
            <span style={valueStyle}>{entry.employee_name}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Department</span>
            <span style={valueStyle}>{entry.department.toUpperCase()}</span>
          </div>
          {entry.role_title && (
            <div style={rowStyle}>
              <span style={labelStyle}>Role</span>
              <span style={valueStyle}>{entry.role_title}</span>
            </div>
          )}
          <div style={rowStyle}>
            <span style={labelStyle}>Gross Amount</span>
            <span style={valueStyle}>{fmtTZS(Number(entry.gross_amount))}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Deductions</span>
            <span style={{ ...valueStyle, color: '#FF9500' }}>{fmtTZS(Number(entry.deductions))}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Net Amount</span>
            <span style={{ ...valueStyle, color: '#22C55E', fontWeight: 700, fontSize: '1rem' }}>{fmtTZS(Number(entry.net_amount))}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Payment Month</span>
            <span style={valueStyle}>{entry.payment_month?.slice(0, 7)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Submitted By</span>
            <span style={valueStyle}>{entry.creator?.full_name ?? '—'}</span>
          </div>
          {entry.notes && (
            <div style={{ marginTop: '0.75rem', background: '#0D0D0D', padding: '0.75rem', border: '1px solid #1A1A1A' }}>
              <div style={labelStyle}>Notes</div>
              <div style={{ ...valueStyle, marginTop: '0.35rem', color: '#AAAAAA', fontSize: '0.68rem', lineHeight: 1.5 }}>{entry.notes}</div>
            </div>
          )}
          {entry.reject_reason && (
            <div style={{ marginTop: '0.75rem', background: '#1A0000', padding: '0.75rem', border: '1px solid #CC1F1F' }}>
              <div style={labelStyle}>Rejection Reason</div>
              <div style={{ ...valueStyle, marginTop: '0.35rem', color: '#FF6B6B', fontSize: '0.68rem' }}>{entry.reject_reason}</div>
            </div>
          )}
        </div>

        {/* Actions — only for pending/approved */}
        {(entry.status === 'pending' || entry.status === 'approved') && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entry.status === 'pending' && (
              <>
                {activeAction === 'reject' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      data-testid="payroll-reject-reason"
                      type="text"
                      placeholder="Rejection reason (optional)…"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      style={{
                        background: '#1A0000', border: '1px solid #CC1F1F', color: '#FFFFFF',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
                        padding: '0.5rem 0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        data-testid="payroll-confirm-reject-btn"
                        disabled={loading}
                        onClick={() => handleAction('rejected')}
                        style={{
                          flex: 1, background: '#CC1F1F', border: 'none', color: '#FFF',
                          fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.1em',
                          padding: '0.55rem', cursor: 'pointer',
                        }}
                      >
                        {loading ? 'REJECTING…' : 'CONFIRM REJECT'}
                      </button>
                      <button onClick={() => setActiveAction(null)} style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', cursor: 'pointer' }}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      data-testid="payroll-approve-btn"
                      disabled={loading}
                      onClick={() => handleAction('approved')}
                      style={{
                        flex: 1, background: '#8B5CF6', border: 'none', color: '#FFF',
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em',
                        padding: '0.6rem', cursor: 'pointer',
                      }}
                    >
                      {loading && activeAction === 'approve' ? 'APPROVING…' : 'APPROVE'}
                    </button>
                    <button
                      data-testid="payroll-reject-btn"
                      onClick={() => setActiveAction('reject')}
                      style={{
                        flex: 1, background: 'transparent', border: '1px solid #CC1F1F', color: '#CC1F1F',
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em',
                        padding: '0.6rem', cursor: 'pointer',
                      }}
                    >
                      REJECT
                    </button>
                  </div>
                )}
              </>
            )}

            {entry.status === 'approved' && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  data-testid="payroll-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  style={{
                    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem',
                    padding: '0.5rem 0.65rem', outline: 'none', colorScheme: 'dark', flex: 1,
                  }}
                />
                <button
                  data-testid="payroll-mark-paid-btn"
                  disabled={loading}
                  onClick={() => handleAction('paid')}
                  style={{
                    flex: 1, background: '#22C55E', border: 'none', color: '#000',
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em',
                    padding: '0.6rem', cursor: 'pointer', fontWeight: 700,
                  }}
                >
                  {loading ? 'MARKING…' : 'MARK AS PAID'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Payroll Client ─────────────────────────────────────────────────
export default function AdminPayrollClient({ entries: initialEntries, summary }: Props) {
  const router = useRouter()
  const [entries, setEntries]             = useState<PayrollEntry[]>(initialEntries)
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null)
  const [toast, setToast]                 = useState('')
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({})

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleReview = useCallback(async (
    decision: 'approved' | 'rejected' | 'paid',
    rejectReason?: string,
    paidDate?: string
  ) => {
    if (!selectedEntry) return
    let result: { success: boolean; error?: string }

    if (decision === 'paid') {
      result = await markPayrollPaid(selectedEntry.id, paidDate ?? new Date().toISOString().slice(0, 10))
    } else {
      result = await approvePayrollEntry(selectedEntry.id, decision as 'approved' | 'rejected', rejectReason)
    }

    if (!result.success && 'error' in result) {
      showToast(`Error: ${result.error}`)
      return
    }

    setOptimisticStatus(prev => ({ ...prev, [selectedEntry.id]: decision }))
    showToast(`${selectedEntry.pr_ref} marked as ${decision.toUpperCase()}`)
    setSelectedEntry(null)
    router.refresh()
  }, [selectedEntry, router])

  const displayedEntries = entries.map(e => ({
    ...e,
    status: (optimisticStatus[e.id] as PayrollEntry['status']) ?? e.status,
  }))

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Toast */}
      {toast && (
        <div
          data-testid="payroll-toast"
          style={{
            position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998,
            background: '#22C55E', color: '#000',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem',
            padding: '0.55rem 1rem', letterSpacing: '0.05em',
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
          PAYROLL DASHBOARD
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          Payroll Overview — {getCurrentMonthYear()}
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <PayrollSummaryCard
          label="Total Gross (All Time)"
          value={fmtTZS(summary.total_gross)}
          subtext={`${summary.pending_count} entries pending approval`}
          accentColor="#CC1F1F"
        />
        <PayrollSummaryCard
          label="Total Deductions"
          value={fmtTZS(summary.total_deductions)}
          subtext="All entries"
          accentColor="#F59E0B"
        />
        <PayrollSummaryCard
          label="Total Net Payroll"
          value={fmtTZS(summary.total_net)}
          subtext={`${summary.paid_count} entries paid`}
          accentColor="#22C55E"
        />
      </div>

      {/* Department breakdown (if entries exist) */}
      {Object.keys(summary.by_department).length > 0 && (
        <div style={{ marginBottom: '1.5rem', background: '#111111', border: '1px solid #1A1A1A', padding: '1rem 1.25rem' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Net Payroll By Department
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {Object.entries(summary.by_department).sort((a, b) => b[1] - a[1]).map(([dept, net]) => (
              <div key={dept}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  {dept}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#22C55E' }}>
                  {fmtTZS(net)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table section */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
          ALL PAYROLL ENTRIES
        </h2>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.08em' }}>
          {initialEntries.length} total
        </span>
      </div>

      <PayrollTable
        entries={displayedEntries}
        onSelectEntry={setSelectedEntry}
        showReviewButton
      />

      {selectedEntry && (
        <PayrollReviewModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onReview={handleReview}
        />
      )}
    </div>
  )
}

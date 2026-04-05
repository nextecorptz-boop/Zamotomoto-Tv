'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PayrollEntry } from '@/types'
import type { PayrollSummaryResult } from '@/app/(dashboard)/accounting/payroll/actions'
import type { EmployeeWithSalary } from '@/app/(dashboard)/accounting/payroll/salary-actions'
import type { PayrollMonthDetail } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'
import { approvePayrollEntry, markPayrollPaid } from '@/app/(dashboard)/accounting/payroll/actions'
import { PayrollSummaryCard } from './PayrollSummaryCard'
import { PayrollTable } from './PayrollTable'
import SalaryRecordsClient from './SalaryRecordsClient'

interface Props {
  entries: PayrollEntry[]
  summary: PayrollSummaryResult
  activeBatch: PayrollMonthDetail | null
  employees: EmployeeWithSalary[]
}

type Tab = 'overview' | 'salary' | 'legacy'

function fmtTZS(n: number) {
  return `TZS ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'salary',   label: 'SALARY RECORDS' },
  { key: 'legacy',   label: 'LEGACY ENTRIES' },
]

// ── Batch Status Color ─────────────────────────────────────────────────────────
function batchStatusColor(status: string): string {
  switch (status) {
    case 'draft':              return '#888888'
    case 'submitted':          return '#F59E0B'
    case 'partially_reviewed': return '#8B5CF6'
    case 'approved':           return '#22C55E'
    case 'paid':               return '#22C55E'
    case 'closed':             return '#444444'
    default:                   return '#888888'
  }
}

// ── Legacy Review Modal ────────────────────────────────────────────────────────
function LegacyReviewModal({
  entry,
  onClose,
  onAction,
}: {
  entry: PayrollEntry
  onClose: () => void
  onAction: (decision: 'approved' | 'rejected' | 'paid', reason?: string, paidDate?: string) => Promise<void>
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [paymentDate, setPaymentDate]   = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading]           = useState(false)
  const [activeAction, setActiveAction] = useState<'reject' | null>(null)

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '0.45rem 0', borderBottom: '1px solid #1A1A1A',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #2A2A2A' }}>
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
              LEGACY REVIEW
            </h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#CC1F1F' }}>{entry.pr_ref}</span>
          </div>
          <button data-testid="legacy-modal-close" onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#888888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {[
            ['Employee', entry.employee_name],
            ['Department', entry.department.toUpperCase()],
            ['Role', entry.role_title || '—'],
            ['Gross', fmtTZS(Number(entry.gross_amount))],
            ['Deductions', fmtTZS(Number(entry.deductions))],
            ['Net', fmtTZS(Number(entry.net_amount))],
            ['Month', entry.payment_month?.slice(0, 7)],
            ['Status', entry.status.toUpperCase()],
          ].map(([label, value]) => (
            <div key={label as string} style={rowStyle}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#666666', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: label === 'Net' ? '#22C55E' : label === 'Deductions' ? '#FF9500' : '#FFFFFF' }}>{value}</span>
            </div>
          ))}

          {entry.reject_reason && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#1A0000', border: '1px solid #CC1F1F' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rejection Reason</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FF6B6B', marginTop: '0.3rem' }}>{entry.reject_reason}</div>
            </div>
          )}
        </div>

        {(entry.status === 'pending' || entry.status === 'approved') && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entry.status === 'pending' && (
              activeAction === 'reject' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    data-testid="legacy-reject-reason"
                    type="text"
                    placeholder="Rejection reason…"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    style={{ background: '#1A0000', border: '1px solid #CC1F1F', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', padding: '0.5rem 0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button data-testid="legacy-confirm-reject-btn" disabled={loading} onClick={async () => { setLoading(true); await onAction('rejected', rejectReason); setLoading(false) }}
                      style={{ flex: 1, background: '#CC1F1F', border: 'none', color: '#FFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em', padding: '0.55rem', cursor: 'pointer' }}>
                      {loading ? 'REJECTING…' : 'CONFIRM REJECT'}
                    </button>
                    <button onClick={() => setActiveAction(null)} style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', cursor: 'pointer' }}>CANCEL</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button data-testid="legacy-approve-btn" disabled={loading} onClick={async () => { setLoading(true); await onAction('approved'); setLoading(false) }}
                    style={{ flex: 1, background: '#8B5CF6', border: 'none', color: '#FFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.1em', padding: '0.6rem', cursor: 'pointer' }}>
                    {loading ? 'APPROVING…' : 'APPROVE'}
                  </button>
                  <button onClick={() => setActiveAction('reject')}
                    style={{ flex: 1, background: 'transparent', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.1em', padding: '0.6rem', cursor: 'pointer' }}>
                    REJECT
                  </button>
                </div>
              )
            )}
            {entry.status === 'approved' && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input data-testid="legacy-payment-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                  style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.5rem 0.65rem', outline: 'none', colorScheme: 'dark' }} />
                <button data-testid="legacy-mark-paid-btn" disabled={loading} onClick={async () => { setLoading(true); await onAction('paid', undefined, paymentDate); setLoading(false) }}
                  style={{ flex: 1, background: '#22C55E', border: 'none', color: '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.1em', padding: '0.6rem', cursor: 'pointer', fontWeight: 700 }}>
                  {loading ? 'MARKING…' : 'MARK PAID'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPayrollClient({ entries, summary, activeBatch, employees }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab]         = useState<Tab>('overview')
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null)
  const [toast, setToast]                 = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleLegacyReview = useCallback(async (
    decision: 'approved' | 'rejected' | 'paid',
    reason?: string,
    paidDate?: string
  ) => {
    if (!selectedEntry) return
    let result: { success: boolean; error?: string }
    if (decision === 'paid') {
      result = await markPayrollPaid(selectedEntry.id, paidDate ?? new Date().toISOString().slice(0, 10))
    } else {
      result = await approvePayrollEntry(selectedEntry.id, decision as 'approved' | 'rejected', reason)
    }
    if (!result.success && 'error' in result) { showToast(`Error: ${result.error}`); return }
    showToast(`${selectedEntry.pr_ref} marked as ${decision.toUpperCase()}`)
    setSelectedEntry(null)
    router.refresh()
  }, [selectedEntry, router])

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {toast && (
        <div data-testid="admin-payroll-toast" style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem', letterSpacing: '0.05em' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>PAYROLL DASHBOARD</h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>Financial overview and payroll management</p>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #2A2A2A', marginBottom: '1.75rem' }}>
        {TAB_LABELS.map(t => (
          <button
            key={t.key}
            data-testid={`payroll-tab-${t.key}`}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: activeTab === t.key ? '#CC1F1F' : 'transparent',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid #FF2B2B' : '2px solid transparent',
              color: activeTab === t.key ? '#FFFFFF' : '#666666',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.18em',
              padding: '0.6rem 1.25rem', cursor: 'pointer', textTransform: 'uppercase',
              transition: 'color 150ms',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Phase A: Status-gated summary cards */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <PayrollSummaryCard
              label="Committed (Approved)"
              value={fmtTZS(summary.approved_total)}
              subtext="Not yet paid"
              accentColor="#8B5CF6"
            />
            <PayrollSummaryCard
              label="Total Paid (Finalized)"
              value={fmtTZS(summary.paid_total)}
              subtext={`${summary.paid_count} entries`}
              accentColor="#22C55E"
            />
            <PayrollSummaryCard
              label="Pending Review"
              value={String(summary.pending_count)}
              subtext="Awaiting admin action"
              accentColor="#F59E0B"
            />
            {/* Rejected — AUDIT ONLY, visually separated */}
            <div
              data-testid="payroll-audit-card"
              style={{
                background: '#1A0000',
                borderLeft: '4px solid #CC1F1F',
                padding: '1.25rem 1.5rem',
                flex: 1,
                minWidth: 0,
                position: 'relative',
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#CC1F1F', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                REJECTED — AUDIT ONLY
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#FF6B6B', lineHeight: 1, letterSpacing: '0.04em' }}>
                {fmtTZS(summary.rejected_total)}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#CC1F1F', marginTop: '0.3rem', letterSpacing: '0.05em' }}>
                {summary.rejected_count} entries — NOT included in totals
              </div>
            </div>
          </div>

          {/* Active batch card */}
          {activeBatch && (
            <div style={{ marginBottom: '1.5rem', background: '#111111', border: '1px solid #2A2A2A', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '0.1em' }}>
                    ACTIVE PAYROLL — {activeBatch.period_label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', marginTop: '0.2rem', letterSpacing: '0.05em' }}>
                    {activeBatch.line_items.length} employees · Month status: {activeBatch.status.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    background: batchStatusColor(activeBatch.batch?.status ?? ''),
                    color: '#000',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.1em',
                    padding: '0.2rem 0.55rem', textTransform: 'uppercase', fontWeight: 700,
                  }}>
                    {activeBatch.batch?.status?.toUpperCase() ?? 'NO BATCH'}
                  </span>
                  {activeBatch.batch && (
                    <a
                      data-testid="admin-review-batch-link"
                      href={`/accounting/payroll/${activeBatch.id}`}
                      style={{
                        background: '#CC1F1F', color: '#FFFFFF',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em',
                        padding: '0.4rem 0.9rem', textDecoration: 'none', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}
                    >
                      REVIEW BATCH →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Department breakdown */}
          {Object.keys(summary.by_department).length > 0 && (
            <div style={{ background: '#111111', border: '1px solid #1A1A1A', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Net Payroll by Department (Approved + Paid Only)
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {Object.entries(summary.by_department).sort((a, b) => b[1] - a[1]).map(([dept, net]) => (
                  <div key={dept}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{dept}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#22C55E' }}>{fmtTZS(net)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick nav to history */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href="/accounting/payroll/history" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid #2A2A2A', padding: '0.4rem 0.85rem', textTransform: 'uppercase' }}>
              VIEW HISTORY →
            </a>
          </div>
        </div>
      )}

      {/* ── SALARY RECORDS TAB ── */}
      {activeTab === 'salary' && (
        <SalaryRecordsClient employees={employees} isAdmin={true} onSave={() => router.refresh()} />
      )}

      {/* ── LEGACY ENTRIES TAB ── */}
      {activeTab === 'legacy' && (
        <div>
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>LEGACY ENTRIES</h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em' }}>Read-only archive · New entries use new workflow</span>
          </div>
          <PayrollTable entries={entries} onSelectEntry={setSelectedEntry} showReviewButton />
        </div>
      )}

      {selectedEntry && (
        <LegacyReviewModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onAction={handleLegacyReview}
        />
      )}
    </div>
  )
}

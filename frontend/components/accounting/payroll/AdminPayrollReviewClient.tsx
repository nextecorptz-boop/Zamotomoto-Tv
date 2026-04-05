'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { LineItemWithEmployee, PayrollMonthDetail } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'
import {
  approveLineItems,
  rejectLineItems,
  excludeLineItem,
  markBatchPaid,
  closePayrollMonth,
  type AdminPayrollTotals,
} from '@/app/(dashboard)/accounting/payroll/admin-payroll-actions'

// ── Compute totals (pure utility, defined here to avoid 'use server' constraint) ──
function computeTotals(items: LineItemWithEmployee[]): AdminPayrollTotals {
  let approved_total = 0, paid_total = 0, pending_total = 0, rejected_total = 0
  let pending_count = 0, approved_count = 0, paid_count = 0, rejected_count = 0, excluded_count = 0

  for (const item of items) {
    const net = item.net_pay
    switch (item.status) {
      case 'approved':     approved_total += net; approved_count++; break
      case 'paid':         paid_total += net; paid_count++; break
      case 'pending':
      case 'resubmitted':  pending_total += net; pending_count++; break
      case 'rejected':     rejected_total += net; rejected_count++; break
      case 'excluded':     excluded_count++; break
    }
  }

  return {
    approved_total, paid_total, pending_total, rejected_total,
    committed_total: approved_total + paid_total,
    pending_count, approved_count, paid_count, rejected_count, excluded_count,
  }
}

interface Props {
  monthDetail: PayrollMonthDetail | null
  month_id: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:        { bg: '#444444', text: '#FFFFFF' },
  pending:      { bg: '#F59E0B', text: '#000000' },
  resubmitted:  { bg: '#8B5CF6', text: '#FFFFFF' },
  approved:     { bg: '#22C55E', text: '#000000' },
  rejected:     { bg: '#EF4444', text: '#FFFFFF' },
  excluded:     { bg: '#333333', text: '#888888' },
  paid:         { bg: '#22C55E', text: '#000000' },
}

function fmtTZS(n: number) {
  return `TZS ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function AdminPayrollReviewClient({ monthDetail, month_id }: Props) {
  const router = useRouter()
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [rejectReason, setRejectReason] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [excludeId, setExcludeId]     = useState<string | null>(null)
  const [excludeReason, setExcludeReason] = useState('')
  const [loading, setLoading]         = useState<string | null>(null)
  const [toast, setToast]             = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  if (!monthDetail || !monthDetail.batch) {
    return (
      <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
        <a href="/accounting/payroll" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', textDecoration: 'none', display: 'block', marginBottom: '1rem' }}>← BACK TO PAYROLL</a>
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>
          No active batch found for this period.
        </div>
      </div>
    )
  }

  const items = monthDetail.line_items
  const totals = computeTotals(items)
  const batch = monthDetail.batch
  const reviewableItems = items.filter(i => i.status === 'pending' || i.status === 'resubmitted')
  const selectedIds = Array.from(selected)
  const allSelected = reviewableItems.length > 0 && selectedIds.length === reviewableItems.length

  const toggleSelect = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(reviewableItems.map(i => i.id)))
  }

  const handleApprove = useCallback(async () => {
    if (!selectedIds.length) return
    setError(null); setLoading('approve')
    const result = await approveLineItems(selectedIds)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast(`${result.approved_count} items approved`)
    setSelected(new Set())
    router.refresh()
  }, [selectedIds, router])

  const handleReject = useCallback(async () => {
    if (!selectedIds.length || !rejectReason.trim()) { setError('Select items and enter rejection reason'); return }
    setError(null); setLoading('reject')
    const result = await rejectLineItems(selectedIds, rejectReason)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast(`${result.rejected_count} items rejected`)
    setSelected(new Set()); setRejectReason(''); setShowRejectForm(false)
    router.refresh()
  }, [selectedIds, rejectReason, router])

  const handleExclude = useCallback(async () => {
    if (!excludeId || !excludeReason.trim()) return
    setError(null); setLoading('exclude')
    const result = await excludeLineItem(excludeId, excludeReason)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast('Item excluded')
    setExcludeId(null); setExcludeReason('')
    router.refresh()
  }, [excludeId, excludeReason, router])

  const handleMarkPaid = useCallback(async () => {
    if (!batch || !confirm(`Mark this batch as paid on ${paymentDate}? This is irreversible.`)) return
    setError(null); setLoading('paid')
    const result = await markBatchPaid(batch.id, paymentDate)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast('Batch marked as paid')
    router.refresh()
  }, [batch, paymentDate, router])

  const handleCloseMonth = useCallback(async () => {
    if (!confirm('Close this payroll month? No further changes will be allowed.')) return
    setError(null); setLoading('close')
    const result = await closePayrollMonth(month_id)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast('Month closed')
    router.push('/accounting/payroll')
  }, [month_id, router])

  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem',
    padding: '0.45rem 0.65rem', outline: 'none',
  }

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {toast && (
        <div data-testid="admin-review-toast" style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/accounting/payroll" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>← PAYROLL DASHBOARD</a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
              {monthDetail.period_label.toUpperCase()} — REVIEW
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.3rem' }}>
              Batch: <span style={{ color: STATUS_COLORS[batch.status]?.bg ?? '#888' }}>{batch.status.toUpperCase()}</span> · {items.length} employees
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {batch.status === 'approved' && (
              <>
                <input data-testid="payment-date-input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark', width: '140px' }} />
                <button data-testid="mark-batch-paid-btn" disabled={loading === 'paid'} onClick={handleMarkPaid}
                  style={{ background: '#22C55E', border: 'none', color: '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.12em', padding: '0.5rem 1.1rem', cursor: 'pointer', fontWeight: 700 }}>
                  {loading === 'paid' ? 'MARKING…' : 'MARK PAID'}
                </button>
              </>
            )}
            {batch.status === 'paid' && monthDetail.status === 'paid' && (
              <button data-testid="close-month-btn" disabled={loading === 'close'} onClick={handleCloseMonth}
                style={{ background: 'transparent', border: '1px solid #444444', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0.4rem 0.85rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                {loading === 'close' ? 'CLOSING…' : 'CLOSE MONTH'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totals summary */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <TotalCard label="Approved" value={fmtTZS(totals.approved_total)} count={totals.approved_count} color="#22C55E" />
        <TotalCard label="Paid" value={fmtTZS(totals.paid_total)} count={totals.paid_count} color="#22C55E" />
        <TotalCard label="Pending" value={fmtTZS(totals.pending_total)} count={totals.pending_count} color="#F59E0B" />
        {totals.rejected_count > 0 && (
          <TotalCard label="Rejected (AUDIT)" value={fmtTZS(totals.rejected_total)} count={totals.rejected_count} color="#CC1F1F" isAudit />
        )}
        {totals.excluded_count > 0 && (
          <TotalCard label="Excluded" value="" count={totals.excluded_count} color="#444444" />
        )}
      </div>

      {error && <div style={{ marginBottom: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F' }}>{error}</div>}

      {/* Bulk action bar */}
      {reviewableItems.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.65rem 1rem', background: '#111111', border: '1px solid #1A1A1A', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ accentColor: '#CC1F1F', width: '14px', height: '14px' }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.08em' }}>SELECT ALL ({reviewableItems.length})</span>
          </label>
          {selected.size > 0 && (
            <>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.06em' }}>{selected.size} selected</span>
              <button data-testid="bulk-approve-btn" disabled={loading === 'approve'} onClick={handleApprove}
                style={{ background: '#22C55E', border: 'none', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.75rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 700 }}>
                {loading === 'approve' ? 'APPROVING…' : 'APPROVE SELECTED'}
              </button>

              {showRejectForm ? (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input data-testid="bulk-reject-reason" type="text" placeholder="Rejection reason *" value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)} style={{ ...inputStyle, width: '220px', fontSize: '0.6rem', padding: '0.3rem 0.5rem' }} />
                  <button data-testid="bulk-reject-confirm-btn" disabled={loading === 'reject'} onClick={handleReject}
                    style={{ background: '#CC1F1F', border: 'none', color: '#FFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.08em', padding: '0.3rem 0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                    {loading === 'reject' ? '…' : 'CONFIRM REJECT'}
                  </button>
                  <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                    style={{ background: 'transparent', border: '1px solid #444', color: '#888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setShowRejectForm(true)}
                  style={{ background: 'transparent', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                  REJECT SELECTED
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Line items table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222222' }}>
              <th style={thStyle}>SEL</th>
              {['EMPLOYEE', 'ROLE', 'GROSS', 'DED', 'ADD', 'NET', 'STATUS', 'VER', ''].map(col => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const sc = STATUS_COLORS[item.status] ?? { bg: '#444', text: '#fff' }
              const isReviewable = item.status === 'pending' || item.status === 'resubmitted'
              return (
                <tr key={item.id} data-testid={`admin-line-item-${item.id}`}
                  style={{ borderBottom: '1px solid #1A1A1A', background: item.status === 'rejected' ? '#0D0000' : 'transparent', transition: 'background 100ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = item.status === 'rejected' ? '#1A0000' : '#1A1A1A' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = item.status === 'rejected' ? '#0D0000' : 'transparent' }}
                >
                  <td style={{ padding: '0.55rem 0.75rem' }}>
                    {isReviewable && (
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ accentColor: '#CC1F1F', width: '14px', height: '14px', cursor: 'pointer' }} />
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#FFFFFF', fontWeight: 600 }}>{item.employee.full_name}</td>
                  <td style={{ ...tdStyle, color: '#888888', fontSize: '0.58rem' }}>{item.employee.role.replace('_', ' ').toUpperCase()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#FFFFFF' }}>{(item.gross_salary / 1000).toFixed(0)}K</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: item.total_deductions > 0 ? '#FF9500' : '#444' }}>{item.total_deductions > 0 ? `-${(item.total_deductions / 1000).toFixed(0)}K` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: item.total_additions > 0 ? '#22C55E' : '#444' }}>{item.total_additions > 0 ? `+${(item.total_additions / 1000).toFixed(0)}K` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#22C55E', fontWeight: 700 }}>{(item.net_pay / 1000).toFixed(0)}K</td>
                  <td style={{ ...tdStyle }}>
                    <span style={{ background: sc.bg, color: sc.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.1em', padding: '0.12rem 0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#555', textAlign: 'center' }}>v{item.version}</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>
                    {item.status !== 'excluded' && item.status !== 'paid' && (
                      <button data-testid={`exclude-btn-${item.id}`} onClick={() => { setExcludeId(item.id); setExcludeReason('') }}
                        style={{ background: 'transparent', border: '1px solid #333', color: '#666', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.08em', padding: '0.2rem 0.45rem', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        EXCL
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Exclude confirmation modal */}
      {excludeId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setExcludeId(null) }}>
          <div style={{ background: '#111111', border: '1px solid #2A2A2A', width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 1rem 0' }}>EXCLUDE EMPLOYEE</h3>
            <div style={{ marginBottom: '0.65rem' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Reason *</div>
              <input data-testid="exclude-reason-input" type="text" value={excludeReason} onChange={e => setExcludeReason(e.target.value)}
                placeholder="Reason for exclusion…" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button data-testid="exclude-confirm-btn" disabled={loading === 'exclude' || !excludeReason.trim()} onClick={handleExclude}
                style={{ flex: 1, background: '#CC1F1F', border: 'none', color: '#FFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.12em', padding: '0.5rem', cursor: 'pointer' }}>
                {loading === 'exclude' ? 'EXCLUDING…' : 'CONFIRM EXCLUDE'}
              </button>
              <button onClick={() => setExcludeId(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #2A2A2A', color: '#888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#666666',
  letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.55rem 0.75rem',
  textAlign: 'left', whiteSpace: 'nowrap' as const, fontWeight: 600, background: '#0D0D0D',
}

const tdStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.65rem', color: '#FFFFFF', whiteSpace: 'nowrap' as const,
}

function TotalCard({ label, value, count, color, isAudit }: { label: string; value: string; count: number; color: string; isAudit?: boolean }) {
  return (
    <div style={{ background: isAudit ? '#1A0000' : '#111111', borderLeft: `4px solid ${color}`, padding: '0.75rem 1.1rem', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: isAudit ? '#CC1F1F' : '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
        {label}{isAudit && ' — NOT IN TOTALS'}
      </div>
      {value && <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', color: color, lineHeight: 1 }}>{value}</div>}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: color, marginTop: '0.15rem' }}>{count} items</div>
    </div>
  )
}

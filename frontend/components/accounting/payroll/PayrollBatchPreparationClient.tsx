'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PayrollMonthDetail, LineItemWithEmployee } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'
import { buildPayrollBatch, addAdjustment, removeAdjustment, submitBatch } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'

interface Props {
  monthDetail: PayrollMonthDetail
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:      { bg: '#444444', text: '#FFFFFF' },
  pending:    { bg: '#F59E0B', text: '#000000' },
  approved:   { bg: '#22C55E', text: '#000000' },
  rejected:   { bg: '#EF4444', text: '#FFFFFF' },
  excluded:   { bg: '#333333', text: '#888888' },
}

function fmtTZS(n: number) {
  return n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function PayrollBatchPreparationClient({ monthDetail }: Props) {
  const router = useRouter()
  const [loading, setLoading]       = useState<string | null>(null)  // action key
  const [toast, setToast]           = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [adjEmployeeId, setAdjEmployeeId] = useState<string | null>(null)
  const [adjType, setAdjType]       = useState<'advance' | 'deduction' | 'bonus'>('deduction')
  const [adjAmount, setAdjAmount]   = useState('')
  const [adjReason, setAdjReason]   = useState('')

  const batch = monthDetail.batch
  const items = monthDetail.line_items

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleBuildBatch = useCallback(async () => {
    setError(null); setLoading('build')
    const result = await buildPayrollBatch(monthDetail.id)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast(`Batch built for ${result.headcount} employees`)
    router.refresh()
  }, [monthDetail.id, router])

  const handleAddAdjustment = useCallback(async (employeeId: string) => {
    setError(null)
    const amount = parseFloat(adjAmount)
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid adjustment amount'); return }
    if (!adjReason.trim()) { setError('Reason is required'); return }
    setLoading(`adj-${employeeId}`)
    const result = await addAdjustment(monthDetail.id, employeeId, adjType, amount, adjReason)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast('Adjustment added')
    setAdjEmployeeId(null); setAdjAmount(''); setAdjReason('')
    router.refresh()
  }, [monthDetail.id, adjType, adjAmount, adjReason, router])

  const handleRemoveAdjustment = useCallback(async (adjId: string) => {
    setError(null); setLoading(`remove-${adjId}`)
    const result = await removeAdjustment(adjId)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast('Adjustment removed')
    router.refresh()
  }, [router])

  const handleSubmit = useCallback(async () => {
    if (!batch) return
    if (!confirm('Submit this batch for admin review? This cannot be undone.')) return
    setError(null); setLoading('submit')
    const result = await submitBatch(batch.id)
    setLoading(null)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    showToast('Batch submitted for admin review')
    router.refresh()
  }, [batch, router])

  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem',
    padding: '0.4rem 0.6rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {toast && (
        <div data-testid="batch-prep-toast" style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <a href="/accounting/workspace/payroll" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em', textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}>← BACK TO MONTHS</a>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>{monthDetail.period_label.toUpperCase()}</h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.3rem' }}>
            Month: <span style={{ color: '#CC1F1F' }}>{monthDetail.status.toUpperCase()}</span>
            {batch && <> · Batch: <span style={{ color: STATUS_COLORS[batch.status]?.bg ?? '#888' }}>{batch.status.toUpperCase()}</span></>}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!batch && monthDetail.status === 'open' && (
            <button data-testid="build-batch-btn" disabled={loading === 'build'} onClick={handleBuildBatch}
              style={{ background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.55rem 1.25rem', cursor: 'pointer' }}>
              {loading === 'build' ? 'BUILDING…' : 'BUILD BATCH'}
            </button>
          )}
          {batch && batch.status === 'draft' && items.length > 0 && (
            <button data-testid="submit-batch-btn" disabled={loading === 'submit'} onClick={handleSubmit}
              style={{ background: '#8B5CF6', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.55rem 1.25rem', cursor: 'pointer' }}>
              {loading === 'submit' ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'}
            </button>
          )}
          {items.some(i => i.status === 'rejected') && (
            <a data-testid="corrections-link" href={`/accounting/workspace/payroll/${monthDetail.id}/corrections`}
              style={{ background: '#CC1F1F', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0.45rem 0.9rem', textDecoration: 'none', textTransform: 'uppercase' }}>
              CORRECTIONS ({items.filter(i => i.status === 'rejected').length})
            </a>
          )}
        </div>
      </div>

      {error && <div style={{ marginBottom: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F' }}>{error}</div>}

      {/* No batch state */}
      {!batch && (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444', border: '1px dashed #2A2A2A' }}>
          No batch created yet. Click BUILD BATCH to auto-populate from salary records.
        </div>
      )}

      {/* Line items */}
      {items.length > 0 && (
        <div>
          <div style={{ marginBottom: '0.5rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {items.length} employees · {batch?.status.toUpperCase()} batch
          </div>
          {items.map(item => (
            <LineItemRow
              key={item.id}
              item={item}
              monthId={monthDetail.id}
              batchStatus={batch?.status ?? ''}
              isAdjEditing={adjEmployeeId === item.employee_id}
              adjType={adjType}
              adjAmount={adjAmount}
              adjReason={adjReason}
              onAdjTypeChange={setAdjType}
              onAdjAmountChange={setAdjAmount}
              onAdjReasonChange={setAdjReason}
              onOpenAdj={() => { setAdjEmployeeId(item.employee_id); setError(null) }}
              onCloseAdj={() => setAdjEmployeeId(null)}
              onAddAdj={() => handleAddAdjustment(item.employee_id)}
              onRemoveAdj={handleRemoveAdjustment}
              loadingKey={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Line Item Row ─────────────────────────────────────────────────────────────
function LineItemRow({
  item, monthId, batchStatus,
  isAdjEditing, adjType, adjAmount, adjReason,
  onAdjTypeChange, onAdjAmountChange, onAdjReasonChange,
  onOpenAdj, onCloseAdj, onAddAdj, onRemoveAdj, loadingKey,
}: {
  item: LineItemWithEmployee
  monthId: string
  batchStatus: string
  isAdjEditing: boolean
  adjType: 'advance' | 'deduction' | 'bonus'
  adjAmount: string
  adjReason: string
  onAdjTypeChange: (v: 'advance' | 'deduction' | 'bonus') => void
  onAdjAmountChange: (v: string) => void
  onAdjReasonChange: (v: string) => void
  onOpenAdj: () => void
  onCloseAdj: () => void
  onAddAdj: () => void
  onRemoveAdj: (id: string) => void
  loadingKey: string | null
}) {
  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    draft:        { bg: '#444444', text: '#FFFFFF' },
    pending:      { bg: '#F59E0B', text: '#000000' },
    resubmitted:  { bg: '#8B5CF6', text: '#FFFFFF' },
    approved:     { bg: '#22C55E', text: '#000000' },
    rejected:     { bg: '#EF4444', text: '#FFFFFF' },
    excluded:     { bg: '#333333', text: '#888888' },
    paid:         { bg: '#22C55E', text: '#000000' },
  }

  const sc = STATUS_COLORS[item.status] ?? { bg: '#444', text: '#fff' }
  const canEdit = batchStatus === 'draft'
  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem',
    padding: '0.35rem 0.55rem', outline: 'none',
  }

  return (
    <div data-testid={`line-item-row-${item.id}`} style={{ background: '#111111', border: `1px solid ${item.status === 'rejected' ? '#CC1F1F' : '#1A1A1A'}`, marginBottom: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', gap: '1rem' }}>
        {/* Employee info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF' }}>{item.employee.full_name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#666666' }}>
            {item.employee.role.replace('_', ' ').toUpperCase()} {item.employee.department && `· ${item.employee.department.toUpperCase()}`}
          </div>
        </div>

        {/* Financials */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.1em' }}>GROSS</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FFFFFF' }}>{(item.gross_salary / 1000).toFixed(0)}K</div>
          </div>
          {item.total_deductions > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.1em' }}>DED</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FF9500' }}>-{(item.total_deductions / 1000).toFixed(0)}K</div>
            </div>
          )}
          {item.total_additions > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.1em' }}>ADD</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#22C55E' }}>+{(item.total_additions / 1000).toFixed(0)}K</div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.1em' }}>NET</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', color: '#22C55E', fontWeight: 700 }}>{(item.net_pay / 1000).toFixed(0)}K</div>
          </div>
        </div>

        <span style={{ background: sc.bg, color: sc.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', letterSpacing: '0.1em', padding: '0.15rem 0.45rem', textTransform: 'uppercase', fontWeight: 700 }}>
          {item.status.toUpperCase()}
        </span>

        {canEdit && (
          <button data-testid={`adj-toggle-${item.id}`} onClick={isAdjEditing ? onCloseAdj : onOpenAdj}
            style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', letterSpacing: '0.08em', padding: '0.25rem 0.55rem', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {isAdjEditing ? 'CLOSE' : '+ ADJ'}
          </button>
        )}
      </div>

      {/* Rejection reason */}
      {item.status === 'rejected' && item.rejection_reason && (
        <div style={{ padding: '0 1rem 0.5rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#FF6B6B' }}>
          Rejection: {item.rejection_reason}
        </div>
      )}

      {/* Adjustments list */}
      {item.adjustments.length > 0 && (
        <div style={{ borderTop: '1px solid #1A1A1A', padding: '0.5rem 1rem' }}>
          {item.adjustments.map(adj => (
            <div key={adj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: adj.type === 'bonus' ? '#22C55E' : '#FF9500' }}>
                {adj.type.toUpperCase()}: TZS {Number(adj.amount).toLocaleString('en')} — {adj.reason}
              </span>
              {canEdit && (
                <button data-testid={`remove-adj-${adj.id}`} disabled={loadingKey === `remove-${adj.id}`} onClick={() => onRemoveAdj(adj.id)}
                  style={{ background: 'transparent', border: 'none', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', cursor: 'pointer', padding: '0.15rem 0.35rem' }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline adjustment form */}
      {isAdjEditing && (
        <div style={{ borderTop: '1px solid #2A2A2A', padding: '0.75rem 1rem', background: '#0D0D0D' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <select value={adjType} onChange={e => onAdjTypeChange(e.target.value as 'advance' | 'deduction' | 'bonus')}
              style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}>
              <option value="deduction">Deduction</option>
              <option value="advance">Advance</option>
              <option value="bonus">Bonus</option>
            </select>
            <input type="text" inputMode="decimal" placeholder="Amount (TZS)" value={adjAmount}
              onChange={e => onAdjAmountChange(e.target.value)} style={{ ...inputStyle, width: '140px' }} />
            <input type="text" placeholder="Reason *" value={adjReason}
              onChange={e => onAdjReasonChange(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />
            <button data-testid={`add-adj-btn-${item.id}`} disabled={loadingKey === `adj-${item.employee_id}`} onClick={onAddAdj}
              style={{ background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.08em', padding: '0.4rem 0.85rem', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {loadingKey === `adj-${item.employee_id}` ? '…' : 'ADD'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

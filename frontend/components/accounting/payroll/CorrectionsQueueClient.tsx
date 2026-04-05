'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PayrollMonthDetail, LineItemWithEmployee } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'
import { resubmitLineItem } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'

interface Props {
  monthDetail: PayrollMonthDetail
}

export default function CorrectionsQueueClient({ monthDetail }: Props) {
  const router = useRouter()
  const rejectedItems = monthDetail.line_items.filter(i => i.status === 'rejected')

  if (rejectedItems.length === 0) {
    return (
      <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
        <a href={`/accounting/workspace/payroll/${monthDetail.id}`} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em', textDecoration: 'none', display: 'block', marginBottom: '1rem' }}>← BACK TO BATCH</a>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 1.5rem 0' }}>CORRECTIONS QUEUE</h1>
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444', border: '1px dashed #2A2A2A' }}>
          No rejected items — all clear.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      <a href={`/accounting/workspace/payroll/${monthDetail.id}`} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>← BACK TO BATCH</a>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>CORRECTIONS QUEUE</h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', marginTop: '0.3rem', letterSpacing: '0.06em' }}>
          {rejectedItems.length} item(s) need correction — {monthDetail.period_label}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rejectedItems.map(item => (
          <CorrectionCard key={item.id} item={item} monthDetail={monthDetail} />
        ))}
      </div>
    </div>
  )
}

function CorrectionCard({ item, monthDetail }: { item: LineItemWithEmployee; monthDetail: PayrollMonthDetail }) {
  const router = useRouter()
  const [newDeductions, setNewDeductions] = useState(String(item.total_deductions))
  const [newAdditions, setNewAdditions]   = useState(String(item.total_additions))
  const [correctionNote, setCorrectionNote] = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [submitted, setSubmitted]         = useState(false)

  const gross = item.gross_salary
  const ded   = parseFloat(newDeductions) || 0
  const adds  = parseFloat(newAdditions) || 0
  const net   = gross - ded + adds

  const handleResubmit = useCallback(async () => {
    setError(null)
    if (ded < 0 || adds < 0) { setError('Values cannot be negative'); return }
    setLoading(true)
    const result = await resubmitLineItem(item.id, ded, adds, correctionNote || undefined)
    setLoading(false)
    if (!result.success) { setError('error' in result ? result.error : 'Failed'); return }
    setSubmitted(true)
    router.refresh()
  }, [item.id, ded, adds, correctionNote, router])

  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
    padding: '0.45rem 0.65rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  if (submitted) {
    return (
      <div style={{ background: '#0A1A0A', border: '1px solid #22C55E', padding: '0.85rem 1.25rem' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#22C55E' }}>
          ✓ {item.employee.full_name} — Resubmitted for review
        </div>
      </div>
    )
  }

  return (
    <div data-testid={`correction-card-${item.id}`} style={{ background: '#111111', border: '1px solid #CC1F1F' }}>
      <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#FFFFFF' }}>{item.employee.full_name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#666666', marginTop: '0.1rem' }}>
            {item.employee.role.replace('_', ' ').toUpperCase()} · v{item.version}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#FFFFFF' }}>
            GROSS: TZS {(item.gross_salary / 1000).toFixed(0)}K
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#CC1F1F', marginTop: '0.1rem' }}>
            REJECTED
          </div>
        </div>
      </div>

      {item.rejection_reason && (
        <div style={{ padding: '0.75rem 1.25rem', background: '#1A0000', borderBottom: '1px solid #1A1A1A' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Admin Rejection Reason</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FF6B6B' }}>{item.rejection_reason}</div>
        </div>
      )}

      <div style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>New Deductions (TZS)</div>
            <input data-testid={`correction-deductions-${item.id}`} type="text" inputMode="decimal" value={newDeductions} onChange={e => setNewDeductions(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>New Additions (TZS)</div>
            <input data-testid={`correction-additions-${item.id}`} type="text" inputMode="decimal" value={newAdditions} onChange={e => setNewAdditions(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase' }}>New Net</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', color: net >= 0 ? '#22C55E' : '#CC1F1F', fontWeight: 700 }}>TZS {net.toLocaleString('en', { minimumFractionDigits: 0 })}</span>
        </div>

        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Correction Note (optional)</div>
          <input data-testid={`correction-note-${item.id}`} type="text" value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} placeholder="Explain correction…" style={inputStyle} />
        </div>

        {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#CC1F1F' }}>{error}</div>}

        <button data-testid={`resubmit-btn-${item.id}`} disabled={loading} onClick={handleResubmit}
          style={{ background: loading ? '#2A2A2A' : '#8B5CF6', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.12em', padding: '0.55rem', cursor: loading ? 'wait' : 'pointer', width: '100%' }}>
          {loading ? 'RESUBMITTING…' : 'RESUBMIT FOR REVIEW'}
        </button>
      </div>
    </div>
  )
}

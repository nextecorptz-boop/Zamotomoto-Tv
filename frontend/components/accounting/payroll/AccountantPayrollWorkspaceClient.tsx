'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PayrollMonthSummary } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'
import { openPayrollMonth } from '@/app/(dashboard)/accounting/workspace/payroll/payroll-actions'

interface Props {
  months: PayrollMonthSummary[]
}

const MONTH_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open:               { bg: '#22C55E', text: '#000000' },
  submitted:          { bg: '#F59E0B', text: '#000000' },
  partially_reviewed: { bg: '#8B5CF6', text: '#FFFFFF' },
  approved:           { bg: '#22C55E', text: '#000000' },
  paid:               { bg: '#22C55E', text: '#000000' },
  closed:             { bg: '#444444', text: '#FFFFFF' },
}

const MONTHS_LIST = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function AccountantPayrollWorkspaceClient({ months }: Props) {
  const router = useRouter()
  const now = new Date()
  const [showModal, setShowModal]   = useState(false)
  const [year, setYear]             = useState(now.getFullYear())
  const [month, setMonth]           = useState(now.getMonth() + 1)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [missingSalaries, setMissingSalaries] = useState<{ id: string; full_name: string }[]>([])

  const handleOpenMonth = useCallback(async () => {
    setError(null); setMissingSalaries([])
    setLoading(true)
    try {
      const result = await openPayrollMonth(year, month)
      if (!result.success) {
        setError('error' in result ? result.error : 'Failed')
        if ('missing_salaries' in result && result.missing_salaries) {
          setMissingSalaries(result.missing_salaries)
        }
        return
      }
      setShowModal(false)
      router.push(`/accounting/workspace/payroll/${result.month_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open month')
    } finally {
      setLoading(false)
    }
  }, [year, month, router])

  const openMonth = months.find(m => m.status === 'open')
  const hasOpenMonth = !!openMonth

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>PAYROLL WORKSPACE</h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>Manage payroll months and batch submissions</p>
        </div>
        <button
          data-testid="open-payroll-month-btn"
          onClick={() => { setShowModal(true); setError(null); setMissingSalaries([]) }}
          disabled={hasOpenMonth}
          style={{
            background: hasOpenMonth ? '#1A1A1A' : '#CC1F1F', border: 'none',
            color: hasOpenMonth ? '#666666' : '#FFFFFF',
            fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.15em',
            padding: '0.6rem 1.5rem', cursor: hasOpenMonth ? 'not-allowed' : 'pointer',
          }}
          title={hasOpenMonth ? `A month is already open: ${openMonth?.period_label}` : 'Open a new payroll month'}
        >
          + OPEN NEW MONTH
        </button>
      </div>

      {/* Open month banner */}
      {openMonth && (
        <a
          data-testid="open-month-banner"
          href={`/accounting/workspace/payroll/${openMonth.id}`}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#0A1A0A', border: '1px solid #22C55E', padding: '0.85rem 1.25rem',
            textDecoration: 'none', marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#22C55E', letterSpacing: '0.1em' }}>
              ACTIVE: {openMonth.period_label.toUpperCase()}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', marginTop: '0.15rem' }}>
              {openMonth.headcount} employees · {openMonth.batch_status ? `Batch: ${openMonth.batch_status.toUpperCase()}` : 'No batch yet'}
            </div>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#22C55E', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            CONTINUE →
          </span>
        </a>
      )}

      {/* Month list */}
      {months.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>
          No payroll months yet. Open the first one above.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222222' }}>
                {['PERIOD', 'MONTH STATUS', 'BATCH STATUS', 'EMPLOYEES', 'OPENED', ''].map(col => (
                  <th key={col} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.6rem 0.75rem', textAlign: 'left', background: '#0D0D0D', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.id} data-testid={`payroll-month-row-${m.id}`}
                  style={{ borderBottom: '1px solid #1A1A1A', transition: 'background 100ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#1A1A1A' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF' }}>{m.period_label}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span style={{ background: MONTH_STATUS_COLORS[m.status]?.bg ?? '#444', color: MONTH_STATUS_COLORS[m.status]?.text ?? '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', letterSpacing: '0.1em', padding: '0.15rem 0.45rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      {m.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888' }}>
                    {m.batch_status ? m.batch_status.toUpperCase() : '—'}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF' }}>{m.headcount}</td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                    {new Date(m.opened_at).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    {m.status !== 'closed' && (
                      <a data-testid={`payroll-month-link-${m.id}`} href={`/accounting/workspace/payroll/${m.id}`}
                        style={{ background: '#CC1F1F', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.08em', padding: '0.25rem 0.65rem', textDecoration: 'none', textTransform: 'uppercase' }}>
                        OPEN
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick links */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        <a href="/accounting/workspace/salary-records" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid #2A2A2A', padding: '0.4rem 0.85rem', textTransform: 'uppercase' }}>
          VIEW SALARY RECORDS →
        </a>
      </div>

      {/* Open month modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false) } }}
        >
          <div style={{ background: '#111111', border: '1px solid #2A2A2A', width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 1.25rem 0' }}>OPEN PAYROLL MONTH</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Year</div>
                <select data-testid="open-month-year" value={year} onChange={e => setYear(Number(e.target.value))}
                  style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', padding: '0.5rem 0.65rem', outline: 'none' }}>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Month</div>
                <select data-testid="open-month-month" value={month} onChange={e => setMonth(Number(e.target.value))}
                  style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', padding: '0.5rem 0.65rem', outline: 'none' }}>
                  {MONTHS_LIST.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', marginBottom: '0.3rem' }}>{error}</div>
                {missingSalaries.length > 0 && (
                  <div style={{ background: '#1A0000', border: '1px solid #CC1F1F', padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Missing salary records:</div>
                    {missingSalaries.map(e => (
                      <div key={e.id} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#FF9500' }}>• {e.full_name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button data-testid="open-month-confirm-btn" disabled={loading} onClick={handleOpenMonth}
                style={{ flex: 1, background: loading ? '#2A2A2A' : '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.6rem', cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'OPENING…' : 'CONFIRM OPEN'}
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

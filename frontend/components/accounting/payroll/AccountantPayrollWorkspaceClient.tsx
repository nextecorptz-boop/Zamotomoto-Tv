'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PayrollEntry } from '@/types'
import { PayrollForm } from './PayrollForm'
import { PayrollTable } from './PayrollTable'
import { deletePayrollEntry } from '@/app/(dashboard)/accounting/payroll/actions'

interface Props {
  entries: PayrollEntry[]
}

export default function AccountantPayrollWorkspaceClient({ entries: initialEntries }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<PayrollEntry[]>(initialEntries)
  const [toast, setToast]     = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sync when server re-renders
  useEffect(() => { setEntries(initialEntries) }, [initialEntries])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleFormSuccess = useCallback(() => {
    showToast('Payroll entry submitted!')
    router.refresh()
  }, [router])

  const handleDelete = useCallback(async (entry: PayrollEntry) => {
    if (entry.status !== 'pending') return
    if (!confirm(`Delete ${entry.pr_ref}? This action cannot be undone.`)) return

    setDeletingId(entry.id)
    const result = await deletePayrollEntry(entry.id)
    setDeletingId(null)

    if (!result.success && 'error' in result) {
      showToast(`Error: ${result.error}`)
      return
    }

    setEntries(prev => prev.filter(e => e.id !== entry.id))
    showToast(`${entry.pr_ref} deleted`)
  }, [])

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Toast */}
      {toast && (
        <div
          data-testid="payroll-workspace-toast"
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
          PAYROLL WORKSPACE
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          Submit and track employee payroll entries
        </p>
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Form (sticky) */}
        <div
          style={{
            position: 'sticky', top: '80px',
            background: '#111111', border: '1px solid #1A1A1A',
          }}
        >
          <PayrollForm onSuccess={handleFormSuccess} />
        </div>

        {/* Right: Entry records */}
        <div>
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #2A2A2A', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
              YOUR PAYROLL ENTRIES
            </h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.08em' }}>
              {entries.length}
            </span>
          </div>

          {/* Delete hint */}
          {entries.some(e => e.status === 'pending') && (
            <div style={{ marginBottom: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#555555', letterSpacing: '0.05em' }}>
              Pending entries can be deleted. Click row to view • Hover for delete option.
            </div>
          )}

          {entries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>
              No payroll entries yet. Use the form to log your first entry.
            </div>
          ) : (
            <PayrollTableWithDelete
              entries={entries}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Extended table with delete column for accountant ─────────────────────────
function PayrollTableWithDelete({
  entries,
  deletingId,
  onDelete,
}: {
  entries: PayrollEntry[]
  deletingId: string | null
  onDelete: (entry: PayrollEntry) => void
}) {
  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending:  { bg: '#F59E0B', text: '#000000' },
    approved: { bg: '#8B5CF6', text: '#FFFFFF' },
    paid:     { bg: '#22C55E', text: '#000000' },
    rejected: { bg: '#EF4444', text: '#FFFFFF' },
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #222222' }}>
            {['PR REF', 'EMPLOYEE', 'DEPT', 'GROSS', 'NET', 'MONTH', 'STATUS', ''].map(col => (
              <th
                key={col}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem',
                  color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase',
                  padding: '0.6rem 0.75rem',
                  textAlign: ['GROSS', 'NET'].includes(col) ? 'right' : 'left',
                  whiteSpace: 'nowrap', fontWeight: 600, background: '#0D0D0D',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr
              key={entry.id}
              data-testid={`payroll-workspace-row-${entry.id}`}
              style={{ borderBottom: '1px solid #1A1A1A', transition: 'background 100ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#1A1A1A' }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
            >
              <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#CC1F1F', whiteSpace: 'nowrap' }}>
                {entry.pr_ref}
              </td>
              <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.employee_name}
              </td>
              <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                {entry.department.toUpperCase()}
              </td>
              <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {Number(entry.gross_amount).toLocaleString('en', { minimumFractionDigits: 0 })}
              </td>
              <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#22C55E', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {Number(entry.net_amount).toLocaleString('en', { minimumFractionDigits: 0 })}
              </td>
              <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                {entry.payment_month?.slice(0, 7)}
              </td>
              <td style={{ padding: '0.65rem 0.75rem' }}>
                <span style={{
                  background: STATUS_COLORS[entry.status]?.bg ?? '#444',
                  color: STATUS_COLORS[entry.status]?.text ?? '#fff',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem',
                  letterSpacing: '0.1em', padding: '0.15rem 0.45rem',
                  display: 'inline-block', textTransform: 'uppercase', fontWeight: 700,
                }}>
                  {entry.status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '0.65rem 0.75rem' }}>
                {entry.status === 'pending' && (
                  <button
                    data-testid={`payroll-delete-btn-${entry.id}`}
                    onClick={() => onDelete(entry)}
                    disabled={deletingId === entry.id}
                    style={{
                      background: 'transparent', border: '1px solid #CC1F1F', color: '#CC1F1F',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '0.2rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {deletingId === entry.id ? '…' : 'DELETE'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

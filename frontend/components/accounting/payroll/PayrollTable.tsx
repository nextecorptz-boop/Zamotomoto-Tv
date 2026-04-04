'use client'

import { useState, useMemo } from 'react'
import type { PayrollEntry } from '@/types'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#F59E0B', text: '#000000' },
  approved: { bg: '#8B5CF6', text: '#FFFFFF' },
  paid:     { bg: '#22C55E', text: '#000000' },
  rejected: { bg: '#EF4444', text: '#FFFFFF' },
}

interface PayrollTableProps {
  entries: PayrollEntry[]
  onSelectEntry?: (entry: PayrollEntry) => void
  showReviewButton?: boolean
}

const selectStyle: React.CSSProperties = {
  background: '#1A1A1A',
  border: '1px solid #2A2A2A',
  color: '#888888',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.62rem',
  padding: '0.35rem 0.5rem',
  outline: 'none',
  letterSpacing: '0.05em',
}

export function PayrollTable({ entries, onSelectEntry, showReviewButton = false }: PayrollTableProps) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDept, setFilterDept]     = useState('all')

  const departments = useMemo(() => [...new Set(entries.map(e => e.department))].sort(), [entries])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      if (filterDept !== 'all' && e.department !== filterDept) return false
      return true
    })
  }, [entries, filterStatus, filterDept])

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
          marginBottom: '1rem', padding: '0.75rem',
          background: '#111111', border: '1px solid #1A1A1A',
        }}
      >
        <select
          data-testid="payroll-filter-status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          data-testid="payroll-filter-dept"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>{d.toUpperCase()}</option>
          ))}
        </select>

        {(filterStatus !== 'all' || filterDept !== 'all') && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterDept('all') }}
            style={{ ...selectStyle, color: '#CC1F1F', borderColor: '#CC1F1F', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            CLEAR
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#555555' }}>
          {filtered.length} / {entries.length}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222222' }}>
              {['PR REF', 'EMPLOYEE', 'DEPARTMENT', 'ROLE', 'GROSS', 'DEDUCTIONS', 'NET', 'MONTH', 'STATUS', ''].map(col => (
                <th
                  key={col}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.55rem',
                    color: '#666666',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '0.6rem 0.75rem',
                    textAlign: ['GROSS', 'DEDUCTIONS', 'NET'].includes(col) ? 'right' : 'left',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    background: '#0D0D0D',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    padding: '2.5rem', textAlign: 'center',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444',
                  }}
                >
                  No payroll entries found
                </td>
              </tr>
            ) : (
              filtered.map(entry => (
                <tr
                  key={entry.id}
                  data-testid={`payroll-row-${entry.id}`}
                  onClick={() => !showReviewButton && onSelectEntry?.(entry)}
                  style={{
                    borderBottom: '1px solid #1A1A1A',
                    cursor: showReviewButton ? 'default' : 'pointer',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#1A1A1A' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#CC1F1F', whiteSpace: 'nowrap' }}>
                    {entry.pr_ref}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.employee_name}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                    {entry.department.toUpperCase()}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888' }}>
                    {entry.role_title || '—'}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {Number(entry.gross_amount).toLocaleString('en', { minimumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FF9500', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {Number(entry.deductions).toLocaleString('en', { minimumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#22C55E', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {Number(entry.net_amount).toLocaleString('en', { minimumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                    {entry.payment_month?.slice(0, 7)}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span
                      style={{
                        background: STATUS_COLORS[entry.status]?.bg ?? '#444',
                        color: STATUS_COLORS[entry.status]?.text ?? '#fff',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.56rem', letterSpacing: '0.1em',
                        padding: '0.15rem 0.45rem', display: 'inline-block',
                        textTransform: 'uppercase', fontWeight: 700,
                      }}
                    >
                      {entry.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    {showReviewButton && (
                      <button
                        data-testid={`payroll-review-btn-${entry.id}`}
                        onClick={e => { e.stopPropagation(); onSelectEntry?.(entry) }}
                        style={{
                          background: '#CC1F1F', border: 'none', color: '#FFFFFF',
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem',
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          padding: '0.3rem 0.65rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        REVIEW
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

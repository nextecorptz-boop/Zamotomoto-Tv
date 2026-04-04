'use client'
import { useState, useMemo } from 'react'
import type { AccountingEntry, AccountingCategory } from '@/types'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#F59E0B', text: '#000000' },
  approved: { bg: '#22C55E', text: '#000000' },
  rejected: { bg: '#EF4444', text: '#FFFFFF' },
}

const TYPE_COLORS: Record<string, string> = {
  debit:  '#FF2B2B',
  credit: '#22C55E',
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface EntryTableProps {
  entries: AccountingEntry[]
  categories: AccountingCategory[]
  onSelectEntry: (entry: AccountingEntry) => void
  showReviewButton?: boolean
}

export function EntryTable({ entries, categories, onSelectEntry, showReviewButton = false }: EntryTableProps) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')
  const [filterCat, setFilterCat]       = useState('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      if (filterType !== 'all' && e.entry_type !== filterType) return false
      if (filterCat !== 'all' && e.category_id !== filterCat) return false
      if (dateFrom && e.entry_date < dateFrom) return false
      if (dateTo && e.entry_date > dateTo) return false
      return true
    })
  }, [entries, filterStatus, filterType, filterCat, dateFrom, dateTo])

  const selectStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', padding: '0.35rem 0.5rem',
    outline: 'none', letterSpacing: '0.05em',
  }
  const toggleBtn = (label: string, active: boolean, onClick: () => void, activeColor = '#CC1F1F') => (
    <button
      onClick={onClick}
      style={{
        background: active ? activeColor : '#1A1A1A',
        border: `1px solid ${active ? activeColor : '#2A2A2A'}`,
        color: active ? '#FFFFFF' : '#888888',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem',
        letterSpacing: '0.08em', padding: '0.3rem 0.65rem', cursor: 'pointer',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
          marginBottom: '1rem', padding: '0.75rem', background: '#111111', border: '1px solid #1A1A1A',
        }}
      >
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle} data-testid="filter-status">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <div style={{ display: 'flex' }}>
          {toggleBtn('All', filterType === 'all', () => setFilterType('all'), '#444444')}
          {toggleBtn('Debit', filterType === 'debit', () => setFilterType('debit'), '#CC1F1F')}
          {toggleBtn('Credit', filterType === 'credit', () => setFilterType('credit'), '#22C55E')}
        </div>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle} data-testid="filter-category">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...selectStyle, colorScheme: 'dark', width: '130px' }} placeholder="From"
            data-testid="filter-date-from" />
          <span style={{ color: '#555', fontSize: '0.65rem', fontFamily: 'monospace' }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ ...selectStyle, colorScheme: 'dark', width: '130px' }} placeholder="To"
            data-testid="filter-date-to" />
        </div>

        {(filterStatus !== 'all' || filterType !== 'all' || filterCat !== 'all' || dateFrom || dateTo) && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterCat('all'); setDateFrom(''); setDateTo('') }}
            style={{ ...selectStyle, color: '#CC1F1F', borderColor: '#CC1F1F', cursor: 'pointer' }}
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
              {['REF CODE', 'TITLE', 'CATEGORY', 'TYPE', 'AMOUNT', 'SUBMITTED BY', 'DATE', 'STATUS', ''].map(col => (
                <th key={col} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem',
                  color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase',
                  padding: '0.6rem 0.75rem', textAlign: col === 'AMOUNT' ? 'right' : 'left',
                  whiteSpace: 'nowrap', fontWeight: 600, background: '#0D0D0D',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>
                  No entries found
                </td>
              </tr>
            ) : filtered.map(entry => (
              <tr
                key={entry.id}
                data-testid={`entry-row-${entry.id}`}
                onClick={() => !showReviewButton && onSelectEntry(entry)}
                style={{
                  borderBottom: '1px solid #1A1A1A',
                  cursor: showReviewButton ? 'default' : 'pointer',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#1A1A1A' }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#CC1F1F', whiteSpace: 'nowrap' }}>
                  {entry.reference_code}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.title}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                  {entry.category?.name ?? '—'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: TYPE_COLORS[entry.entry_type], fontWeight: 600 }}>
                  {entry.entry_type.toUpperCase()}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatAmount(entry.amount, entry.currency)}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                  {entry.submitter?.full_name ?? '—'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                  {entry.entry_date}
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <span style={{
                    background: STATUS_COLORS[entry.status].bg,
                    color: STATUS_COLORS[entry.status].text,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.56rem', letterSpacing: '0.1em',
                    padding: '0.15rem 0.45rem', display: 'inline-block',
                    textTransform: 'uppercase', fontWeight: 700,
                  }}>
                    {entry.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  {showReviewButton && (
                    <button
                      data-testid={`review-btn-${entry.id}`}
                      onClick={e => { e.stopPropagation(); onSelectEntry(entry) }}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

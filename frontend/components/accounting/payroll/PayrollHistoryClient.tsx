'use client'

import { useRouter } from 'next/navigation'

interface HistoryEntry {
  id: string
  period_label: string
  status: string
  opened_at: string
  closed_at: string | null
  total_paid: number
  headcount: number
}

interface Props {
  history: HistoryEntry[]
}

function fmtTZS(n: number) {
  return `TZS ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid:   { bg: '#22C55E', text: '#000000' },
  closed: { bg: '#444444', text: '#FFFFFF' },
}

export default function PayrollHistoryClient({ history }: Props) {
  const router = useRouter()

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/accounting/payroll" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', letterSpacing: '0.08em', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>← PAYROLL DASHBOARD</a>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>PAYROLL HISTORY</h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          {history.length} completed payroll month(s)
        </p>
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444', border: '1px dashed #2A2A2A' }}>
          No completed payroll months yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222222' }}>
                {['PERIOD', 'STATUS', 'EMPLOYEES', 'TOTAL PAID', 'OPENED', 'CLOSED', ''].map(col => (
                  <th key={col} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#666666', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.6rem 0.75rem', textAlign: col === 'TOTAL PAID' ? 'right' : 'left', background: '#0D0D0D', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(entry => {
                const sc = STATUS_COLORS[entry.status] ?? { bg: '#444', text: '#fff' }
                return (
                  <tr key={entry.id} data-testid={`history-row-${entry.id}`}
                    style={{ borderBottom: '1px solid #1A1A1A', cursor: 'pointer', transition: 'background 100ms' }}
                    onClick={() => router.push(`/accounting/payroll/${entry.id}`)}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#1A1A1A' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600 }}>{entry.period_label}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{ background: sc.bg, color: sc.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', letterSpacing: '0.1em', padding: '0.15rem 0.45rem', textTransform: 'uppercase', fontWeight: 700 }}>{entry.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF' }}>{entry.headcount}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#22C55E', textAlign: 'right', fontWeight: 700 }}>{fmtTZS(entry.total_paid)}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                      {new Date(entry.opened_at).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', whiteSpace: 'nowrap' }}>
                      {entry.closed_at ? new Date(entry.closed_at).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VIEW →</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

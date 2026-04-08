'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

// NOTE: This form is part of the legacy payroll system.
// New payroll entries use the payroll batch workflow (/accounting/workspace/payroll).

interface CreatePayrollData {
  employee_name: string
  department: string
  role_title?: string
  gross_amount: number
  deductions?: number
  payment_month: string
  notes?: string
  employee_id?: string
}

interface PayrollFormProps {
  onSuccess?: () => void
}

const DEPARTMENTS = ['script', 'voice', 'editing', 'publishing', 'social_copy', 'management', 'administration']

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid #2A2A2A',
  color: '#FFFFFF',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.72rem',
  padding: '0.55rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.56rem',
  color: '#888888',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '0.3rem',
}

export function PayrollForm({ onSuccess }: PayrollFormProps) {
  const router = useRouter()
  const [employeeName, setEmployeeName] = useState('')
  const [department, setDepartment]     = useState('editing')
  const [roleTitle, setRoleTitle]       = useState('')
  const [grossAmount, setGrossAmount]   = useState('')
  const [deductions, setDeductions]     = useState('')
  const [paymentMonth, setPaymentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [notes, setNotes]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const gross = parseFloat(grossAmount) || 0
  const ded   = parseFloat(deductions) || 0
  const net   = gross - ded

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!employeeName.trim()) { setError('Employee name is required'); return }
    if (isNaN(gross) || gross <= 0) { setError('Enter a valid gross amount'); return }
    if (ded < 0) { setError('Deductions cannot be negative'); return }

    setLoading(true)
    try {
      // Legacy entry creation is disabled. Show deprecation notice.
      setError('Legacy payroll entry creation is disabled. Use the new payroll batch workflow at /accounting/workspace/payroll')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Employee Name */}
      <div>
        <label style={labelStyle}>Employee Name *</label>
        <input
          data-testid="payroll-employee-name"
          type="text"
          value={employeeName}
          onChange={e => setEmployeeName(e.target.value)}
          placeholder="e.g. John Doe"
          style={inputStyle}
          required
        />
      </div>

      {/* Department + Role */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Department</label>
          <select
            data-testid="payroll-department"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            style={inputStyle}
          >
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d === 'social_copy' ? 'ENGAGEMENT' : d.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Role Title</label>
          <input
            data-testid="payroll-role-title"
            type="text"
            value={roleTitle}
            onChange={e => setRoleTitle(e.target.value)}
            placeholder="e.g. Senior Editor"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Gross + Deductions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Gross Amount (TZS) *</label>
          <input
            data-testid="payroll-gross-amount"
            type="text"
            inputMode="decimal"
            value={grossAmount}
            onChange={e => setGrossAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Deductions (TZS)</label>
          <input
            data-testid="payroll-deductions"
            type="text"
            inputMode="decimal"
            value={deductions}
            onChange={e => setDeductions(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Net (computed) */}
      <div>
        <label style={labelStyle}>Net Amount (auto-computed)</label>
        <div
          data-testid="payroll-net-amount"
          style={{
            background: '#0D0D0D', border: '1px solid #2A2A2A',
            color: net >= 0 ? '#22C55E' : '#EF4444',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', letterSpacing: '0.04em',
            padding: '0.55rem 0.75rem',
          }}
        >
          TZS {net.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Payment Month */}
      <div>
        <label style={labelStyle}>Payment Month</label>
        <input
          data-testid="payroll-payment-month"
          type="month"
          value={paymentMonth}
          onChange={e => setPaymentMonth(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          data-testid="payroll-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional notes…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', letterSpacing: '0.05em' }}>
          {error}
        </div>
      )}

      <button
        data-testid="payroll-submit-btn"
        type="submit"
        disabled={loading}
        style={{
          width: '100%', background: loading ? '#2A2A2A' : '#CC1F1F',
          border: 'none', color: '#FFFFFF',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.15em',
          padding: '0.65rem', cursor: loading ? 'wait' : 'pointer',
          marginTop: '0.25rem', transition: 'background 150ms',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#FF2B2B' }}
        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#CC1F1F' }}
      >
        {loading ? 'SUBMITTING…' : 'LOG PAYROLL'}
      </button>
    </form>
  )
}

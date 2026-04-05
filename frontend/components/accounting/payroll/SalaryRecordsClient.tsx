'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { EmployeeWithSalary } from '@/app/(dashboard)/accounting/payroll/salary-actions'
import { setSalaryRecord } from '@/app/(dashboard)/accounting/payroll/salary-actions'

interface Props {
  employees: EmployeeWithSalary[]
  isAdmin: boolean
  onSave?: () => void
}

const ROLE_COLORS: Record<string, string> = {
  worker_standard:  '#F59E0B',
  worker_isolated:  '#8B5CF6',
  accountant:       '#22C55E',
}

function fmtTZS(n: number) {
  return `TZS ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface SalaryFormState {
  grossSalary: string
  effectiveFrom: string
  notes: string
}

export default function SalaryRecordsClient({ employees, isAdmin, onSave }: Props) {
  const router = useRouter()
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<SalaryFormState>({ grossSalary: '', effectiveFrom: new Date().toISOString().slice(0, 10), notes: '' })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [toast, setToast]           = useState('')

  const missingCount  = employees.filter(e => e.salary === null).length
  const complete      = missingCount === 0

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const startEdit = useCallback((emp: EmployeeWithSalary) => {
    setEditingId(emp.id)
    setError(null)
    setForm({
      grossSalary:   emp.salary ? String(emp.salary.gross_salary) : '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      notes:         emp.salary?.notes ?? '',
    })
  }, [])

  const handleSave = useCallback(async (employeeId: string) => {
    setError(null)
    const gross = parseFloat(form.grossSalary)
    if (isNaN(gross) || gross <= 0) { setError('Enter a valid gross salary'); return }
    if (!form.effectiveFrom) { setError('Effective from date is required'); return }

    setLoading(true)
    try {
      const result = await setSalaryRecord(employeeId, gross, form.effectiveFrom, form.notes || undefined)
      if (!result.success) { setError('error' in result ? result.error : 'Save failed'); return }
      showToast('Salary record saved')
      setEditingId(null)
      router.refresh()
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }, [form, router, onSave])

  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
    padding: '0.45rem 0.65rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div>
      {toast && (
        <div data-testid="salary-records-toast" style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem', letterSpacing: '0.05em' }}>
          {toast}
        </div>
      )}

      {/* Completion status */}
      <div style={{ marginBottom: '1.25rem', background: complete ? '#0A1A0A' : '#1A0A00', border: `1px solid ${complete ? '#22C55E' : '#F59E0B'}`, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '8px', height: '8px', background: complete ? '#22C55E' : '#F59E0B' }} />
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: complete ? '#22C55E' : '#F59E0B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {complete ? 'SALARY RECORDS COMPLETE' : `${missingCount} EMPLOYEE(S) MISSING SALARY RECORDS`}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#888888', marginTop: '0.15rem' }}>
            {employees.length - missingCount} / {employees.length} employees have active salary records
            {!complete && isAdmin && ' — Payroll months cannot be opened until all records are set'}
          </div>
        </div>
      </div>

      {employees.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#444444' }}>
          No payroll-eligible employees found (worker_standard, worker_isolated, accountant)
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {employees.map(emp => (
            <div
              key={emp.id}
              data-testid={`salary-record-row-${emp.id}`}
              style={{
                background: editingId === emp.id ? '#161616' : '#111111',
                border: `1px solid ${editingId === emp.id ? '#CC1F1F' : emp.salary ? '#1A1A1A' : '#3A2000'}`,
                padding: '0.85rem 1.25rem',
              }}
            >
              {/* Employee header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingId === emp.id ? '0.75rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <span style={{
                    background: ROLE_COLORS[emp.role] ?? '#888888', color: '#000',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.1em',
                    padding: '0.15rem 0.4rem', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {emp.role.replace('_', ' ')}
                  </span>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF' }}>{emp.full_name}</div>
                    {emp.department && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#666666', letterSpacing: '0.05em' }}>{emp.department.toUpperCase()}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {emp.salary ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', color: '#22C55E' }}>{fmtTZS(emp.salary.gross_salary)}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#666666' }}>since {emp.salary.effective_from}</div>
                    </div>
                  ) : (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>NO SALARY SET</span>
                  )}

                  {isAdmin && (
                    editingId === emp.id ? (
                      <button data-testid={`salary-cancel-btn-${emp.id}`} onClick={() => setEditingId(null)}
                        style={{ background: 'transparent', border: '1px solid #444', color: '#888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.08em', padding: '0.3rem 0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                        CANCEL
                      </button>
                    ) : (
                      <button data-testid={`salary-edit-btn-${emp.id}`} onClick={() => startEdit(emp)}
                        style={{ background: emp.salary ? 'transparent' : '#CC1F1F', border: `1px solid ${emp.salary ? '#2A2A2A' : '#CC1F1F'}`, color: emp.salary ? '#888888' : '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.08em', padding: '0.3rem 0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                        {emp.salary ? 'UPDATE' : 'SET SALARY'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === emp.id && isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid #2A2A2A' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Gross Salary (TZS) *</div>
                      <input data-testid={`salary-gross-input-${emp.id}`} type="text" inputMode="decimal" value={form.grossSalary}
                        onChange={e => setForm(f => ({ ...f, grossSalary: e.target.value }))} placeholder="e.g. 2500000" style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Effective From *</div>
                      <input data-testid={`salary-date-input-${emp.id}`} type="date" value={form.effectiveFrom}
                        onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.52rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Notes</div>
                      <input data-testid={`salary-notes-input-${emp.id}`} type="text" value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" style={inputStyle} />
                    </div>
                  </div>

                  {error && editingId === emp.id && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#CC1F1F' }}>{error}</div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button data-testid={`salary-save-btn-${emp.id}`} disabled={loading} onClick={() => handleSave(emp.id)}
                      style={{ background: loading ? '#2A2A2A' : '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em', padding: '0.4rem 1.25rem', cursor: loading ? 'wait' : 'pointer' }}>
                      {loading ? 'SAVING…' : 'SAVE SALARY'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

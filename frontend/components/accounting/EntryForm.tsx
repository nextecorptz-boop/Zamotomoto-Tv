'use client'
import { useState, useRef, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AccountingCategory } from '@/types'
import { createAccountingEntry, recordAccountingDocument } from '@/app/(dashboard)/accounting/actions'
import { DocumentUploader } from './DocumentUploader'

interface EntryFormProps {
  categories: AccountingCategory[]
  onSuccess: (entryId: string) => void
}

const CURRENCIES = ['TZS', 'USD', 'EUR', 'KES', 'GBP']

function groupCategories(cats: AccountingCategory[]) {
  return cats.reduce<Record<string, AccountingCategory[]>>((acc, c) => {
    const key = c.type.toUpperCase().replace('_', ' ')
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
}

export function EntryForm({ categories, onSuccess }: EntryFormProps) {
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit')
  const [currency, setCurrency] = useState('TZS')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const grouped = groupCategories(categories)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
    color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
    padding: '0.55rem 0.75rem', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#888888',
    letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem',
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const numAmount = parseFloat(amount.replace(/,/g, ''))
    if (!title.trim()) { setError('Title is required'); return }
    if (isNaN(numAmount) || numAmount <= 0) { setError('Enter a valid amount'); return }

    setLoading(true)
    try {
      const result = await createAccountingEntry({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: numAmount,
        currency,
        category_id: categoryId || undefined,
        entry_type: entryType,
        entry_date: entryDate,
      })

      if (!result.success) { setError('error' in result ? result.error : 'Submission failed'); return }

      // Upload file if selected
      if (file) {
        const supabase = createClient()
        const storageKey = `${result.entry_id}/${Date.now()}_${file.name}`
        const { error: uploadErr } = await supabase.storage.from('accounting-docs').upload(storageKey, file)
        if (!uploadErr) {
          await recordAccountingDocument({
            entry_id:        result.entry_id,
            file_name:       file.name,
            storage_key:     storageKey,
            mime_type:       file.type,
            file_size_bytes: file.size,
          })
        }
      }

      // Reset form
      setTitle(''); setDescription(''); setAmount(''); setCategoryId('')
      setEntryType('debit'); setCurrency('TZS'); setFile(null)
      setEntryDate(new Date().toISOString().slice(0, 10))
      onSuccess(result.entry_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {/* Entry type toggle */}
      <div>
        <label style={labelStyle}>Entry Type</label>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['debit', 'credit'] as const).map(t => (
            <button
              key={t}
              type="button"
              data-testid={`entry-type-${t}`}
              onClick={() => setEntryType(t)}
              style={{
                flex: 1, padding: '0.5rem',
                background: entryType === t ? (t === 'debit' ? '#CC1F1F' : '#22C55E') : '#1A1A1A',
                border: `1px solid ${entryType === t ? (t === 'debit' ? '#CC1F1F' : '#22C55E') : '#2A2A2A'}`,
                color: '#FFFFFF',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.9rem',
                letterSpacing: '0.12em',
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelStyle}>Title *</label>
        <input
          data-testid="entry-title-input"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Monthly staff salaries"
          style={inputStyle}
          required
        />
      </div>

      {/* Amount + Currency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Amount *</label>
          <input
            data-testid="entry-amount-input"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select
            data-testid="entry-currency-select"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{ ...inputStyle, width: 'auto' }}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <label style={labelStyle}>Category</label>
        <select
          data-testid="entry-category-select"
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          style={inputStyle}
        >
          <option value="">— Select category —</option>
          {Object.entries(grouped).map(([group, cats]) => (
            <optgroup key={group} label={group}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Entry date */}
      <div>
        <label style={labelStyle}>Entry Date</label>
        <input
          data-testid="entry-date-input"
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          data-testid="entry-description-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Additional notes or details…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* File attachment */}
      <div>
        <label style={labelStyle}>Attach Document (optional)</label>
        <DocumentUploader onFileSelect={setFile} currentFile={file} />
      </div>

      {error && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#CC1F1F', letterSpacing: '0.05em' }}>
          {error}
        </div>
      )}

      <button
        data-testid="log-entry-submit-btn"
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          background: loading ? '#2A2A2A' : '#CC1F1F',
          border: 'none', color: '#FFFFFF',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.15em',
          padding: '0.65rem', cursor: loading ? 'wait' : 'pointer',
          marginTop: '0.25rem', transition: 'background 150ms',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#FF2B2B' }}
        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#CC1F1F' }}
      >
        {loading ? 'SUBMITTING…' : 'LOG ENTRY'}
      </button>
    </form>
  )
}

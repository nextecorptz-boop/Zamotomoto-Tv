'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountingEntry, AccountingCategory, AccountingSummary, AccountingDocument } from '@/types'
import { SummaryCard } from './SummaryCard'
import { EntryTable } from './EntryTable'
import { EntryDetailModal } from './EntryDetailModal'
import { reviewAccountingEntry, getAccountingDocuments } from '@/app/(dashboard)/accounting/actions'

interface Props {
  entries: AccountingEntry[]
  summary: AccountingSummary
  categories: AccountingCategory[]
}

function fmtCurrency(n: number) {
  return `TZS ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getCurrentMonthYear() {
  return new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' }).toUpperCase()
}

export function AdminAccountingClient({ entries, summary, categories }: Props) {
  const router = useRouter()
  const [selectedEntry, setSelectedEntry]   = useState<AccountingEntry | null>(null)
  const [documents, setDocuments]           = useState<AccountingDocument[]>([])
  const [docsLoading, setDocsLoading]       = useState(false)
  const [toast, setToast]                   = useState('')
  // Optimistic status tracking
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({})

  const handleSelectEntry = useCallback(async (entry: AccountingEntry) => {
    setSelectedEntry(entry)
    setDocuments([])
    setDocsLoading(true)
    const docs = await getAccountingDocuments(entry.id)
    setDocuments(docs)
    setDocsLoading(false)
  }, [])

  const handleReview = useCallback(async (decision: 'approved' | 'rejected', note: string) => {
    if (!selectedEntry) return
    const result = await reviewAccountingEntry(selectedEntry.id, decision, note)
    if (!result.success) { alert('error' in result ? result.error : 'Review failed'); return }
    // Optimistic update
    setOptimisticStatus(prev => ({ ...prev, [selectedEntry.id]: decision }))
    setToast(`Entry ${selectedEntry.reference_code} ${decision}`)
    setTimeout(() => setToast(''), 3000)
    setSelectedEntry(null)
    router.refresh()
  }, [selectedEntry, router])

  const displayedEntries = entries.map(e => ({
    ...e,
    status: (optimisticStatus[e.id] as AccountingEntry['status']) ?? e.status,
  }))

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998,
          background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.68rem', padding: '0.55rem 1rem', letterSpacing: '0.05em',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
          ACCOUNTING DASHBOARD
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          Financial Overview — {getCurrentMonthYear()}
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <SummaryCard
          label="Total Expenses (MTD)"
          value={fmtCurrency(summary.total_expenses)}
          subtext="Approved debits this month"
          accentColor="#CC1F1F"
        />
        <SummaryCard
          label="Total Credits (MTD)"
          value={fmtCurrency(summary.total_credits)}
          subtext="Approved credits this month"
          accentColor="#22C55E"
        />
        <SummaryCard
          label="Pending Review"
          value={String(summary.pending_count)}
          subtext={summary.pending_count > 0 ? `${summary.pending_count} awaiting approval` : 'All clear'}
          accentColor="#F59E0B"
        />
        <SummaryCard
          label="Total Assets"
          value={fmtCurrency(summary.total_assets)}
          subtext="Approved asset entries (all time)"
          accentColor="#8B5CF6"
        />
      </div>

      {/* Section heading */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
          ALL ENTRIES
        </h2>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.08em' }}>
          {entries.length} total
        </span>
      </div>

      <EntryTable
        entries={displayedEntries}
        categories={categories}
        onSelectEntry={handleSelectEntry}
        showReviewButton
      />

      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          documents={documents}
          isLoading={docsLoading}
          onClose={() => setSelectedEntry(null)}
          onReview={handleReview}
          isAdmin
        />
      )}
    </div>
  )
}

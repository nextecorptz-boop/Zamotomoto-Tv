'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountingEntry, AccountingCategory, AccountingDocument } from '@/types'
import { EntryForm } from './EntryForm'
import { EntryTable } from './EntryTable'
import { EntryDetailModal } from './EntryDetailModal'
import { getAccountingDocuments } from '@/app/(dashboard)/accounting/actions'

interface Props {
  entries: AccountingEntry[]
  categories: AccountingCategory[]
}

export function AccountantWorkspaceClient({ entries: initialEntries, categories }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<AccountingEntry[]>(initialEntries)
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null)
  const [documents, setDocuments]         = useState<AccountingDocument[]>([])
  const [docsLoading, setDocsLoading]     = useState(false)
  const [toast, setToast]                 = useState('')

  // Sync on server re-render
  useEffect(() => { setEntries(initialEntries) }, [initialEntries])

  const handleSelectEntry = useCallback(async (entry: AccountingEntry) => {
    setSelectedEntry(entry)
    setDocuments([])
    setDocsLoading(true)
    const docs = await getAccountingDocuments(entry.id)
    setDocuments(docs)
    setDocsLoading(false)
  }, [])

  const handleEntrySuccess = useCallback((entryId: string) => {
    setToast(`Entry logged! Refreshing…`)
    setTimeout(() => setToast(''), 3000)
    router.refresh()
  }, [router])

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
          ACCOUNTING WORKSPACE
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#888888', marginTop: '0.35rem', letterSpacing: '0.08em' }}>
          Log financial entries and track submissions
        </p>
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Form */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #2A2A2A', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
              LOG NEW ENTRY
            </h2>
          </div>
          <EntryForm categories={categories} onSuccess={handleEntrySuccess} />
        </div>

        {/* Right: Entry records */}
        <div>
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #2A2A2A', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: 0 }}>
              ENTRY RECORDS
            </h2>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.08em' }}>
              {entries.length}
            </span>
          </div>
          <EntryTable
            entries={entries}
            categories={categories}
            onSelectEntry={handleSelectEntry}
            showReviewButton={false}
          />
        </div>
      </div>

      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          documents={documents}
          isLoading={docsLoading}
          onClose={() => setSelectedEntry(null)}
          isAdmin={false}
        />
      )}
    </div>
  )
}

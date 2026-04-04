'use client'
import { useState } from 'react'
import type { AccountingDocument } from '@/types'

interface DocumentListProps {
  documents: AccountingDocument[]
  getSignedUrl: (key: string) => Promise<string | null>
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function DocumentList({ documents, getSignedUrl }: DocumentListProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleDownload(doc: AccountingDocument) {
    setDownloading(doc.id)
    try {
      const url = await getSignedUrl(doc.storage_key)
      if (url) window.open(url, '_blank', 'noopener')
      else alert('Could not generate download link')
    } catch {
      alert('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#555555', padding: '1rem 0', textAlign: 'center', letterSpacing: '0.05em' }}>
        No documents attached
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {documents.map(doc => (
        <div
          key={doc.id}
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            padding: '0.55rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.file_name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: '#666666', marginTop: '0.1rem', letterSpacing: '0.04em' }}>
              {formatBytes(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}
            </div>
          </div>
          <button
            data-testid={`download-doc-${doc.id}`}
            onClick={() => handleDownload(doc)}
            disabled={downloading === doc.id}
            style={{
              background: 'transparent',
              border: '1px solid #CC1F1F',
              color: '#CC1F1F',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0.25rem 0.6rem',
              cursor: downloading === doc.id ? 'wait' : 'pointer',
              flexShrink: 0,
              opacity: downloading === doc.id ? 0.6 : 1,
            }}
          >
            {downloading === doc.id ? '...' : 'DL'}
          </button>
        </div>
      ))}
    </div>
  )
}

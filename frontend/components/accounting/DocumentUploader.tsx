'use client'
import { useRef, useState } from 'react'

interface DocumentUploaderProps {
  onFileSelect: (file: File) => void
  currentFile: File | null
}

const ACCEPTED = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/png']
const ACCEPT_STRING = '.pdf,.xls,.xlsx,.csv,.jpg,.jpeg,.png'
const MAX_SIZE = 52428800

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function DocumentUploader({ onFileSelect, currentFile }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) return 'Unsupported file type'
    if (file.size > MAX_SIZE) return 'File exceeds 50 MB limit'
    return null
  }

  function handleFile(file: File) {
    const err = validate(file)
    if (err) { setError(err); return }
    setError(null)
    onFileSelect(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      {!currentFile ? (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1px dashed ${isDragging ? '#CC1F1F' : '#3A3A3A'}`,
            background: isDragging ? 'rgba(204,31,31,0.05)' : '#1A1A1A',
            padding: '1.5rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', letterSpacing: '0.05em' }}>
            DRAG & DROP or CLICK TO ATTACH
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#555555', marginTop: '0.4rem', letterSpacing: '0.05em' }}>
            PDF · XLS · XLSX · CSV · JPG · PNG — max 50MB
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_STRING}
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      ) : (
        <div
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
              {currentFile.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#888888', marginTop: '0.15rem' }}>
              {formatBytes(currentFile.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onFileSelect(null as unknown as File); setError(null) }}
            style={{ background: 'transparent', border: 'none', color: '#CC1F1F', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.4rem' }}
          >
            REMOVE
          </button>
        </div>
      )}
      {error && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', marginTop: '0.35rem', letterSpacing: '0.05em' }}>
          {error}
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitEngagementProof } from '@/app/actions/engagement'
import type { EngagementActionError } from '@/app/actions/engagement'
import type { EngagementCategory } from '@/types/engagement'

interface Props {
  categories: EngagementCategory[]
  dailyTarget: number
  todaySubmitted: number
}

export function SubmitProofForm({ categories, dailyTarget, todaySubmitted }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<EngagementActionError['errorType'] | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const progressPct = Math.min(100, (todaySubmitted / Math.max(1, dailyTarget)) * 100)
  const remaining = Math.max(0, dailyTarget - todaySubmitted)

  const handleFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
    if (!allowed.includes(file.type)) {
      setError('Only images (JPG, PNG, WebP, GIF) or MP4 videos accepted')
      return
    }
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB)'); return }
    setFileName(file.name)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileRef.current) fileRef.current.files = dt.files
      handleFile(file)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setErrorType(null)
    if (!selectedCategory) { setError('Select a category'); return }
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Attach a proof file'); return }

    const fd = new FormData()
    fd.append('category_id', selectedCategory)
    fd.append('proof_file', file)

    startTransition(async () => {
      const result = await submitEngagementProof(fd)
      if (!result.success) {
        const err = result as EngagementActionError
        setErrorType(err.errorType)
        setError(err.error)
        return
      }
      setSuccess(true)
      setSelectedCategory('')
      setFileName(null)
      if (fileRef.current) fileRef.current.value = ''
      setTimeout(() => { setSuccess(false); router.refresh() }, 2000)
    })
  }

  return (
    <div data-testid="submit-proof-form" style={{ maxWidth: '680px' }}>
      {/* Daily progress */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Today's Progress</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: progressPct >= 100 ? '#22C55E' : '#FFFFFF' }}>
            {todaySubmitted} / {dailyTarget}
          </span>
        </div>
        <div style={{ background: '#1A1A1A', height: '6px', width: '100%' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct >= 100 ? '#22C55E' : '#CC1F1F', transition: 'width 400ms ease' }} />
        </div>
        {remaining > 0 ? (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#555555', marginTop: '0.4rem' }}>
            {remaining} more to reach daily target
          </div>
        ) : (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#22C55E', marginTop: '0.4rem' }}>
            Daily target reached!
          </div>
        )}
      </div>

      {success && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22C55E', color: '#22C55E', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          Proof submitted successfully. Pending review.
        </div>
      )}
      {error && (
        <div style={{
          background: errorType === 'permission_error' ? 'rgba(239,68,68,0.12)' : errorType === 'upload_error' ? 'rgba(245,158,11,0.1)' : 'rgba(204,31,31,0.1)',
          border: `1px solid ${errorType === 'permission_error' ? '#EF4444' : errorType === 'upload_error' ? '#F59E0B' : '#CC1F1F'}`,
          color: errorType === 'permission_error' ? '#EF4444' : errorType === 'upload_error' ? '#F59E0B' : '#CC1F1F',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.65rem 1rem', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Category select */}
        <div>
          <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Engagement Type *
          </label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            data-testid="category-select"
            required
            style={{ width: '100%', background: '#111111', border: `1px solid ${selectedCategory ? '#CC1F1F' : '#2A2A2A'}`, color: selectedCategory ? '#FFFFFF' : '#555555', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.65rem 0.85rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">— Select Category —</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {categories.length === 0 && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#555555', marginTop: '0.3rem' }}>
              No active categories. Contact admin.
            </div>
          )}
        </div>

        {/* File upload */}
        <div>
          <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Proof Screenshot / File *
          </label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            data-testid="file-drop-zone"
            style={{ border: `2px dashed ${dragOver ? '#CC1F1F' : fileName ? '#22C55E' : '#2A2A2A'}`, background: dragOver ? 'rgba(204,31,31,0.05)' : '#0E0E0E', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 150ms' }}
          >
            {fileName ? (
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#22C55E' }}>{fileName}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#555555', marginTop: '0.3rem' }}>Click to change</div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#444444', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>DROP FILE HERE</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#444444' }}>or click to browse — JPG, PNG, WebP, GIF, MP4 (max 10MB)</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} data-testid="file-input" />
        </div>

        <button
          type="submit"
          disabled={isPending || categories.length === 0}
          data-testid="submit-proof-button"
          style={{ background: isPending ? '#2A2A2A' : '#CC1F1F', border: 'none', color: isPending ? '#555555' : '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.85rem 2rem', cursor: isPending || categories.length === 0 ? 'not-allowed' : 'pointer', transition: 'background 150ms', alignSelf: 'flex-start' }}
        >
          {isPending ? 'SUBMITTING...' : 'SUBMIT PROOF'}
        </button>
      </form>
    </div>
  )
}

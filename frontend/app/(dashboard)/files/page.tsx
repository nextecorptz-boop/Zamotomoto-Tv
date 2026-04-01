'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBytes, formatDate } from '@/lib/utils'
import type { TaskFile } from '@/types'

const TYPE_COLORS: Record<string, string> = {
  'video/mp4': '#CC1F1F',
  'video/': '#CC1F1F',
  'audio/': '#F59E0B',
  'audio/mpeg': '#F59E0B',
  'application/pdf': '#8B5CF6',
  'image/': '#22C55E',
  'application/zip': '#888888',
  'application/octet-stream': '#888888',
}

function getTypeColor(mime: string): string {
  for (const [prefix, color] of Object.entries(TYPE_COLORS)) {
    if (mime.startsWith(prefix)) return color
  }
  return '#888888'
}

function getTypeLabel(mime: string, provider: string): string {
  if (provider === 'google_drive') return 'DRIVE'
  if (mime.startsWith('video/')) return 'VIDEO'
  if (mime.startsWith('audio/')) return 'AUDIO'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime === 'application/zip') return 'ZIP'
  return 'FILE'
}

export default function FilesPage() {
  const [files, setFiles] = useState<(TaskFile & { task_ref?: string; task_title?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('task_files')
        .select('*, tasks(task_ref, title)')
        .order('created_at', { ascending: false })

      setFiles((data || []).map((f: Record<string, unknown>) => ({
        ...(f as unknown as TaskFile),
        task_ref: (f.tasks as { task_ref?: string })?.task_ref,
        task_title: (f.tasks as { title?: string })?.title,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = files.filter(f => {
    const matchType = filterType === 'all'
      || (filterType === 'video' && f.mime_type.startsWith('video/'))
      || (filterType === 'audio' && f.mime_type.startsWith('audio/'))
      || (filterType === 'pdf' && f.mime_type === 'application/pdf')
      || (filterType === 'drive' && f.provider === 'google_drive')
    const matchSearch = !search || f.file_name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Media Library</h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>{files.length} assets</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {['all', 'video', 'audio', 'pdf', 'drive'].map(type => (
          <button
            key={type}
            data-testid={`filter-${type}`}
            onClick={() => setFilterType(type)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.35rem 0.75rem', cursor: 'pointer', transition: 'all 150ms',
              background: filterType === type ? '#CC1F1F' : 'transparent',
              border: `1px solid ${filterType === type ? '#CC1F1F' : '#2A2A2A'}`,
              color: filterType === type ? '#FFFFFF' : '#888888',
            }}
          >
            {type}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', padding: '0.35rem 0.75rem', width: '220px', outline: 'none' }}
        />
      </div>

      {/* File Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#2A2A2A' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: '140px' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: '#2A2A2A' }}>
          {filtered.map(file => {
            const typeColor = getTypeColor(file.mime_type)
            const typeLabel = getTypeLabel(file.mime_type, file.provider)
            return (
              <a
                key={file.id}
                href={file.storage_key}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`file-card-${file.id}`}
                className="card-tilt"
                style={{ background: '#111111', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textDecoration: 'none', cursor: 'pointer', transition: 'border-color 150ms', border: '1px solid transparent' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = typeColor}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'transparent'}
              >
                {/* Type indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: typeColor, letterSpacing: '0.1em', lineHeight: 1 }}>
                    {typeLabel === 'VIDEO' ? '▶' : typeLabel === 'AUDIO' ? '♪' : typeLabel === 'PDF' ? '¶' : typeLabel === 'DRIVE' ? '⎗' : '◈'}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', color: typeColor, border: `1px solid ${typeColor}`, padding: '0.1rem 0.4rem', textTransform: 'uppercase' }}>
                    {typeLabel}
                  </span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.file_name}
                </div>
                {file.task_ref && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F' }}>{file.task_ref}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666' }}>
                  <span>{file.file_size_bytes > 0 ? formatBytes(file.file_size_bytes) : 'Drive link'}</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </a>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#444444' }}>
              No files found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

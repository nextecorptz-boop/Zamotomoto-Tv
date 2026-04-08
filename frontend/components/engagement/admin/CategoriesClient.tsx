'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEngagementCategory,
  updateEngagementCategory,
} from '@/app/actions/engagement'
import type { EngagementCategory } from '@/types/engagement'

interface Props {
  categories: EngagementCategory[]
}

export function CategoriesClient({ categories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<EngagementCategory | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const openCreate = () => {
    setEditTarget(null); setName(''); setError(null); setShowModal(true)
  }

  const openEdit = (cat: EngagementCategory) => {
    setEditTarget(cat); setName(cat.name); setError(null); setShowModal(true)
  }

  const handleToggle = (cat: EngagementCategory) => {
    startTransition(async () => {
      const result = await updateEngagementCategory(cat.id, { is_active: !cat.is_active })
      if (!result.success) { showToast('error' in result ? result.error : 'Update failed'); return }
      showToast(`Category ${cat.is_active ? 'deactivated' : 'activated'}`)
      router.refresh()
    })
  }

  const handleSave = () => {
    setError(null)
    if (!name.trim()) { setError('Name is required'); return }

    startTransition(async () => {
      if (editTarget) {
        const result = await updateEngagementCategory(editTarget.id, { name: name.trim() })
        if (!result.success) { setError('error' in result ? result.error : 'Update failed'); return }
        showToast('Category updated')
      } else {
        const result = await createEngagementCategory(name.trim())
        if (!result.success) { setError('error' in result ? result.error : 'Create failed'); return }
        showToast('Category created')
      }
      setShowModal(false)
      router.refresh()
    })
  }

  return (
    <div data-testid="categories-client">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9998, background: '#22C55E', color: '#000', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', padding: '0.55rem 1rem' }}>
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', letterSpacing: '0.1em' }}>
          {categories.length} CATEGORIES — {categories.filter(c => c.is_active).length} ACTIVE
        </span>
        <button
          onClick={openCreate}
          data-testid="create-category-btn"
          style={{ background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.15em', padding: '0.5rem 1.25rem', cursor: 'pointer' }}
        >
          + NEW CATEGORY
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', borderBottom: '1px solid #2A2A2A' }}>
          {['NAME', 'STATUS', 'ACTIONS'].map(col => (
            <div key={col} style={{ padding: '0.6rem 1rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#555555', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{col}</div>
          ))}
        </div>

        {categories.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#444444' }}>
            No categories yet. Create one above.
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div
              key={cat.id}
              data-testid={`category-row-${cat.id}`}
              style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', borderBottom: idx < categories.length - 1 ? '1px solid #1A1A1A' : 'none', opacity: cat.is_active ? 1 : 0.55 }}
            >
              <div style={{ padding: '0.75rem 1rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF', display: 'flex', alignItems: 'center' }}>
                {cat.name}
              </div>
              <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', color: cat.is_active ? '#22C55E' : '#555555', background: cat.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(85,85,85,0.1)', border: `1px solid ${cat.is_active ? '#22C55E' : '#333333'}`, padding: '0.15rem 0.5rem' }}>
                  {cat.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => openEdit(cat)} data-testid={`edit-category-${cat.id}`} style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                  EDIT
                </button>
                <button onClick={() => handleToggle(cat)} disabled={isPending} data-testid={`toggle-category-${cat.id}`} style={{ background: cat.is_active ? 'rgba(204,31,31,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${cat.is_active ? '#CC1F1F' : '#22C55E'}`, color: cat.is_active ? '#CC1F1F' : '#22C55E', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', padding: '0.25rem 0.5rem', cursor: isPending ? 'wait' : 'pointer' }}>
                  {cat.is_active ? 'DISABLE' : 'ENABLE'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget && !isPending) setShowModal(false) }}
        >
          <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '1.75rem', width: '100%', maxWidth: '380px' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 1.25rem' }}>
              {editTarget ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
            </h2>

            {error && (
              <div style={{ background: 'rgba(204,31,31,0.1)', border: '1px solid #CC1F1F', color: '#CC1F1F', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.6rem 0.85rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Category Name *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                data-testid="category-name-input"
                placeholder="e.g. ATTACK, DEFEND, EDUCATE"
                style={{ width: '100%', background: '#0E0E0E', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', padding: '0.6rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleSave} disabled={isPending} data-testid="save-category-btn" style={{ flex: 1, background: isPending ? '#2A2A2A' : '#CC1F1F', border: 'none', color: isPending ? '#555' : '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em', padding: '0.7rem', cursor: isPending ? 'not-allowed' : 'pointer' }}>
                {isPending ? 'SAVING...' : editTarget ? 'SAVE' : 'CREATE'}
              </button>
              <button onClick={() => setShowModal(false)} disabled={isPending} style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

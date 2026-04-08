'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { inviteTeamMember } from '@/app/(dashboard)/team/actions'
import type { Role } from '@/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'worker_standard', label: 'Staff' },
  { value: 'worker_isolated', label: 'Social Team' },
  { value: 'super_admin', label: 'Super Admin' },
]

const DEPARTMENTS = [
  { value: '', label: '— None —' },
  { value: 'script', label: 'Script' },
  { value: 'voice', label: 'Voice' },
  { value: 'editing', label: 'Editing' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'social_copy', label: 'Engagement' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2A2A',
  color: '#FFFFFF',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.8rem',
  padding: '0.65rem 0.85rem',
  outline: 'none',
  borderRadius: 0,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.6rem',
  color: '#888888',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  marginBottom: '0.35rem',
}

export function InviteModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'worker_standard' as Role,
    department: '',
  })
  const router = useRouter()
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && !tempPassword) firstInputRef.current?.focus()
  }, [open, tempPassword])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  function handleClose() {
    if (tempPassword) {
      router.refresh()
    }
    setOpen(false)
    setError('')
    setTempPassword('')
    setCopied(false)
    setForm({ full_name: '', email: '', role: 'worker_standard', department: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Full name and email are required.')
      return
    }
    setLoading(true)
    setError('')

    const result = await inviteTeamMember(form)

    setLoading(false)
    if (!result.success) {
      setError(result.error || 'Failed to invite member.')
    } else {
      setTempPassword(result.tempPassword || '')
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        data-testid="invite-member-btn"
        onClick={() => setOpen(true)}
        style={{
          background: '#CC1F1F',
          border: 'none',
          color: '#FFFFFF',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '0.95rem',
          letterSpacing: '0.15em',
          padding: '0.55rem 1.25rem',
          cursor: 'pointer',
          transition: 'background 150ms',
          borderRadius: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FF2B2B' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#CC1F1F' }}
      >
        + INVITE MEMBER
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          data-testid="invite-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            data-testid="invite-modal"
            style={{
              background: '#111111',
              border: '1px solid #2A2A2A',
              width: '100%',
              maxWidth: '440px',
              borderRadius: 0,
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>INVITE TEAM MEMBER</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.1rem' }}>Creates auth account + profile row</div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Success State */}
            {tempPassword ? (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#22C55E', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>MEMBER CREATED SUCCESSFULLY</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888' }}>
                    Share these credentials securely:
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={labelStyle}>Email</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#FFFFFF', padding: '0.65rem 0.85rem', background: '#0A0A0A', border: '1px solid #2A2A2A' }}>{form.email}</div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={labelStyle}>Temporary Password</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: '#CC1F1F', padding: '0.65rem 0.85rem', background: '#0A0A0A', border: '1px solid #CC1F1F', letterSpacing: '0.05em' }}>
                      {tempPassword}
                    </div>
                    <button
                      data-testid="copy-password-btn"
                      onClick={copyPassword}
                      style={{ background: copied ? '#22C55E' : '#2A2A2A', border: 'none', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', padding: '0 1rem', cursor: 'pointer', letterSpacing: '0.1em', transition: 'background 150ms', flexShrink: 0 }}
                    >
                      {copied ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  The member must change their password after first login.
                </div>

                <button
                  data-testid="invite-done-btn"
                  onClick={handleClose}
                  style={{ width: '100%', background: '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.75rem', cursor: 'pointer', borderRadius: 0 }}
                >
                  DONE — CLOSE &amp; REFRESH
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="invite-full-name" style={labelStyle}>Full Name *</label>
                  <input
                    id="invite-full-name"
                    ref={firstInputRef}
                    data-testid="invite-full-name"
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Jane Mwangi"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="invite-email" style={labelStyle}>Email Address *</label>
                  <input
                    id="invite-email"
                    data-testid="invite-email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@zamotomoto.tv"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="invite-role" style={labelStyle}>Role *</label>
                  <select
                    id="invite-role"
                    data-testid="invite-role"
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="invite-dept" style={labelStyle}>Department</label>
                  <select
                    id="invite-dept"
                    data-testid="invite-dept"
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div
                    data-testid="invite-error"
                    style={{ background: 'rgba(204,31,31,0.08)', border: '1px solid rgba(204,31,31,0.35)', color: '#FF2B2B', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.6rem 0.85rem' }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.65rem', cursor: 'pointer', borderRadius: 0 }}
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    data-testid="invite-submit-btn"
                    disabled={loading}
                    style={{ flex: 2, background: loading ? '#2A0000' : '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 150ms', borderRadius: 0 }}
                  >
                    {loading ? 'CREATING...' : 'CREATE MEMBER'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

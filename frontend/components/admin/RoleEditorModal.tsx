'use client'
import { useState } from 'react'
import { updateProfile } from '@/app/(dashboard)/admin/settings/actions'
import { ROLE_LABELS } from '@/lib/constants'
import type { Role } from '@/types'
import type { ProfileWithEmail } from './AdminSettingsClient'

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: 'worker_standard', label: 'Staff', color: '#22C55E' },
  { value: 'worker_isolated', label: 'Social Team', color: '#F59E0B' },
  { value: 'admin', label: 'Admin', color: '#F59E0B' },
  { value: 'super_admin', label: 'Super Admin', color: '#CC1F1F' },
]

const DEPARTMENTS = [
  { value: '', label: '— Unassigned —' },
  { value: 'script', label: 'Script' },
  { value: 'voice', label: 'Voice' },
  { value: 'editing', label: 'Editing' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'social_copy', label: 'Engagement' },
]

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2A2A',
  color: '#FFFFFF',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.8rem',
  padding: '0.6rem 0.8rem',
  borderRadius: 0,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.6rem',
  color: '#888888',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  marginBottom: '0.3rem',
}

interface Props {
  profile: ProfileWithEmail
  onClose: () => void
  onSaved: (updates: { role: Role; department: string | null; is_active: boolean }) => void
}

export function RoleEditorModal({ profile, onClose, onSaved }: Props) {
  const [role, setRole] = useState<Role>(profile.role)
  const [department, setDepartment] = useState(profile.department ?? '')
  const [isActive, setIsActive] = useState(profile.is_active)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setError('')

    const result = await updateProfile(profile.id, {
      role,
      department: department || null,
      is_active: isActive,
    })

    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Update failed')
    } else {
      setSaved(true)
      setTimeout(() => {
        onSaved({ role, department: department || null, is_active: isActive })
      }, 600)
    }
  }

  const currentRoleMeta = ROLES.find(r => r.value === role)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
    >
      <div
        data-testid="role-editor-modal"
        style={{ background: '#111111', border: '1px solid #2A2A2A', width: '100%', maxWidth: '460px', borderRadius: 0 }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>EDIT MEMBER</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888888', marginTop: '0.1rem' }}>
              Changes logged to activity_log
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Read-only fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={labelStyle}>Full Name</span>
              <div style={{ ...fieldStyle, color: '#888888', cursor: 'default' }}>{profile.full_name || '—'}</div>
            </div>
            <div>
              <span style={labelStyle}>Email</span>
              <div style={{ ...fieldStyle, color: '#888888', cursor: 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</div>
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label style={labelStyle} htmlFor="edit-role">Role</label>
            <select
              id="edit-role"
              data-testid="edit-role-select"
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              style={{ ...fieldStyle, cursor: 'pointer' }}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {(role === 'super_admin' || role === 'admin') && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#F59E0B', marginTop: '0.25rem' }}>
                {role === 'super_admin' ? 'Max 1 super admin allowed (DB enforced)' : 'Max 2 admins allowed (DB enforced)'}
              </div>
            )}
          </div>

          {/* Department selector */}
          <div>
            <label style={labelStyle} htmlFor="edit-dept">Department</label>
            <select
              id="edit-dept"
              data-testid="edit-dept-select"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              style={{ ...fieldStyle, cursor: 'pointer' }}
            >
              {DEPARTMENTS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A0A0A', border: '1px solid #2A2A2A', padding: '0.75rem 1rem' }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF' }}>Account Status</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#888888', marginTop: '0.1rem' }}>
                Inactive users cannot log in
              </div>
            </div>
            <button
              data-testid="toggle-active-btn"
              onClick={() => setIsActive(!isActive)}
              style={{
                background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(136,136,136,0.1)',
                border: `1px solid ${isActive ? '#22C55E' : '#2A2A2A'}`,
                color: isActive ? '#22C55E' : '#888888',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.35rem 0.85rem',
                cursor: 'pointer',
                transition: 'all 150ms',
                borderRadius: 0,
              }}
            >
              {isActive ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Hint about role color */}
          <div style={{ background: `${currentRoleMeta?.color}10`, border: `1px solid ${currentRoleMeta?.color}30`, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '6px', height: '6px', background: currentRoleMeta?.color, borderRadius: '9999px', flexShrink: 0 }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: currentRoleMeta?.color }}>
              Will be assigned: {ROLE_LABELS[role]}
            </span>
          </div>

          {error && (
            <div data-testid="role-edit-error" style={{ background: 'rgba(204,31,31,0.08)', border: '1px solid rgba(204,31,31,0.35)', color: '#FF2B2B', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', padding: '0.6rem 0.85rem' }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              onClick={onClose}
              style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.1em', padding: '0.65rem', cursor: 'pointer', borderRadius: 0 }}
            >
              CANCEL
            </button>
            <button
              data-testid="save-role-btn"
              onClick={handleSave}
              disabled={loading || saved}
              style={{ flex: 2, background: saved ? '#22C55E' : loading ? '#1A0000' : '#CC1F1F', border: 'none', color: '#FFFFFF', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.15em', padding: '0.65rem', cursor: loading || saved ? 'not-allowed' : 'pointer', transition: 'background 150ms', borderRadius: 0 }}
            >
              {saved ? 'SAVED ✓' : loading ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

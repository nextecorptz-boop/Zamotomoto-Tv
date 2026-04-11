'use client'
import { useState } from 'react'
import { ROLE_LABELS, DEPT_LABELS } from '@/lib/constants'
import { formatDate, getInitials } from '@/lib/utils'
import { RoleEditorModal } from './RoleEditorModal'
import type { ProfileWithEmail } from './AdminSettingsClient'

interface Props {
  profiles: ProfileWithEmail[]
  currentUserId: string
  currentUserRole: string
  onProfileUpdated: (updated: Partial<ProfileWithEmail> & { id: string }) => void
}

type SortField = 'full_name' | 'role' | 'department' | 'is_active'

export function RoleManagementTab({ profiles, currentUserId, currentUserRole, onProfileUpdated }: Props) {
  const [editingProfile, setEditingProfile] = useState<ProfileWithEmail | null>(null)
  const [sortField, setSortField] = useState<SortField>('full_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = [...profiles].sort((a, b) => {
    const va = String(a[sortField] ?? '')
    const vb = String(b[sortField] ?? '')
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  const thStyle = (field: SortField): React.CSSProperties => ({
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6rem',
    color: sortField === field ? '#CC1F1F' : '#666666',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    userSelect: 'none',
    padding: '0.4rem 0',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888' }}>
        {profiles.length} total members — click column headers to sort
      </div>

      {/* Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 140px 130px 110px 80px 140px', gap: '0.5rem', padding: '0.5rem 1rem 0.5rem 1rem', borderBottom: '1px solid #2A2A2A', alignItems: 'center' }}>
          <span />
          <span style={thStyle('full_name')} onClick={() => toggleSort('full_name')}>Member {sortField === 'full_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
          <span style={thStyle('role')} onClick={() => toggleSort('role')}>Role {sortField === 'role' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
          <span style={thStyle('department')} onClick={() => toggleSort('department')}>Dept {sortField === 'department' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
          <span style={thStyle('is_active')} onClick={() => toggleSort('is_active')}>Status {sortField === 'is_active' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Joined</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>Actions</span>
        </div>

        {sorted.map(member => {
          const roleColor = member.role === 'super_admin' ? '#CC1F1F' : member.role === 'admin' ? '#F59E0B' : '#22C55E'
          const isMe = member.id === currentUserId
          // admin cannot edit a super_admin row; super_admin can edit anyone except themselves
          const canEdit = !isMe && !(currentUserRole === 'admin' && member.role === 'super_admin')

          return (
            <div
              key={member.id}
              data-testid={`role-row-${member.id}`}
              className="hover-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 140px 130px 110px 80px 140px',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #1A1A1A',
                alignItems: 'center',
                opacity: member.is_active ? 1 : 0.5,
                transition: 'background 120ms',
              }}
            >
              {/* Avatar */}
              <div style={{ width: '28px', height: '28px', borderRadius: '9999px', background: member.role === 'super_admin' || member.role === 'admin' ? '#CC1F1F' : '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#FFFFFF', flexShrink: 0 }}>
                {getInitials(member.full_name || '')}
              </div>

              {/* Name + email */}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.full_name || '—'}
                  </span>
                  {isMe && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#CC1F1F', border: '1px solid #CC1F1F', padding: '0 0.25rem', letterSpacing: '0.1em', flexShrink: 0 }}>YOU</span>}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.63rem', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.email}
                </div>
              </div>

              {/* Role badge */}
              <div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: roleColor, border: `1px solid ${roleColor}`, padding: '0.1rem 0.35rem' }}>
                  {ROLE_LABELS[member.role]}
                </span>
              </div>

              {/* Department */}
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.department ? DEPT_LABELS[member.department] ?? member.department : '—'}
              </div>

              {/* Active status */}
              <div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: member.is_active ? '#22C55E' : '#888888', border: `1px solid ${member.is_active ? '#22C55E' : '#2A2A2A'}`, padding: '0.1rem 0.35rem' }}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Joined */}
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.63rem', color: '#666666' }}>
                {formatDate(member.created_at)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                {canEdit && (
                  <button
                    data-testid={`edit-member-${member.id}`}
                    onClick={() => setEditingProfile(member)}
                    style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.25rem 0.6rem', cursor: 'pointer', borderRadius: 0, transition: 'border-color 120ms' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#CC1F1F' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A2A' }}
                  >
                    EDIT
                  </button>
                )}
                {isMe && (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#555555', letterSpacing: '0.08em', padding: '0.25rem 0' }}>
                    —
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Role Editor Modal */}
      {editingProfile && (
        <RoleEditorModal
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSaved={(updates) => {
            onProfileUpdated({ id: editingProfile.id, ...updates })
            setEditingProfile(null)
          }}
        />
      )}
    </div>
  )
}

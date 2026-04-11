'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS, DEPT_LABELS } from '@/lib/constants'
import { formatDate, getInitials } from '@/lib/utils'
import type { Role } from '@/types'
import { RoleEditorModal } from '@/components/admin/RoleEditorModal'
import { InviteModal } from '@/components/team/InviteModal'
import { deleteTeamMember } from '@/app/(dashboard)/team/actions'
import type { ProfileWithEmail } from '@/components/admin/AdminSettingsClient'

interface Props {
  members: ProfileWithEmail[]
  currentUserId: string
  currentUserRole: Role
  isSuperAdmin: boolean
}

export function TeamPageClient({ members: initialMembers, currentUserId, currentUserRole, isSuperAdmin }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<ProfileWithEmail[]>(initialMembers)
  const [editingMember, setEditingMember] = useState<ProfileWithEmail | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toastMsg, setToastMsg] = useState('')
  const [toastIsError, setToastIsError] = useState(false)

  const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin'

  const showToast = (msg: string, isError = false) => {
    setToastMsg(msg)
    setToastIsError(isError)
    setTimeout(() => setToastMsg(''), 3500)
  }

  /**
   * Returns true if the current viewer is permitted to act on (edit/delete) this member.
   * Rules:
   * - Cannot act on own account
   * - admin cannot act on super_admin rows (option b: buttons are simply not rendered)
   */
  const canActOn = (member: ProfileWithEmail): boolean => {
    if (!isAdmin) return false
    if (member.id === currentUserId) return false
    if (currentUserRole === 'admin' && member.role === 'super_admin') return false
    return true
  }

  const handleDeleteConfirm = (memberId: string) => {
    startTransition(async () => {
      const result = await deleteTeamMember(memberId)
      setConfirmDeleteId(null)
      if (!result.success) {
        showToast(result.error ?? 'Delete failed', true)
        return
      }
      if (result.auth_delete_failed) {
        // Profile deactivated but auth row remains — still a functional success
        showToast('Member deactivated (auth cleanup may be needed)', false)
      } else {
        showToast('Member removed successfully')
      }
      setMembers(prev => prev.filter(m => m.id !== memberId))
      router.refresh()
    })
  }

  const admins = members.filter(m => m.role === 'admin' || m.role === 'super_admin')
  const workers = members.filter(m => m.role !== 'admin' && m.role !== 'super_admin')

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast */}
      {toastMsg && (
        <div
          data-testid="team-toast"
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.5rem',
            zIndex: 9998,
            background: toastIsError ? '#CC1F1F' : '#22C55E',
            color: toastIsError ? '#FFFFFF' : '#000000',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.68rem',
            padding: '0.55rem 1rem',
            letterSpacing: '0.05em',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>Team</h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.25rem' }}>{members.length} members</p>
        </div>
        {isSuperAdmin && <InviteModal />}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
        {[
          { label: 'Total Members', value: members.length },
          { label: 'Admins', value: admins.length, color: '#CC1F1F' },
          { label: 'Staff', value: workers.filter(m => m.role === 'worker_standard').length, color: '#22C55E' },
          { label: 'Social Team', value: workers.filter(m => m.role === 'worker_isolated').length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111111', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{s.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: s.color || '#FFFFFF', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2A2A2A' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>ALL MEMBERS</div>
        </div>
        <div>
          {/* Column header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isAdmin ? '40px 1fr 140px 140px 110px 140px' : '40px 1fr 140px 140px 120px',
              gap: '0.5rem',
              padding: '0.4rem 1.5rem',
              borderBottom: '1px solid #1A1A1A',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6rem',
              color: '#666666',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            <span />
            <span>Member</span>
            <span>Role</span>
            <span>Department</span>
            <span>Joined</span>
            {isAdmin && <span style={{ textAlign: 'right' }}>Actions</span>}
          </div>

          {members.map(member => {
            const roleColor = member.role === 'super_admin' ? '#CC1F1F' : member.role === 'admin' ? '#F59E0B' : '#22C55E'
            const isMe = member.id === currentUserId
            const showActions = canActOn(member)
            const isConfirming = confirmDeleteId === member.id

            return (
              <div
                key={member.id}
                data-testid={`team-member-${member.id}`}
                className="hover-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: isAdmin ? '40px 1fr 140px 140px 110px 140px' : '40px 1fr 140px 140px 120px',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderBottom: '1px solid #1A1A1A',
                  alignItems: 'center',
                  transition: 'background 120ms',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    background: member.role === 'super_admin' || member.role === 'admin' ? '#CC1F1F' : '#2A2A2A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6rem',
                    color: '#FFFFFF',
                  }}
                >
                  {getInitials(member.full_name || member.email || '')}
                </div>

                {/* Name + email */}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.full_name || member.email || '—'}
                    </span>
                    {isMe && (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#CC1F1F', border: '1px solid #CC1F1F', padding: '0 0.25rem', letterSpacing: '0.1em', flexShrink: 0 }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.email || '—'}
                  </div>
                </div>

                {/* Role badge */}
                <div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: roleColor,
                      border: `1px solid ${roleColor}`,
                      padding: '0.1rem 0.4rem',
                    }}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>

                {/* Department */}
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#888888', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.department ? (DEPT_LABELS[member.department] ?? member.department) : '—'}
                </div>

                {/* Joined */}
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#666666' }}>
                  {formatDate(member.created_at)}
                </div>

                {/* Actions column (admin/super_admin viewers only) */}
                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', alignItems: 'center' }}>
                    {showActions ? (
                      isConfirming ? (
                        /* Confirm-delete inline state */
                        <>
                          <button
                            data-testid={`confirm-delete-${member.id}`}
                            onClick={() => handleDeleteConfirm(member.id)}
                            disabled={isPending}
                            style={{
                              background: isPending ? '#2A0000' : '#CC1F1F',
                              border: 'none',
                              color: '#FFFFFF',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.58rem',
                              letterSpacing: '0.1em',
                              padding: '0.25rem 0.55rem',
                              cursor: isPending ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isPending ? '...' : 'CONFIRM'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isPending}
                            style={{
                              background: 'transparent',
                              border: '1px solid #2A2A2A',
                              color: '#888888',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.58rem',
                              letterSpacing: '0.1em',
                              padding: '0.25rem 0.45rem',
                              cursor: 'pointer',
                            }}
                          >
                            CANCEL
                          </button>
                        </>
                      ) : (
                        /* Normal state: EDIT + DELETE */
                        <>
                          <button
                            data-testid={`edit-team-member-${member.id}`}
                            onClick={() => setEditingMember(member)}
                            style={{
                              background: '#1A1A1A',
                              border: '1px solid #2A2A2A',
                              color: '#FFFFFF',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6rem',
                              letterSpacing: '0.1em',
                              padding: '0.25rem 0.55rem',
                              cursor: 'pointer',
                              transition: 'border-color 120ms',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#CC1F1F' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A2A' }}
                          >
                            EDIT
                          </button>
                          <button
                            data-testid={`delete-team-member-${member.id}`}
                            onClick={() => setConfirmDeleteId(member.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #2A2A2A',
                              color: '#CC1F1F',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6rem',
                              letterSpacing: '0.1em',
                              padding: '0.25rem 0.55rem',
                              cursor: 'pointer',
                              transition: 'all 120ms',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#CC1F1F'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(204,31,31,0.1)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A2A'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                          >
                            DEL
                          </button>
                        </>
                      )
                    ) : (
                      /* No actions available for this row */
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#333333' }}>—</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Role Editor Modal */}
      {editingMember && (
        <RoleEditorModal
          profile={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={(updates) => {
            setMembers(prev =>
              prev.map(m => m.id === editingMember.id ? { ...m, ...updates } : m)
            )
            setEditingMember(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

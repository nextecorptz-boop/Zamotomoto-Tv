'use client'
import { useState } from 'react'
import { RoleManagementTab } from './RoleManagementTab'
import { DepartmentSettingsTab } from './DepartmentSettingsTab'
import { SystemStatusTab } from './SystemStatusTab'
import { AdminSocialCopyTab } from './AdminSocialCopyTab'
import type { Profile, Role } from '@/types'
import type { SystemStats } from '@/app/(dashboard)/admin/settings/actions'
import type { SocialTaskRow } from '@/app/(dashboard)/social-copy/actions'

export type ProfileWithEmail = Profile & { email: string }

type Tab = 'roles' | 'departments' | 'status' | 'social'

const TABS: { id: Tab; label: string }[] = [
  { id: 'roles', label: 'Role Management' },
  { id: 'departments', label: 'Departments' },
  { id: 'status', label: 'System Status' },
  { id: 'social', label: 'Engagement' },
]

interface Props {
  profiles: ProfileWithEmail[]
  currentUserId: string
  currentUserRole: Role
  stats: SystemStats
  socialTasks: SocialTaskRow[]
}

export function AdminSettingsClient({ profiles: initialProfiles, currentUserId, currentUserRole, stats, socialTasks }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('roles')
  const [profiles, setProfiles] = useState<ProfileWithEmail[]>(initialProfiles)

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Admin Access Only
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
            Admin Control Panel
          </h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#888888', marginTop: '0.2rem' }}>
            {profiles.length} members · {stats.active} active
          </p>
        </div>
        {/* Red access badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(204,31,31,0.1)', border: '1px solid rgba(204,31,31,0.3)', padding: '0.4rem 0.75rem' }}>
          <div style={{ width: '6px', height: '6px', background: '#CC1F1F', borderRadius: '9999px' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Restricted Access
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2A2A2A', gap: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            data-testid={`admin-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #CC1F1F' : '2px solid transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#888888',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.65rem 1.25rem',
              cursor: 'pointer',
              marginBottom: '-1px',
              transition: 'all 150ms',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '60vh' }}>
        {activeTab === 'roles' && (
          <RoleManagementTab
            profiles={profiles}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onProfileUpdated={(updated) => setProfiles(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
          />
        )}
        {activeTab === 'departments' && (
          <DepartmentSettingsTab profiles={profiles} />
        )}
        {activeTab === 'status' && (
          <SystemStatusTab stats={stats} profiles={profiles} />
        )}
        {activeTab === 'social' && (
          <AdminSocialCopyTab tasks={socialTasks} />
        )}
      </div>
    </div>
  )
}

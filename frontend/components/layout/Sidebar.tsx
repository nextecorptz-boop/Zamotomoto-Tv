'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'

interface SidebarProps {
  profile: Profile | null
}

// Primary nav for admin / super_admin — Settings links to /admin/settings directly
const adminPrimaryNav = [
  { href: '/', label: 'Dashboard', icon: '■' },
  { href: '/analytics', label: 'Analytics', icon: '◈' },
  { href: '/team', label: 'Team', icon: '◐' },
  { href: '/departments', label: 'Departments', icon: '◉' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' },
]

// Primary nav for worker_standard — Tasks, Media, Departments only
const workerStandardNav = [
  { href: '/', label: 'Dashboard', icon: '■' },
  { href: '/tasks', label: 'Tasks', icon: '▤' },
  { href: '/tasks/new', label: 'New Task', icon: '+' },
  { href: '/files', label: 'Media Library', icon: '◫' },
  { href: '/departments', label: 'Departments', icon: '◉' },
]

// worker_isolated has NO primary nav items — only the Engagement section below

// Engagement children for admin collapsible (Validate Queue, Categories, Eng. Settings)
const engagementAdminChildren = [
  { href: '/engagement/validate', label: 'Validate Queue', icon: '◈' },
  { href: '/engagement/admin/categories', label: 'Categories', icon: '◆' },
  { href: '/engagement/admin/settings', label: 'Eng. Settings', icon: '⚙' },
]

// Engagement flat items for workers
const engagementWorkerItems = [
  { href: '/engagement/dashboard', label: 'Engagement', icon: '◉' },
  { href: '/engagement/submit', label: 'Submit Proof', icon: '+' },
  { href: '/engagement/submissions', label: 'My Submissions', icon: '◫' },
]

// Admin section: Accounting only (Payroll and Admin Panel hidden per spec)
const adminNavItems = [
  { href: '/accounting', label: 'Accounting', icon: '∑' },
]

// Minimal nav for accountant role
const accountantNavItems = [
  { href: '/', label: 'Dashboard', icon: '■' },
  { href: '/accounting/workspace', label: 'Accounting', icon: '∑' },
  { href: '/accounting/workspace/payroll', label: 'Payroll', icon: '$' },
  { href: '/accounting/workspace/salary-records', label: 'Salary Records', icon: '◈' },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [engagementOpen, setEngagementOpen] = useState(true)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isEngagementActive = pathname.startsWith('/engagement')
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'
  const isWorkerIsolated = profile?.role === 'worker_isolated'

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 1rem',
    textDecoration: 'none',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    transition: 'all 120ms',
    color: active ? '#FFFFFF' : '#888888',
    background: active ? 'rgba(204,31,31,0.1)' : 'transparent',
    borderLeft: active ? '3px solid #CC1F1F' : '3px solid transparent',
  })

  const adminLinkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 1rem',
    textDecoration: 'none',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    transition: 'all 120ms',
    color: active ? '#FF2B2B' : '#CC1F1F',
    background: active ? 'rgba(204,31,31,0.15)' : 'transparent',
    borderLeft: active ? '3px solid #CC1F1F' : '3px solid transparent',
    opacity: 0.85,
  })

  return (
    <aside
      data-testid="sidebar"
      style={{
        width: '256px',
        minWidth: '256px',
        background: '#111111',
        borderRight: '1px solid #2A2A2A',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/zmm-flame.png" alt="ZMM" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#FFFFFF', lineHeight: 1 }}>
              ZAMOTOMOTO TV
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Media Operations
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem' }}>
          <div
            className="live-dot"
            style={{ width: '6px', height: '6px', background: '#CC1F1F', borderRadius: '9999px' }}
          />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#CC1F1F', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            Live
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.5rem 0' }}>

        {/* Accountant: minimal nav only */}
        {profile?.role === 'accountant' ? (
          accountantNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={navLinkStyle(isActive(item.href))}
              onMouseEnter={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.03)'; el.style.color = '#FFFFFF' } }}
              onMouseLeave={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = '#888888' } }}
            >
              <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))
        ) : (
          <>
            {/* Primary nav: role-gated array */}
            {(isAdmin
              ? adminPrimaryNav
              : isWorkerIsolated
                ? [] // worker_isolated: no primary nav — Engagement section only
                : workerStandardNav
            ).map(item => (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={navLinkStyle(isActive(item.href))}
                onMouseEnter={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.03)'; el.style.color = '#FFFFFF' } }}
                onMouseLeave={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = '#888888' } }}
              >
                <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            {/* Engagement section */}
            <div style={{ borderTop: '1px solid #1A1A1A', marginTop: '0.25rem' }}>
              {isAdmin ? (
                /* Collapsible for admin/super_admin */
                <>
                  <button
                    data-testid="engagement-toggle"
                    onClick={() => setEngagementOpen(o => !o)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 1rem 0.4rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.55rem',
                        color: isEngagementActive ? '#FFFFFF' : '#888888',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        transition: 'color 120ms',
                      }}
                    >
                      Engagement
                    </span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.65rem',
                        color: '#666666',
                        display: 'inline-block',
                        transform: engagementOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 150ms ease',
                        lineHeight: 1,
                      }}
                    >
                      ▾
                    </span>
                  </button>

                  {engagementOpen && engagementAdminChildren.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      style={{ ...navLinkStyle(isActive(item.href)), paddingLeft: '1.75rem' }}
                      onMouseEnter={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.03)'; el.style.color = '#FFFFFF' } }}
                      onMouseLeave={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = '#888888' } }}
                    >
                      <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </>
              ) : (
                /* Flat for workers */
                <>
                  <div style={{ padding: '0.6rem 1rem 0.2rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#888888', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                    Engagement
                  </div>
                  {engagementWorkerItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      style={navLinkStyle(isActive(item.href))}
                      onMouseEnter={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.03)'; el.style.color = '#FFFFFF' } }}
                      onMouseLeave={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = '#888888' } }}
                    >
                      <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </>
              )}
            </div>

            {/* Admin section: Accounting only for super_admin/admin */}
            {isAdmin && (
              <>
                <div style={{ padding: '0.6rem 1rem 0.2rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#CC1F1F', letterSpacing: '0.25em', textTransform: 'uppercase', borderTop: '1px solid #1A1A1A', marginTop: '0.25rem' }}>
                  Admin
                </div>
                {adminNavItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    style={adminLinkStyle(isActive(item.href))}
                    onMouseEnter={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(204,31,31,0.08)'; el.style.opacity = '1' } }}
                    onMouseLeave={e => { if (!isActive(item.href)) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.opacity = '0.85' } }}
                  >
                    <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            )}
          </>
        )}
      </nav>

      {/* User section */}
      <div style={{ padding: '1rem', borderTop: '1px solid #2A2A2A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: '#CC1F1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.7rem',
              color: '#FFFFFF',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(profile?.full_name || profile?.email || '?')}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {profile?.role ? ROLE_LABELS[profile.role] : 'Staff'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid #2A2A2A',
            color: '#888888',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '0.4rem',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = '#CC1F1F'
            el.style.color = '#CC1F1F'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.borderColor = '#2A2A2A'
            el.style.color = '#888888'
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}

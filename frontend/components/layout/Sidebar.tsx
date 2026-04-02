'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'

interface SidebarProps {
  profile: Profile | null
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: '■' },
  { href: '/tasks', label: 'Tasks', icon: '▤' },
  { href: '/tasks/new', label: 'New Task', icon: '+' },
  { href: '/files', label: 'Media Library', icon: '◫' },
  { href: '/analytics', label: 'Analytics', icon: '◈' },
  { href: '/departments', label: 'Departments', icon: '◉' },
  { href: '/special-projects', label: 'Special Projects', icon: '◆' },
  { href: '/social-copy', label: 'Social Copy', icon: '◎' },
  { href: '/team', label: 'Team', icon: '◐' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

const adminNavItems = [
  { href: '/admin/settings', label: 'Admin Panel', icon: '⬡' },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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
        {/* Live indicator */}
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
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 1rem',
              textDecoration: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              transition: 'all 120ms',
              color: isActive(item.href) ? '#FFFFFF' : '#888888',
              background: isActive(item.href) ? 'rgba(204,31,31,0.1)' : 'transparent',
              borderLeft: isActive(item.href) ? '3px solid #CC1F1F' : '3px solid transparent',
            }}
            onMouseEnter={e => {
              if (!isActive(item.href)) {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(255,255,255,0.03)'
                el.style.color = '#FFFFFF'
              }
            }}
            onMouseLeave={e => {
              if (!isActive(item.href)) {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.color = '#888888'
              }
            }}
          >
            <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Admin-only section */}
        {(profile?.role === 'super_admin') && (
          <>
            <div style={{ padding: '0.6rem 1rem 0.2rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#CC1F1F', letterSpacing: '0.25em', textTransform: 'uppercase', borderTop: '1px solid #1A1A1A', marginTop: '0.25rem' }}>
              Admin
            </div>
            {adminNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  textDecoration: 'none',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  transition: 'all 120ms',
                  color: isActive(item.href) ? '#FF2B2B' : '#CC1F1F',
                  background: isActive(item.href) ? 'rgba(204,31,31,0.15)' : 'transparent',
                  borderLeft: isActive(item.href) ? '3px solid #CC1F1F' : '3px solid transparent',
                  opacity: 0.85,
                }}
                onMouseEnter={e => {
                  if (!isActive(item.href)) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(204,31,31,0.08)'
                    el.style.opacity = '1'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive(item.href)) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'transparent'
                    el.style.opacity = '0.85'
                  }
                }}
              >
                <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
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

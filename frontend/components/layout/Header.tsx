'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/types'
import { getInitials } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  profile: Profile | null
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/tasks/new': 'New Task',
  '/files': 'Media Library',
  '/analytics': 'Analytics',
  '/departments': 'Departments',
  '/special-projects': 'Special Projects',
  '/social-copy': 'Engagement',
  '/engagement': 'Engagement',
  '/team': 'Team',
  '/settings': 'Settings',
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] ?? 'Media Operations'

  return (
    <header
      data-testid="top-header"
      style={{
        position: 'fixed',
        top: 0,
        left: '256px',
        right: 0,
        height: '64px',
        background: '#0A0A0A',
        borderBottom: '1px solid #2A2A2A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 40,
      }}
    >
      {/* Left: Page title */}
      <div>
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.4rem',
            letterSpacing: '0.1em',
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Center: Search */}
      <div style={{ flex: 1, maxWidth: '360px', margin: '0 2rem' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#444444', fontSize: '0.8rem' }}>
            ⌕
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, files, people..."
            data-testid="header-search"
            style={{
              width: '100%',
              background: '#111111',
              border: '1px solid #2A2A2A',
              color: '#FFFFFF',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              padding: '0.5rem 0.75rem 0.5rem 2rem',
              outline: 'none',
              borderRadius: 0,
            }}
          />
        </div>
      </div>

      {/* Right: Notifications + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Realtime notification bell */}
        <NotificationBell />

        {/* Avatar */}
        <div
          data-testid="user-avatar"
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
            cursor: 'pointer',
          }}
        >
          {getInitials(profile?.full_name || profile?.email || '?')}
        </div>
      </div>
    </header>
  )
}

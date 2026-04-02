'use client'
import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        data-testid="notification-bell"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '0.25rem',
          color: isOpen ? '#CC1F1F' : '#888888',
          transition: 'color 150ms',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            style={{
              position: 'absolute',
              top: '-1px',
              right: '-3px',
              minWidth: '16px',
              height: '16px',
              background: '#CC1F1F',
              borderRadius: '9999px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.48rem',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              padding: '0 3px',
              letterSpacing: 0,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          data-testid="notification-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.5rem)',
            width: '320px',
            background: '#111111',
            border: '1px solid #2A2A2A',
            zIndex: 9000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '0.65rem 1rem',
              borderBottom: '1px solid #2A2A2A',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.95rem',
                letterSpacing: '0.12em',
                color: '#FFFFFF',
              }}
            >
              ACTIVITY
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.58rem',
                  color: '#CC1F1F',
                  letterSpacing: '0.05em',
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.7rem',
                  color: '#444444',
                }}
              >
                No activity yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.65rem 1rem',
                    borderBottom: '1px solid #1A1A1A',
                    background: n.read ? 'transparent' : 'rgba(204,31,31,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    {!n.read && (
                      <div
                        style={{
                          width: '5px',
                          height: '5px',
                          background: '#CC1F1F',
                          borderRadius: '9999px',
                          marginTop: '5px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.7rem',
                          color: '#FFFFFF',
                          textTransform: 'capitalize',
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </div>
                      {n.description && (
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.6rem',
                            color: '#666666',
                            marginTop: '0.15rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {n.description}
                        </div>
                      )}
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.56rem',
                          color: '#444444',
                          marginTop: '0.2rem',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {new Date(n.timestamp).toLocaleString('en-KE', {
                          timeZone: 'Africa/Nairobi',
                          hour12: false,
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div style={{ padding: '0.55rem 1rem', borderTop: '1px solid #2A2A2A' }}>
              <button
                data-testid="mark-all-read-btn"
                onClick={() => { markAllAsRead(); setIsOpen(false) }}
                style={{
                  width: '100%',
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  color: '#888888',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.62rem',
                  letterSpacing: '0.1em',
                  padding: '0.4rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Mark All Read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

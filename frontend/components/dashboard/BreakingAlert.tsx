'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useSpecialProjectsRealtime } from '@/hooks/useSpecialProjectsRealtime'

interface BreakingProject {
  id: string
  sp_ref: string
  title: string
  urgency: string
  status: string
}

export function BreakingAlert() {
  const { isAdminOrAbove, isLoading } = useUser()
  const [breakingProjects, setBreakingProjects] = useState<BreakingProject[]>([])
  const [isDismissed, setIsDismissed] = useState(false)
  const [prevCount, setPrevCount] = useState(0)

  const fetchBreaking = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('special_projects')
      .select('id, sp_ref, title, urgency, status')
      .eq('status', 'active')
      .in('urgency', ['breaking', 'critical'])
      .order('created_at', { ascending: false })

    const projects = data ?? []
    setBreakingProjects(projects)

    // Re-show banner if new breaking project appeared
    if (projects.length > prevCount) {
      setIsDismissed(false)
    }
    setPrevCount(projects.length)
  }, [prevCount])

  useEffect(() => {
    if (!isLoading && isAdminOrAbove) {
      fetchBreaking()
    }
  }, [isLoading, isAdminOrAbove, fetchBreaking])

  useSpecialProjectsRealtime(isAdminOrAbove ? fetchBreaking : undefined)

  if (!isAdminOrAbove || isDismissed || breakingProjects.length === 0) return null

  return (
    <div
      data-testid="breaking-alert"
      style={{
        background: '#CC1F1F',
        borderBottom: '2px solid #FF2B2B',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={{ color: '#FFFFFF', flexShrink: 0 }}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>

        <div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '0.95rem',
              letterSpacing: '0.12em',
              color: '#FFFFFF',
            }}
          >
            BREAKING — {breakingProjects.length} URGENT PROJECT
            {breakingProjects.length > 1 ? 'S' : ''} REQUIRE IMMEDIATE ATTENTION
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.62rem',
              color: 'rgba(255,255,255,0.8)',
              marginTop: '0.1rem',
              letterSpacing: '0.04em',
            }}
          >
            {breakingProjects.map(p => `${p.sp_ref}: ${p.title}`).join(' · ')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <a
          href="/special-projects"
          data-testid="breaking-alert-view-all"
          style={{
            background: '#FFFFFF',
            color: '#CC1F1F',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '0.82rem',
            letterSpacing: '0.12em',
            padding: '0.3rem 0.9rem',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          VIEW ALL
        </a>
        <button
          data-testid="dismiss-breaking-alert"
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#FFFFFF',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.62rem',
            letterSpacing: '0.08em',
            padding: '0.3rem 0.65rem',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          DISMISS
        </button>
      </div>
    </div>
  )
}

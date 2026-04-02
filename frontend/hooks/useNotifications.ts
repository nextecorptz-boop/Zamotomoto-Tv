'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchRecentActivity } from '@/app/(dashboard)/notifications/actions'

export interface AppNotification {
  id: string
  title: string
  description: string
  timestamp: string
  read: boolean
}

const READ_AT_KEY = 'zmm_notifications_read_at'

function getReadAt(): Date | null {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(READ_AT_KEY) : null
    return stored ? new Date(stored) : null
  } catch {
    return null
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const loadedRef = useRef(false)

  const loadNotifications = useCallback(async () => {
    // Use server action to bypass activity_log RLS restrictions
    const data = await fetchRecentActivity(20)
    if (!data.length) return

    const readAt = getReadAt()
    const mapped: AppNotification[] = data.map((item) => ({
      id: item.id,
      title: item.action.replace(/_/g, ' '),
      description: ((item.metadata as Record<string, string> | null)?.description) ?? '',
      timestamp: item.created_at,
      read: readAt ? new Date(item.created_at) <= readAt : false,
    }))

    setNotifications(mapped)
    setUnreadCount(mapped.filter(n => !n.read).length)
  }, [])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    loadNotifications()

    // Subscribe to new activity via realtime (browser client)
    const supabase = createClient()
    const channel = supabase
      .channel('zmm_activity_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          const item = payload.new as Record<string, unknown>
          const newNotif: AppNotification = {
            id: item.id as string,
            title: (item.action as string).replace(/_/g, ' '),
            description: ((item.metadata as Record<string, string> | null)?.description) ?? '',
            timestamp: item.created_at as string,
            read: false,
          }
          setNotifications(prev => [newNotif, ...prev.slice(0, 19)])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotifications])

  const markAllAsRead = useCallback(() => {
    try {
      localStorage.setItem(READ_AT_KEY, new Date().toISOString())
    } catch { /* ignore */ }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markAllAsRead }
}

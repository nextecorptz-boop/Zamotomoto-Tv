'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type RealtimeTable = 'tasks' | 'special_projects' | 'social_tasks' | 'activity_log'

export function useRealtimeSubscription(
  tableName: RealtimeTable,
  onChange: () => void
) {
  // Keep ref to latest callback — avoids recreating subscription on every render
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = createClient()
    // Use unique channel name to allow multiple subscriptions to same table
    const channelId = `rt_${tableName}_${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          onChangeRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName])
}

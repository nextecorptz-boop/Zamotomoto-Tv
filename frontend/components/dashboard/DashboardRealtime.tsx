'use client'
import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTasksRealtime } from '@/hooks/useTasksRealtime'
import { useActivityLogRealtime } from '@/hooks/useActivityLogRealtime'

// Invisible client component — subscribes to realtime and refreshes the server
// component data without a full page reload.
export function DashboardRealtime() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      router.refresh()
      timerRef.current = null
    }, 400)
  }, [router])

  useTasksRealtime(debouncedRefresh)
  useActivityLogRealtime(debouncedRefresh)

  return null
}

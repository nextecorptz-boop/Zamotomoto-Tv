'use client'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useActivityLogRealtime(onChange?: () => void) {
  useRealtimeSubscription('activity_log', onChange ?? (() => {}))
}

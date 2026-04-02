'use client'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useSocialTasksRealtime(onChange?: () => void) {
  useRealtimeSubscription('social_tasks', onChange ?? (() => {}))
}

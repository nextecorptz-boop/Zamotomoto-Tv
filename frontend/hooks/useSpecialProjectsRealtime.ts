'use client'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useSpecialProjectsRealtime(onChange?: () => void) {
  useRealtimeSubscription('special_projects', onChange ?? (() => {}))
}

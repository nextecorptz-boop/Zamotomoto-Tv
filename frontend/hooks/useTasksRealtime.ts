'use client'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useTasksRealtime(onChange?: () => void) {
  useRealtimeSubscription('tasks', onChange ?? (() => {}))
}

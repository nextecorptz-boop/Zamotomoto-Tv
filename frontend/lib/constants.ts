import type { Stage } from '@/types'

export const STAGES: { id: Stage; label: string; color: string; bgColor: string }[] = [
  { id: 'script', label: 'SCRIPT', color: '#CC1F1F', bgColor: 'rgba(204,31,31,0.1)' },
  { id: 'voice', label: 'VOICE', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' },
  { id: 'editing', label: 'EDITING', color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)' },
  { id: 'publishing', label: 'PUBLISHING', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.1)' },
]

export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]))

export const STATUS_COLORS: Record<string, string> = {
  pending: '#888888',
  in_progress: '#F59E0B',
  review: '#8B5CF6',
  approved: '#22C55E',
  rejected: '#CC1F1F',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#888888',
  normal: '#888888',
  high: '#F59E0B',
  urgent: '#CC1F1F',
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  worker_standard: 'Staff',
  worker_isolated: 'Social Team',
}

export const DEPT_LABELS: Record<string, string> = {
  script: 'Script',
  voice: 'Voice',
  editing: 'Editing',
  publishing: 'Publishing',
  social_copy: 'Social Copy',
}

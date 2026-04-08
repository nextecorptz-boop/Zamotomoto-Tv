// ── Engagement Desk Types ─────────────────────────────────────────────────────

export type EngagementSubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface EngagementCategory {
  id: string
  name: string
  description: string | null
  platform: string | null
  points_value: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EngagementSubmission {
  id: string
  operator_id: string
  category_id: string
  status: EngagementSubmissionStatus
  proof_url: string | null
  storage_path: string | null
  notes: string | null
  submitted_at: string
  reviewed_by: string | null
  review_note: string | null
  reviewed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  // Joined
  operator?: { full_name: string | null } | null
  category?: EngagementCategory | null
  reviewer?: { full_name: string | null } | null
}

export interface EngagementActivityLog {
  id: string
  submission_id: string | null
  actor_id: string
  action: string
  notes: string | null
  created_at: string
  // Joined
  actor?: { full_name: string | null } | null
}

export interface EngagementConfig {
  id: string
  config_key: string
  config_value: string
  updated_by: string | null
  updated_at: string
}

export interface EngagementOperatorStats {
  today_submitted: number
  today_approved: number
  today_pending: number
  today_rejected: number
  daily_target: number
  total_this_month: number
}

export interface EngagementTeamEntry {
  operator_id: string
  operator_name: string | null
  today_count: number
  approved_count: number
  month_total: number
}

export interface EngagementDashboardData {
  operator_stats: EngagementOperatorStats
  team_entries: EngagementTeamEntry[]
  recent_submissions: EngagementSubmission[]
  pending_count: number
}

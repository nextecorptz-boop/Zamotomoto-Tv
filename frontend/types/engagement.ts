// ── Engagement Desk Types — built against live verified schema only ───────────

export type EngagementSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// engagement_categories: id, name, is_active, created_at
export interface EngagementCategory {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

// engagement_submissions: actual live schema columns
export interface EngagementSubmission {
  id: string
  operator_id: string
  category_id: string
  status: EngagementSubmissionStatus
  proof_url: string | null
  storage_path: string | null
  expires_at: string | null
  created_at: string
  // Optional columns present in live DB
  submission_date?: string | null
  file_size_bytes?: number | null
  mime_type?: string | null
  approved_by?: string | null
  approved_at?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  // Joined (FK via Supabase PostgREST)
  operator?: { full_name: string | null } | null
  category?: EngagementCategory | null
}

// engagement_activity_log: id, submission_id, actor_id, action, created_at
export interface EngagementActivityLog {
  id: string
  submission_id: string | null
  actor_id: string
  action: string
  created_at: string
  // Joined
  actor?: { full_name: string | null } | null
}

// engagement_config: id, config_key, config_value
export interface EngagementConfig {
  id: string
  config_key: string
  config_value: string
}

// Dashboard data structures
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

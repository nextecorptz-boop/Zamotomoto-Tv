import type { EngagementSubmissionStatus } from '@/types/engagement'

interface Props {
  status: EngagementSubmissionStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<EngagementSubmissionStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'PENDING',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  APPROVED: { label: 'APPROVED', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  REJECTED: { label: 'REJECTED', color: '#CC1F1F', bg: 'rgba(204,31,31,0.1)' },
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  const fontSize = size === 'md' ? '0.7rem' : '0.6rem'

  return (
    <span
      data-testid={`status-badge-${status}`}
      style={{
        display: 'inline-block',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}`,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize,
        letterSpacing: '0.15em',
        padding: '0.15rem 0.5rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  )
}

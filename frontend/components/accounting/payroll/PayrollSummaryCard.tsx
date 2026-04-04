interface PayrollSummaryCardProps {
  label: string
  value: string
  subtext?: string
  accentColor?: string
}

export function PayrollSummaryCard({ label, value, subtext, accentColor = '#CC1F1F' }: PayrollSummaryCardProps) {
  return (
    <div
      data-testid={`payroll-summary-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        background: '#111111',
        borderLeft: `4px solid ${accentColor}`,
        padding: '1.25rem 1.5rem',
        flex: 1,
        minWidth: 0,
        position: 'relative',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = '0 0 16px rgba(204,31,31,0.25)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6rem',
          color: '#888888',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.8rem',
          color: '#FFFFFF',
          lineHeight: 1,
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </div>
      {subtext && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.58rem',
            color: accentColor,
            marginTop: '0.35rem',
            letterSpacing: '0.05em',
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  )
}

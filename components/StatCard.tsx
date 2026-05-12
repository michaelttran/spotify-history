'use client'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`stat-card${accent ? ' accent' : ''}`}>
      <p style={{
        fontSize: '0.6rem',
        letterSpacing: '0.2em',
        color: accent ? 'var(--accent)' : 'var(--muted2)',
        fontFamily: 'DM Mono, monospace',
        textTransform: 'uppercase',
        marginBottom: '0.875rem',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '2.1rem',
        fontWeight: 600,
        color: 'var(--text)',
        letterSpacing: '-0.025em',
        lineHeight: 1,
        marginBottom: '0.5rem',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: '0.7rem',
          color: 'var(--muted2)',
          fontFamily: 'DM Mono, monospace',
          marginTop: 4,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

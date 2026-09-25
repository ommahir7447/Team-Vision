export function Badge({ status }) {
  const map = {
    Present: 'badge-present', present: 'badge-present',
    Absent:  'badge-absent',  absent:  'badge-absent',
    Flagged: 'badge-flagged', flagged: 'badge-flagged',
    Auto:    'badge-auto',
    Manual:  'badge-manual',
    Satisfactory:    'badge-present',
    'Needs Attention':'badge-absent',
    Good:     'badge-present',
    Warning:  'badge-flagged',
    Critical: 'badge-absent',
  }
  return <span className={`badge ${map[status] || 'badge-manual'}`}>{status}</span>
}

export function ConfidenceCell({ score }) {
  if (score === null || score === undefined) return <span style={{ color: 'var(--color-text-disabled)', fontSize: '12px' }}>—</span>
  const pct = Math.round(score * 100)
  const cls = pct >= 85 ? 'high' : pct >= 70 ? 'medium' : 'low'
  return (
    <div className="confidence-cell">
      <span className={`confidence-pct ${cls}`}>{pct}%</span>
      <div className="confidence-bar-track">
        <div className={`confidence-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ProgressBar({ pct }) {
  const cls = pct >= 80 ? 'high' : pct >= 75 ? 'medium' : 'low'
  return (
    <div className="progress-track">
      <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="loading-state">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-row ${i % 2 === 1 ? 'w-60' : ''}`} />
      ))}
    </div>
  )
}

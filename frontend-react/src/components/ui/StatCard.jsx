export default function StatCard({ value, label, icon, variant = '', delta = '' }) {
  return (
    <div className={`stat-card ${variant}`}>
      {icon && <div className={`stat-icon ${variant}`}>{icon}</div>}
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {delta && <div className={`stat-delta ${delta.startsWith('+') ? 'up' : 'down'}`}>{delta}</div>}
    </div>
  )
}

export function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function confidenceClass(pct) {
  if (pct >= 85) return 'high'
  if (pct >= 70) return 'medium'
  return 'low'
}

export function attendanceClass(pct) {
  if (pct >= 80) return 'high'
  if (pct >= 75) return 'medium'
  return 'low'
}

export function todayString() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

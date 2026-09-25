import { initials as getInitials } from '../../utils'

export default function Avatar({ name, photoUrl, size = 'md', className = '' }) {
  const text = getInitials(name || '')
  const sizeClass = `avatar-${size}`

  if (photoUrl) {
    return (
      <div className={`avatar ${sizeClass} ${className}`}>
        <img src={photoUrl} alt={name} />
      </div>
    )
  }

  return (
    <div className={`avatar ${sizeClass} ${className}`}>
      {text}
    </div>
  )
}

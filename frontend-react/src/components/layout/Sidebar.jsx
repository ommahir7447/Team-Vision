import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'

export default function Sidebar({ navItems = [], activeItem, onNavigate, userName, userSub, photoUrl, userInitials }) {
  const { logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  function handleLogout() {
    showToast('Logging out...')
    setTimeout(() => {
      logout()
      navigate('/')
    }, 800)
  }

  return (
    <aside className="sidebar" id="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">SmartAttend</div>
          <div className="sidebar-brand-sub">Smart Attendance</div>
        </div>
      </div>

      {/* Profile */}
      <div className="sidebar-profile">
        <div className="sidebar-avatar">
          {photoUrl
            ? <img src={photoUrl} alt={userName} />
            : <span>{userInitials || '?'}</span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="sidebar-user-name">{userName || 'User'}</div>
          <div className="sidebar-user-sub">{userSub || ''}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => (
          item.type === 'label'
            ? <div key={idx} className="sidebar-section-label">{item.label}</div>
            : (
              <button
                key={item.id}
                className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={activeItem === item.id ? 'page' : undefined}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </button>
            )
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-item" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}

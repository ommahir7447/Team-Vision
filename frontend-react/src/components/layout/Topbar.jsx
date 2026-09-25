import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useNavigate } from 'react-router-dom'
import { todayString } from '../../utils'

export default function Topbar({ title, userInitials, photoUrl, onMenuClick, notifCount = 0 }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  function handleLogout(e) {
    e.preventDefault()
    setDropdownOpen(false)
    showToast('Logging out...')
    setTimeout(() => { logout(); navigate('/') }, 800)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onMenuClick && (
          <button className="topbar-btn sidebar-toggle" onClick={onMenuClick} aria-label="Toggle menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-date">{todayString()}</div>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notifications */}
        <div className="dropdown-wrapper">
          <button className="topbar-btn" onClick={() => setNotifOpen(o => !o)} aria-label="Notifications">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && <span className="notif-dot" />}
          </button>
          {notifOpen && (
            <div className="dropdown-menu" style={{ width: 300, padding: '12px 0' }}>
              <div style={{ padding: '0 16px 10px', fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-light)', marginBottom: 8 }}>Notifications</div>
              <div className="notif-list" style={{ padding: '0 12px', maxHeight: 280, overflowY: 'auto' }}>
                <div className="notif-item unread">
                  <div className="notif-icon alert">🔔</div>
                  <div className="notif-content">
                    <div className="notif-item-title">Attendance Alert</div>
                    <div className="notif-desc">Your attendance in Cybersecurity is below 75%.</div>
                    <div className="notif-time">2 hours ago</div>
                  </div>
                </div>
                <div className="notif-item">
                  <div className="notif-icon success">✓</div>
                  <div className="notif-content">
                    <div className="notif-item-title">Appeal Approved</div>
                    <div className="notif-desc">Your attendance appeal for 20 Aug has been approved.</div>
                    <div className="notif-time">Yesterday</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 16px 0', borderTop: '1px solid var(--color-border-light)', marginTop: 8 }}>
                <button className="btn btn-outline" style={{ width: '100%', fontSize: 12 }} onClick={() => setNotifOpen(false)}>Mark all read</button>
              </div>
            </div>
          )}
        </div>

        {/* Account dropdown */}
        <div className="dropdown-wrapper">
          <button
            className="avatar avatar-md"
            onClick={() => setDropdownOpen(o => !o)}
            aria-label="Account menu"
          >
            {photoUrl
              ? <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : (userInitials || '?')
            }
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {(dropdownOpen || notifOpen) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => { setDropdownOpen(false); setNotifOpen(false) }}
        />
      )}
    </header>
  )
}

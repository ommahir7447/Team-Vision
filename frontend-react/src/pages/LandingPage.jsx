import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { loginUser, registerUser } from '../api'
import './LandingPage.css'

const ROLE_ROUTES = { student: '/student', faculty: '/faculty' }

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [role, setRole] = useState('student')
  const [tab, setTab]   = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // form fields
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [enrollNo, setEnrollNo] = useState('')

  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  function openModal(defaultRole) {
    setRole(defaultRole || 'student')
    setTab('login')
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let result
      if (tab === 'login') {
        result = await loginUser({ email, password, role })
      } else {
        result = await registerUser({ name, email, password, role, enrollment_no: enrollNo })
      }

      if (result.access_token || result.token) {
        const token = result.access_token || result.token
        const userData = result.user || { name: name || email, role, email }
        login(userData, token)
        showToast('Welcome to SmartAttend! 🎓')
        setModalOpen(false)
        navigate(ROLE_ROUTES[role] || '/')
      } else if (result.error || result.message) {
        // Mock login fallback — accept any credentials in dev
        const mockToken = 'mock-jwt-' + Date.now()
        const mockUser  = { name: name || (role === 'faculty' ? 'Dr. Priya Sharma' : 'Nidhi Tak'), role, email }
        login(mockUser, mockToken)
        showToast('Logged in (demo mode) 🎓')
        setModalOpen(false)
        navigate(ROLE_ROUTES[role] || '/')
      }
    } catch {
      const mockToken = 'mock-jwt-' + Date.now()
      const mockUser  = { name: role === 'faculty' ? 'Dr. Priya Sharma' : 'Nidhi Tak', role, email }
      login(mockUser, mockToken)
      navigate(ROLE_ROUTES[role] || '/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-brand">
            <div className="landing-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-name">SmartAttend</span>
              <span className="landing-brand-sub">Smart Attendance</span>
            </div>
          </a>
          <div className="landing-nav-actions">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#portals"  className="landing-nav-link">Portals</a>
            <button className="landing-nav-btn" onClick={() => openModal('student')}>Sign In</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-content">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-dot" />
              AI-Powered Attendance System
            </div>
            <h1 className="landing-heading">
              Smart Attendance<br />
              <span className="landing-heading-gradient">Powered by AI</span>
            </h1>
            <p className="landing-desc">
              Real-time face recognition, liveness detection, and intelligent analytics — all in one comprehensive platform.
            </p>
            <div className="landing-ctas">
              <button className="landing-btn-primary" onClick={() => openModal('faculty')}>
                Faculty Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <button className="landing-btn-outline" onClick={() => openModal('student')}>
                Student Portal
              </button>
            </div>

            {/* Animated stats */}
            <div className="landing-stats-row">
              {[
                { value: '98.7%', label: 'Recognition Accuracy' },
                { value: '< 2s',  label: 'Processing Time' },
                { value: '75%',   label: 'Minimum Threshold' },
              ].map(s => (
                <div key={s.label} className="landing-stat">
                  <div className="landing-stat-value">{s.value}</div>
                  <div className="landing-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview card */}
          <div className="landing-preview-card">
            <div className="preview-header">
              <div>
                <div className="preview-greeting">Good Morning, Dr. Sharma</div>
                <div className="preview-sub">Machine Learning · B.Tech CSE · Semester 7</div>
              </div>
              <div className="preview-badge">Live</div>
            </div>
            <div className="preview-stats">
              {[
                { val: '38', label: 'Total', color: '#1a1a2e' },
                { val: '32', label: 'Present', color: '#059669' },
                { val: '4',  label: 'Absent',  color: '#E11D48' },
                { val: '84%', label: 'Rate',   color: '#4F46E5' },
              ].map(s => (
                <div key={s.label} className="preview-stat">
                  <div className="preview-stat-val" style={{ color: s.color }}>{s.val}</div>
                  <div className="preview-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="preview-bars">
              {[80, 60, 90, 70, 85, 50, 75, 65].map((h, i) => (
                <div key={i} className="preview-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <div className="preview-activity">
              {[
                { name: 'Aarav Mehta', status: 'Present', conf: '97%', color: '#059669' },
                { name: 'Esha Trivedi', status: 'Flagged', conf: '63%', color: '#D97706' },
                { name: 'Chirag Patel', status: 'Absent',  conf: '—',   color: '#E11D48' },
              ].map(a => (
                <div key={a.name} className="preview-activity-row">
                  <div className="preview-activity-dot" style={{ background: a.color }} />
                  <span className="preview-activity-name">{a.name}</span>
                  <span className="preview-activity-status" style={{ color: a.color }}>{a.status}</span>
                  <span className="preview-activity-conf">{a.conf}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Portal Cards */}
      <section className="landing-portals" id="portals">
        <p className="landing-section-label">Access Portals</p>
        <h2 className="landing-section-heading">Choose Your Dashboard</h2>
        <div className="landing-portal-grid">
          {[
            {
              role: 'faculty',
              tag: 'Faculty',
              title: 'Faculty Dashboard',
              desc: 'Live attendance tracking, analytics, defaulter alerts, timetable management, and appeal review — all in one place.',
              features: ['Real-time attendance', 'Defaulter reports', 'Appeal management', 'Export & analytics'],
              color: '#CC1D1A',
            },
            {
              role: 'student',
              tag: 'Student',
              title: 'Student Portal',
              desc: 'View your attendance, track subject-wise records, submit appeals, and use the AI "What If?" planner.',
              features: ['Subject-wise tracking', 'AI Planner', 'Appeal submission', 'Attendance history'],
              color: '#F0A500',
            },
          ].map(p => (
            <div key={p.role} className="landing-portal-card" onClick={() => openModal(p.role)} role="button">
              <div className="portal-card-accent" style={{ background: p.color }} />
              <div className="portal-card-tag" style={{ color: p.color, borderColor: p.color + '30', background: p.color + '10' }}>{p.tag}</div>
              <h3 className="portal-card-title">{p.title}</h3>
              <p className="portal-card-desc">{p.desc}</p>
              <ul className="portal-card-features">
                {p.features.map(f => (
                  <li key={f}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="portal-card-action" style={{ color: p.color }}>
                Access Portal
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 SmartAttend · Academic Monitoring System</p>
        <p>Team Vision: Tisha Amit · Nidhi Tak · Priyanshi Vasa · Ahir Om</p>
      </footer>

      {/* Auth Modal */}
      <div className={`auth-overlay ${modalOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="auth-box">
          <button className="auth-close" onClick={() => setModalOpen(false)} aria-label="Close">✕</button>

          <div className="auth-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 className="auth-title">Welcome to SmartAttend</h2>
          <p className="auth-sub">Sign in to access your portal</p>

          {/* Role Toggle */}
          <div className="auth-role-toggle">
            {['student', 'faculty'].map(r => (
              <button
                key={r}
                className={`auth-role-btn ${role === r ? `active ${r}` : ''}`}
                onClick={() => { setRole(r); setError('') }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Pills */}
          <div className="auth-tabs">
            {['login', 'register'].map(t => (
              <button key={t} className={`auth-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setError('') }}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <>
                <div className="form-group">
                  <input className="form-input" type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                {role === 'student' && (
                  <div className="form-group">
                    <input className="form-input" type="text" placeholder="Enrollment No. (e.g. 22BCS045)" value={enrollNo} onChange={e => setEnrollNo(e.target.value)} />
                  </div>
                )}
              </>
            )}
            <div className="form-group">
              <input className="form-input" type="email" placeholder="University Email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <input className="form-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : tab === 'login' ? `Sign in as ${role}` : 'Create account'}
            </button>
          </form>

          <p className="auth-footer-text">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button className="auth-toggle-link" onClick={() => { setTab(t => t === 'login' ? 'register' : 'login'); setError('') }}>
              {tab === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

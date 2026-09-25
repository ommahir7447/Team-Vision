import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../../components/layout/Sidebar'
import Topbar from '../../components/layout/Topbar'
import StatCard from '../../components/ui/StatCard'
import { Badge, ConfidenceCell, ProgressBar, Skeleton } from '../../components/ui/Badge'
import { StudentTrendChart, SubjectBarChart } from '../../components/charts/Charts'
import { formatDate } from '../../utils'
import {
  getStudentProfile, getStudentProfileFull, getStudentSummary,
  getStudentSubjects, getAttendanceHistory, getStudentTrend,
  submitPlannerQuery,
} from '../../api'
import './StudentPortal.css'

const VIEW_TITLES = {
  dashboard: 'Student Dashboard', attendance: 'Attendance Overview',
  subjects: 'My Subjects', history: 'Attendance History', profile: 'Student Profile',
}

const NAV_ITEMS = [
  { type: 'label', label: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'attendance', label: 'Attendance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { id: 'subjects', label: 'My Subjects', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { type: 'label', label: 'Records' },
  { id: 'history', label: 'History', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id: 'profile', label: 'Profile', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]

export default function StudentPortal() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [view, setView] = useState('dashboard')
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [trend, setTrend] = useState(null)
  const [history, setHistory] = useState([])
  const [profileFull, setProfileFull] = useState(null)
  const [plannerQuery, setPlannerQuery] = useState('')
  const [plannerResult, setPlannerResult] = useState(null)
  const [plannerLoading, setPlannerLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const [p, s, sub, t] = await Promise.all([
        getStudentProfile(), getStudentSummary(), getStudentSubjects(), getStudentTrend(),
      ])
      setProfile(p); setSummary(s); setSubjects(sub); setTrend(t)
    }
    load()
  }, [])

  useEffect(() => {
    if (view === 'history' && history.length === 0) {
      getAttendanceHistory(50).then(setHistory)
    }
    if (view === 'profile' && !profileFull) {
      getStudentProfileFull().then(setProfileFull)
    }
  }, [view])

  async function handlePlannerSubmit(e) {
    e.preventDefault()
    if (!plannerQuery.trim()) return
    setPlannerLoading(true)
    const result = await submitPlannerQuery(plannerQuery, profile?.student_id)
    setPlannerResult(result)
    setPlannerLoading(false)
  }

  const displayName = profile?.name || user?.name || 'Student'

  return (
    <div className="dashboard-layout">
      <Sidebar
        navItems={NAV_ITEMS}
        activeItem={view}
        onNavigate={setView}
        userName={displayName}
        userSub={profile?.enrollment_no || ''}
        userInitials={profile?.initials || 'ST'}
      />
      <div className="dashboard-main">
        <Topbar title={VIEW_TITLES[view]} userInitials={profile?.initials} notifCount={1} />
        <div className="dashboard-content">

          {/* ── DASHBOARD ── */}
          {view === 'dashboard' && summary && (
            <div className="section-enter">
              {summary.overall_pct < 75 && (
                <div className="risk-alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Attendance is {summary.overall_pct}%. A minimum of 75% is required.
                </div>
              )}
              <div className="stats-grid">
                <StatCard value={summary.total_classes} label="Total Classes" variant="primary" icon="📚" />
                <StatCard value={summary.present} label="Present" variant="success" icon="✅" />
                <StatCard value={summary.absent} label="Absent" variant="danger" icon="❌" />
                <StatCard value={`${summary.overall_pct}%`} label="Overall Rate" variant="warning" icon="📊" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="card">
                  <div className="card-header"><div className="card-title">📈 Attendance Trend</div></div>
                  <StudentTrendChart data={trend} height={200} />
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">📊 Subject-wise</div></div>
                  <SubjectBarChart subjects={subjects} height={200} />
                </div>
              </div>

              {/* AI Planner */}
              <div className="card planner-card">
                <div className="card-header"><div className="card-title">🤖 AI Attendance Planner — "What If?"</div></div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Ask questions like: "Can I skip Friday's DBMS lecture and stay above 75%?"</p>
                <form onSubmit={handlePlannerSubmit} style={{ display: 'flex', gap: 10 }}>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Ask the AI planner..." value={plannerQuery} onChange={e => setPlannerQuery(e.target.value)} />
                  <button className="btn btn-primary" type="submit" disabled={plannerLoading}>{plannerLoading ? '...' : 'Ask AI'}</button>
                </form>
                {plannerResult && (
                  <div className="planner-result">
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: plannerResult.data?.threshold_met ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {plannerResult.data?.threshold_met ? '✅' : '⚠️'} {plannerResult.verdict || 'Result'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{plannerResult.answer?.replace(plannerResult.verdict || '', '')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {view === 'attendance' && summary && (
            <div className="section-enter">
              <div className="stats-grid">
                <StatCard value={summary.total_classes} label="Total" variant="primary" />
                <StatCard value={summary.present} label="Present" variant="success" />
                <StatCard value={summary.absent} label="Absent" variant="danger" />
                <StatCard value={`${summary.overall_pct}%`} label="Rate" variant="warning" />
              </div>
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card-header"><div className="card-title">📚 Subject-wise Attendance</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {subjects.map(sub => {
                    const cls = sub.pct >= 80 ? 'high' : sub.pct >= 75 ? 'medium' : 'low'
                    return (
                      <div key={sub.course_id || sub.code} className="subject-att-row">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{sub.name} <span className="text-muted" style={{ fontWeight: 400 }}>({sub.code})</span></div>
                        </div>
                        <div style={{ width: 120 }}><ProgressBar pct={sub.pct} /></div>
                        <span className={`confidence-pct ${cls}`} style={{ minWidth: 45, textAlign: 'right' }}>{sub.pct}%</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 80, textAlign: 'right' }}>{sub.attended}/{sub.total}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">📈 Trend</div></div>
                <StudentTrendChart data={trend} height={200} />
              </div>
            </div>
          )}

          {/* ── SUBJECTS ── */}
          {view === 'subjects' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📖 Enrolled Subjects</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{subjects.length} subjects</span>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Subject</th><th>Code</th><th>Total</th><th>Attended</th><th>Absent</th><th>Rate</th><th>Status</th></tr></thead>
                    <tbody>
                      {subjects.map(s => (
                        <tr key={s.course_id || s.code}>
                          <td className="td-primary">{s.name}</td>
                          <td className="td-mono">{s.code}</td>
                          <td className="td-mono">{s.total}</td>
                          <td className="td-mono">{s.attended}</td>
                          <td className="td-mono">{s.absent}</td>
                          <td><ConfidenceCell score={s.pct / 100} /></td>
                          <td><Badge status={s.status || (s.pct >= 75 ? 'Satisfactory' : 'Needs Attention')} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {view === 'history' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📋 Attendance History</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{history.length} records</span>
                </div>
                {history.length === 0
                  ? <Skeleton rows={5} />
                  : (
                    <div className="table-container">
                      <table>
                        <thead><tr><th>#</th><th>Date</th><th>Subject</th><th>Code</th><th>Status</th><th>Time</th><th>Verification</th></tr></thead>
                        <tbody>
                          {history.map((r, i) => (
                            <tr key={i}>
                              <td className="td-mono">{i + 1}</td>
                              <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(r.date)}</td>
                              <td className="td-primary">{r.subject}</td>
                              <td className="td-mono">{r.code}</td>
                              <td><Badge status={r.status} /></td>
                              <td style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{r.time}</td>
                              <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.verification}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {view === 'profile' && profileFull && (
            <div className="section-enter">
              <div className="profile-header-card">
                <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: 20 }}>{profile?.initials || 'ST'}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{profileFull.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{profileFull.enrollment_no} · B.Tech {profileFull.branch || 'CSE'} · Sem {profileFull.semester} · Sec {profileFull.section}</div>
                </div>
              </div>
              {[
                {
                  title: '🎓 Academic & Institute Details',
                  fields: [
                    ['Institute Code', profileFull.institute_code], ['Program', profileFull.program],
                    ['Batch', profileFull.batch], ['Semester', `Semester ${profileFull.semester} (Sec ${profileFull.section})`],
                    ['Academic Year', profileFull.academic_year], ['Application No.', profileFull.application_no],
                    ['Admitted Year', profileFull.admitted_year], ['Date of Joining', profileFull.doj],
                  ],
                },
                {
                  title: '👤 Personal Information',
                  fields: [
                    ['Full Name', profileFull.name_10th || profileFull.name], ['Gender', profileFull.gender],
                    ['Date of Birth', profileFull.dob], ['Blood Group', profileFull.blood_group],
                    ['Nationality', profileFull.nationality], ['Category', profileFull.category],
                    ['Religion', profileFull.religion], ['Marital Status', profileFull.marital_status],
                  ],
                },
                {
                  title: '📧 Contact & Credentials',
                  fields: [
                    ['Email', profileFull.email], ['Mobile', profileFull.mobile],
                    ['Aadhaar', profileFull.aadhar], ['Enrollment No.', profileFull.enrollment_no],
                  ],
                },
              ].map(section => (
                <div key={section.title} className="card" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="card-header"><div className="card-title">{section.title}</div></div>
                  <div className="profile-fields-grid">
                    {section.fields.map(([label, value]) => (
                      <div key={label} className="profile-field">
                        <div className="profile-field-label">{label}</div>
                        <div className="profile-field-value">{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!summary && <Skeleton rows={6} />}
        </div>
      </div>
    </div>
  )
}

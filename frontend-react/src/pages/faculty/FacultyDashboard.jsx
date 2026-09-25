import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../../components/layout/Sidebar'
import Topbar from '../../components/layout/Topbar'
import StatCard from '../../components/ui/StatCard'
import { Badge, ConfidenceCell, ProgressBar, Skeleton } from '../../components/ui/Badge'
import { TrendChart, DonutChart, SubjectPerfChart } from '../../components/charts/Charts'
import { initials } from '../../utils'
import {
  getFacultyProfile, getFacultyAnalytics, getFacultyTimetable,
  getFacultySubjects, getFacultyStudents, getFacultyDefaulters,
  getFacultyAppeals, reviewAppeal, getFacultyExportURL,
  getClassAttendanceData, getAttendanceTrend, getRecentActivity,
  getAvailableSubjects, getPrograms, getSemesters, getSections,
} from '../../api'
import './FacultyDashboard.css'

const SECTION_TITLES = {
  dashboard: 'Faculty Dashboard', timetable: 'Weekly Timetable',
  subjects: 'My Subjects', attendance: 'Class Attendance',
  students: 'Student Directory', defaulters: 'Defaulter Report',
  appeals: 'Appeals Management', reports: 'Reports & Export',
}

const NAV_ITEMS = [
  { type: 'label', label: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'timetable', label: 'Timetable', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: 'subjects', label: 'My Subjects', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { type: 'label', label: 'Attendance' },
  { id: 'attendance', label: 'Class Attendance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
  { id: 'students', label: 'Students', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'defaulters', label: 'Defaulters', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { type: 'label', label: 'Management' },
  { id: 'appeals', label: 'Appeals', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: 'reports', label: 'Reports', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
]

export default function FacultyDashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [section, setSection] = useState('dashboard')
  const [faculty, setFaculty] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState({ total: 0, students: [] })
  const [defaulters, setDefaulters] = useState({ count: 0, defaulters: [] })
  const [appeals, setAppeals] = useState({ total: 0, appeals: [] })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Attendance filter state
  const [filterSubject, setFilterSubject] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [classData, setClassData] = useState(null)
  const [classTrend, setClassTrend] = useState(null)
  const [classActivity, setClassActivity] = useState([])

  useEffect(() => {
    async function loadProfile() {
      const f = await getFacultyProfile()
      setFaculty(f)
      setLoading(false)
    }
    loadProfile()
  }, [])

  useEffect(() => {
    loadSectionData(section)
  }, [section])

  async function loadSectionData(sec) {
    switch (sec) {
      case 'dashboard': {
        const [a, t] = await Promise.all([getFacultyAnalytics(), getFacultyTimetable()])
        setAnalytics(a); setTimetable(t)
        break
      }
      case 'timetable': {
        const t = await getFacultyTimetable()
        setTimetable(t)
        break
      }
      case 'subjects': {
        const s = await getFacultySubjects()
        setSubjects(s)
        break
      }
      case 'students': {
        const s = await getFacultyStudents('F001', searchTerm)
        setStudents(s)
        break
      }
      case 'defaulters': {
        const d = await getFacultyDefaulters()
        setDefaulters(d)
        break
      }
      case 'appeals': {
        const a = await getFacultyAppeals()
        setAppeals(a)
        break
      }
    }
  }

  async function loadAttendance() {
    if (!filterSubject || !filterProgram || !filterSemester || !filterSection) return
    const [data, trend, activity] = await Promise.all([
      getClassAttendanceData(filterSubject, filterProgram, filterSemester, filterSection),
      getAttendanceTrend(filterSubject, filterProgram, filterSemester, filterSection),
      getRecentActivity(filterSubject, filterProgram, filterSemester, filterSection),
    ])
    setClassData(data); setClassTrend(trend); setClassActivity(activity)
  }

  useEffect(() => { loadAttendance() }, [filterSection])

  useEffect(() => {
    if (section !== 'students') return
    const t = setTimeout(() => {
      getFacultyStudents('F001', searchTerm).then(setStudents)
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, section])

  async function handleAppealAction(id, action) {
    const result = await reviewAppeal(id, action)
    if (!result.error) {
      showToast(`Appeal ${action.toLowerCase()} successfully`)
      const a = await getFacultyAppeals()
      setAppeals(a)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todaySlots = timetable?.by_day?.[today] || []

  return (
    <div className="dashboard-layout">
      <Sidebar
        navItems={NAV_ITEMS}
        activeItem={section}
        onNavigate={setSection}
        userName={faculty?.name || user?.name || 'Faculty'}
        userSub={faculty?.department || 'Computer Science'}
        userInitials={faculty?.initials || 'FS'}
      />
      <div className="dashboard-main">
        <Topbar
          title={SECTION_TITLES[section]}
          userInitials={faculty?.initials}
        />
        <div className="dashboard-content">

          {/* ── DASHBOARD HOME ── */}
          {section === 'dashboard' && (
            <div className="section-enter">
              <div className="stats-grid">
                <StatCard value={analytics?.total_courses || 0} label="Total Courses" variant="primary" icon="📚" />
                <StatCard value={analytics?.total_enrolled || 0} label="Students" variant="success" icon="👥" />
                <StatCard value={`${analytics?.avg_attendance_rate || 0}%`} label="Avg Attendance" variant="warning" icon="📊" />
                <StatCard value={analytics?.defaulters_count || 0} label="Defaulters" variant="danger" icon="⚠️" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">📈 Subject Performance</div>
                  </div>
                  {analytics?.course_rates?.length > 0
                    ? <SubjectPerfChart courseRates={analytics.course_rates} height={220} />
                    : <div className="empty-state"><div className="empty-state-title">No data yet</div></div>
                  }
                </div>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">📅 Today's Schedule — {today}</div>
                  </div>
                  {todaySlots.length === 0
                    ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-title">No classes today</div><div className="empty-state-desc">Enjoy your day off!</div></div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {todaySlots.map((s, i) => (
                          <div key={i} className="schedule-item">
                            <div className="schedule-time">{s.start_time} – {s.end_time}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.course_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.course_code} · {s.room} · {s.section}</div>
                            </div>
                            <Badge status={s.type || 'Lecture'} />
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── TIMETABLE ── */}
          {section === 'timetable' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📅 Weekly Timetable</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{timetable?.total_classes_per_week || 0} classes/week</span>
                </div>
                <div className="timetable-grid">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => {
                    const slots = timetable?.by_day?.[day] || []
                    const isToday = day === today
                    return (
                      <div key={day} className="timetable-day">
                        <div className={`timetable-day-header ${isToday ? 'today' : ''}`}>{day.slice(0,3)}{isToday ? ' ★' : ''}</div>
                        {slots.length === 0
                          ? <div className="timetable-empty">No classes</div>
                          : slots.map((s, i) => (
                              <div key={i} className="timetable-slot">
                                <div className="timetable-slot-time">{s.start_time} – {s.end_time}</div>
                                <div className="timetable-slot-name">{s.course_name}</div>
                                <div className="timetable-slot-meta">{s.course_code} · {s.room}</div>
                              </div>
                            ))
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── SUBJECTS ── */}
          {section === 'subjects' && (
            <div className="section-enter">
              <div className="subjects-grid">
                {subjects.length === 0
                  ? <div className="empty-state"><div className="empty-state-title">No subjects found</div></div>
                  : subjects.map(s => (
                      <div key={s.course_id || s.code} className="subject-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary-accent)', letterSpacing: '0.5px' }}>{s.code}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{s.name}</div>
                          </div>
                          <Badge status={s.attendance_rate >= 80 ? 'Satisfactory' : s.attendance_rate >= 70 ? 'Warning' : 'Critical'} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>{s.program} · {s.semester} · {s.section}</div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800 }}>{s.enrolled_students}</div><div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Students</div></div>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800 }}>{s.classes_per_week}</div><div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Classes/Wk</div></div>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800 }}>{s.total_classes}</div><div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total</div></div>
                        </div>
                        <ProgressBar pct={s.attendance_rate || 0} />
                        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12, fontWeight: 700, color: s.attendance_rate >= 75 ? 'var(--color-success)' : 'var(--color-danger)' }}>{s.attendance_rate}%</div>
                      </div>
                    ))
                }
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {section === 'attendance' && (
            <div className="section-enter">
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card-header">
                  <div className="card-title">🔍 Filter Class</div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <select className="form-input form-select" style={{ flex: 1, minWidth: 160 }} value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterProgram(''); setFilterSemester(''); setFilterSection(''); setClassData(null) }}>
                    <option value="">— Select Subject —</option>
                    {getAvailableSubjects().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="form-input form-select" style={{ flex: 1, minWidth: 140 }} value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterSemester(''); setFilterSection('') }} disabled={!filterSubject}>
                    <option value="">— Program —</option>
                    {filterSubject && getPrograms(filterSubject).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select className="form-input form-select" style={{ flex: 1, minWidth: 120 }} value={filterSemester} onChange={e => { setFilterSemester(e.target.value); setFilterSection('') }} disabled={!filterProgram}>
                    <option value="">— Semester —</option>
                    {getSemesters().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="form-input form-select" style={{ flex: 1, minWidth: 120 }} value={filterSection} onChange={e => setFilterSection(e.target.value)} disabled={!filterSemester}>
                    <option value="">— Section —</option>
                    {getSections().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {classData && (
                <>
                  <div className="stats-grid">
                    <StatCard value={classData.stats.total} label="Total Students" variant="primary" />
                    <StatCard value={classData.stats.present} label="Present" variant="success" />
                    <StatCard value={classData.stats.absent} label="Absent" variant="danger" />
                    <StatCard value={`${classData.stats.rate}%`} label="Rate" variant="warning" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div className="card">
                      <div className="card-header"><div className="card-title">📈 Attendance Trend</div></div>
                      <TrendChart data={classTrend} height={200} />
                    </div>
                    <div className="card">
                      <div className="card-header"><div className="card-title">📊 Distribution</div></div>
                      <DonutChart present={classData.stats.present} absent={classData.stats.absent} flagged={classData.stats.flagged || 0} height={200} />
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header"><div className="card-title">📋 Student List</div></div>
                    <div className="table-container">
                      <table>
                        <thead><tr><th>#</th><th>ID</th><th>Name</th><th>Status</th><th>Confidence</th><th>Time</th><th>Verification</th></tr></thead>
                        <tbody>
                          {classData.students.map((s, i) => (
                            <tr key={s.id}>
                              <td className="td-mono">{i + 1}</td>
                              <td className="td-mono">{s.id}</td>
                              <td className="td-primary">{s.name}</td>
                              <td><Badge status={s.status} /></td>
                              <td><ConfidenceCell score={s.confidence} /></td>
                              <td style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{s.time}</td>
                              <td>{s.type ? <Badge status={s.type} /> : <span style={{ color: 'var(--color-text-disabled)', fontSize: 11 }}>—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              {!classData && filterSection && <Skeleton rows={4} />}
              {!classData && !filterSection && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">🎯</div><div className="empty-state-title">Select a class to view attendance</div><div className="empty-state-desc">Use the filters above to pick subject, program, semester, and section.</div></div></div>
              )}
            </div>
          )}

          {/* ── STUDENTS ── */}
          {section === 'students' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">👥 Student Directory</div>
                  <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>#</th><th>Enrollment</th><th>Name</th><th>Program</th><th>Semester</th><th>Attendance</th><th>Status</th></tr></thead>
                    <tbody>
                      {students.students.length === 0
                        ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No students found</td></tr>
                        : students.students.map((s, i) => (
                            <tr key={s.student_id || i}>
                              <td className="td-mono">{i + 1}</td>
                              <td className="td-mono">{s.enrollment_no}</td>
                              <td className="td-primary">{s.name}</td>
                              <td>{s.program || '—'}</td>
                              <td>{s.semester || '—'}</td>
                              <td><ConfidenceCell score={(s.attendance_pct || 0) / 100} /></td>
                              <td><Badge status={s.status || (s.attendance_pct >= 75 ? 'Satisfactory' : 'Needs Attention')} /></td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── DEFAULTERS ── */}
          {section === 'defaulters' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">⚠️ Defaulter Report</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{defaulters.count} students below 75%</span>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>#</th><th>Enrollment</th><th>Name</th><th>Course</th><th>Present</th><th>Total</th><th>Rate</th><th>Deficit</th></tr></thead>
                    <tbody>
                      {defaulters.defaulters.length === 0
                        ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: 'var(--color-success)' }}>✓ No defaulters — all students are above 75%</td></tr>
                        : defaulters.defaulters.map((d, i) => (
                            <tr key={d.student_id || i}>
                              <td className="td-mono">{i + 1}</td>
                              <td className="td-mono">{d.enrollment_no}</td>
                              <td className="td-primary">{d.name}</td>
                              <td>{d.course} <span className="text-muted">({d.course_code})</span></td>
                              <td>{d.present}</td>
                              <td>{d.total}</td>
                              <td><Badge status="Absent" /><span style={{ marginLeft: 6, fontWeight: 700, fontSize: 12 }}>{d.pct}%</span></td>
                              <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>-{d.deficit}%</td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── APPEALS ── */}
          {section === 'appeals' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📝 Appeals Management</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{appeals.total} total</span>
                </div>
                {appeals.appeals.length === 0
                  ? <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-title">No appeals</div><div className="empty-state-desc">No student appeals to review.</div></div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {appeals.appeals.map(a => (
                        <div key={a.appeal_id} className="appeal-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{a.student_name} <span className="text-muted" style={{ fontWeight: 400 }}>({a.student_enrollment})</span></span>
                            <Badge status={a.status} />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{a.course_name} ({a.course_code}) · {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</div>
                          <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: 10 }}>"{a.reason}"</div>
                          {a.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-outline" onClick={() => handleAppealAction(a.appeal_id, 'Rejected')}>Reject</button>
                              <button className="btn btn-primary" onClick={() => handleAppealAction(a.appeal_id, 'Approved')}>Approve</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {section === 'reports' && (
            <div className="section-enter">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📥 Export Reports</div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label className="form-label">Course Filter</label>
                    <select className="form-input form-select">
                      <option value="">All Courses</option>
                      {subjects.map(s => <option key={s.course_id} value={s.course_id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={() => { window.open(getFacultyExportURL(), '_blank'); showToast('Downloading report...') }}>Download CSV</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

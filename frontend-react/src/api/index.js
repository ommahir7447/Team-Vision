// api/index.js — SmartAttend API Service Layer
// Identical logic to the original api.js but split into functions usable from React

export const API_BASE = 'http://localhost:5000/api'

export function authHeaders() {
  const token = localStorage.getItem('smartattend_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

const WEEKS = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8']

/* ─── MOCK DATA ─── */
const MOCK_CLASSES = {
  'Machine Learning': {
    'B.Tech CSE': {
      'Semester 7': {
        'Section B': {
          stats: { total: 38, present: 32, absent: 4, flagged: 2, rate: 84.2 },
          trend: { labels: WEEKS, datasets: [{ label: 'Attendance %', data: [88, 85, 82, 80, 84, 81, 83, 84] }] },
          students: [
            { id: '22BCS701', name: 'Aarav Mehta',    status: 'Present', confidence: 0.97, time: '09:02 AM', type: 'Auto' },
            { id: '22BCS702', name: 'Bhavya Shah',    status: 'Present', confidence: 0.91, time: '09:04 AM', type: 'Auto' },
            { id: '22BCS703', name: 'Chirag Patel',   status: 'Absent',  confidence: null,  time: '—',       type: null },
            { id: '22BCS704', name: 'Diya Joshi',     status: 'Present', confidence: 0.88, time: '09:07 AM', type: 'Auto' },
            { id: '22BCS705', name: 'Esha Trivedi',   status: 'Flagged', confidence: 0.63, time: '09:09 AM', type: 'Manual' },
            { id: '22BCS706', name: 'Farhan Khan',    status: 'Present', confidence: 0.95, time: '09:11 AM', type: 'Auto' },
            { id: '22BCS707', name: 'Gauri Desai',    status: 'Present', confidence: 0.82, time: '09:13 AM', type: 'Auto' },
            { id: '22BCS708', name: 'Harsh Gupta',    status: 'Absent',  confidence: null,  time: '—',       type: null },
            { id: '22BCS709', name: 'Isha Nair',      status: 'Present', confidence: 0.93, time: '09:15 AM', type: 'Auto' },
            { id: '22BCS710', name: 'Jay Verma',      status: 'Present', confidence: 0.79, time: '09:18 AM', type: 'Auto' },
          ],
          activity: [
            { name: 'Aarav Mehta',   action: 'marked Present', course: 'Machine Learning', time: '2 min ago', status: 'present' },
            { name: 'Chirag Patel',  action: 'marked Absent (no detection)', course: 'Machine Learning', time: '4 min ago', status: 'absent' },
            { name: 'Esha Trivedi',  action: 'flagged for manual review (63%)', course: 'Machine Learning', time: '6 min ago', status: 'flagged' },
          ],
        },
      },
    },
  },
  'Cloud Computing': {
    'B.Tech CSE': {
      'Semester 5': {
        'Section A': {
          stats: { total: 35, present: 26, absent: 9, flagged: 0, rate: 74.3 },
          trend: { labels: WEEKS, datasets: [{ label: 'Attendance %', data: [75, 72, 70, 68, 65, 63, 67, 69] }] },
          students: [
            { id: '24BCS501', name: 'Aman Singh',   status: 'Present', confidence: 0.90, time: '11:02 AM', type: 'Auto' },
            { id: '24BCS502', name: 'Bhanu Pratap', status: 'Absent',  confidence: null,  time: '—',       type: null },
          ],
          activity: [],
        },
      },
    },
  },
}

export const MOCK_FACULTY = {
  faculty_id: 'F001', name: 'Dr. Priya Sharma',
  department: 'Computer Science & Engineering',
  email: 'p.sharma@smartattend.edu', initials: 'PS',
}

export const MOCK_STUDENT = {
  student_id: 'S045', name: 'Nidhi Tak', enrollment_no: '22BCS045',
  email: 'nidhi.tak@smartattend.edu', program: 'B.Tech Computer Science & Engineering',
  semester: 6, section: 'C', initials: 'NT',
}

export const MOCK_STUDENT_FULL = {
  name: 'NIDHI TAK', enrollment_no: '22BCS045', student_id: 'S045',
  program: 'B.Tech Computer Science & Engineering', branch: 'CSE', semester: 6, section: 'C', initials: 'NT',
  institute_code: 'UIT-001', name_10th: 'NIDHI TAK', dob: '15/08/2004', mobile: '+91 98765 43210',
  email: 'nidhi.tak@smartattend.edu', category: 'General', religion: 'Hindu', batch: '2022–2026',
  application_no: 'APP2022BCS0451', academic_year: '2025–2026', admitted_year: '2022', gender: 'Female',
  doj: '01/08/2022', blood_group: 'B+', nationality: 'Indian', marital_status: 'Single', aadhar: 'XXXX XXXX 1234',
}

export const MOCK_SUMMARY = { overall_pct: 78.4, total_classes: 120, present: 94, absent: 26, flagged: 0 }

export const MOCK_SUBJECTS = [
  { course_id: 'C101', code: 'CS601', name: 'Machine Learning',           total: 42, attended: 37, present: 37, absent: 5,  pct: 88.1, status: 'Satisfactory' },
  { course_id: 'C102', code: 'CS602', name: 'Cloud Computing',            total: 40, attended: 32, present: 32, absent: 8,  pct: 80.0, status: 'Satisfactory' },
  { course_id: 'C103', code: 'CS603', name: 'Cybersecurity',              total: 38, attended: 27, present: 27, absent: 11, pct: 71.1, status: 'Needs Attention' },
  { course_id: 'C104', code: 'CS604', name: 'Database Management Systems',total: 36, attended: 30, present: 30, absent: 6,  pct: 83.3, status: 'Satisfactory' },
]

export const MOCK_HISTORY = [
  { date: '2026-08-20', subject: 'Machine Learning', code: 'CS601', status: 'Present', time: '09:02 AM', verification: 'Face Verified' },
  { date: '2026-08-20', subject: 'Cloud Computing',  code: 'CS602', status: 'Absent',  time: '—',        verification: 'Not Recorded' },
  { date: '2026-08-20', subject: 'Cybersecurity',    code: 'CS603', status: 'Present', time: '02:04 PM', verification: 'Face Verified' },
]

export const MOCK_TREND = { labels: WEEKS, data: [90, 85, 80, 75, 78, 73, 76, 78] }

/* ─── HELPERS ─── */
export function getAvailableSubjects() { return Object.keys(MOCK_CLASSES) }
export function getPrograms(subject)    { return subject && MOCK_CLASSES[subject] ? Object.keys(MOCK_CLASSES[subject]) : ['B.Tech CSE'] }
export function getSemesters()          { return ['Semester 1','Semester 2','Semester 3','Semester 4','Semester 5','Semester 6','Semester 7','Semester 8'] }
export function getSections()           { return ['Section A','Section B','Section C','Section D','Section E'] }

function _getMockClass(sub, prog, sem, sec) {
  return MOCK_CLASSES[sub]?.[prog]?.[sem]?.[sec] || MOCK_CLASSES['Machine Learning']['B.Tech CSE']['Semester 7']['Section B']
}

/* ─── FACULTY APIs ─── */
export async function getFacultyProfile() {
  try {
    const r = await fetch(`${API_BASE}/faculty/profile`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_FACULTY
}

export async function getClassAttendanceData(sub, prog, sem, sec) {
  try {
    const url = `${API_BASE}/attendance/class?subject=${encodeURIComponent(sub||'')}&program=${encodeURIComponent(prog||'')}&semester=${encodeURIComponent(sem||'')}&section=${encodeURIComponent(sec||'')}`
    const r = await fetch(url, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  const d = _getMockClass(sub, prog, sem, sec)
  return { stats: d.stats, students: d.students }
}

export async function getAttendanceTrend(sub, prog, sem, sec) {
  try {
    const url = `${API_BASE}/attendance/class?subject=${encodeURIComponent(sub||'')}`
    const r = await fetch(url, { headers: authHeaders() })
    if (r.ok) { const d = await r.json(); return d.trend }
  } catch {}
  return _getMockClass(sub, prog, sem, sec).trend
}

export async function getRecentActivity(sub, prog, sem, sec) {
  try {
    const url = `${API_BASE}/attendance/class?subject=${encodeURIComponent(sub||'')}`
    const r = await fetch(url, { headers: authHeaders() })
    if (r.ok) { const d = await r.json(); return d.activity }
  } catch {}
  return _getMockClass(sub, prog, sem, sec).activity
}

export async function getFacultyTimetable(fid = 'F001') {
  try {
    const r = await fetch(`${API_BASE}/faculty/timetable?faculty_id=${fid}`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return { slots: [], by_day: {}, total_classes_per_week: 0 }
}

export async function getFacultySubjects(fid = 'F001') {
  try {
    const r = await fetch(`${API_BASE}/faculty/subjects?faculty_id=${fid}`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return []
}

export async function getFacultyStudents(fid = 'F001', search = '', course_id = '') {
  try {
    const url = `${API_BASE}/faculty/students?faculty_id=${fid}&search=${encodeURIComponent(search)}&course_id=${encodeURIComponent(course_id)}`
    const r = await fetch(url, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return { total: 0, students: [] }
}

export async function getFacultyDefaulters(fid = 'F001', threshold = 75) {
  try {
    const r = await fetch(`${API_BASE}/faculty/defaulters?faculty_id=${fid}&threshold=${threshold}`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return { threshold: 75, count: 0, defaulters: [] }
}

export async function getFacultyAppeals(fid = 'F001', status = '') {
  try {
    const url = `${API_BASE}/faculty/appeals?faculty_id=${fid}&status=${encodeURIComponent(status)}`
    const r = await fetch(url, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return { total: 0, appeals: [] }
}

export async function reviewAppeal(aid, action, fid = 'F001') {
  try {
    const r = await fetch(`${API_BASE}/faculty/appeals/${aid}/review?faculty_id=${fid}`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ action }),
    })
    if (r.ok) return r.json()
  } catch {}
  return { error: 'Failed' }
}

export async function getFacultyAnalytics(fid = 'F001') {
  try {
    const r = await fetch(`${API_BASE}/faculty/analytics?faculty_id=${fid}`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return { total_courses: 0, total_enrolled: 0, avg_attendance_rate: 0, defaulters_count: 0, course_rates: [], weekly_trend: { labels: [], data: [] } }
}

export function getFacultyExportURL(fid = 'F001', cid = '') {
  return `${API_BASE}/faculty/reports/export?faculty_id=${fid}&course_id=${encodeURIComponent(cid)}`
}

/* ─── STUDENT APIs ─── */
export async function getStudentProfile() {
  try {
    const r = await fetch(`${API_BASE}/student/profile`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_STUDENT
}

export async function getStudentProfileFull() {
  try {
    const r = await fetch(`${API_BASE}/student/profile/full`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_STUDENT_FULL
}

export async function getStudentSummary() {
  try {
    const r = await fetch(`${API_BASE}/student/summary`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_SUMMARY
}

export async function getStudentSubjects() {
  try {
    const r = await fetch(`${API_BASE}/student/subjects`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_SUBJECTS
}

export async function getAttendanceHistory(limit = 20) {
  try {
    const r = await fetch(`${API_BASE}/student/history?limit=${limit}`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_HISTORY.slice(0, limit)
}

export async function getStudentTrend() {
  try {
    const r = await fetch(`${API_BASE}/student/trend`, { headers: authHeaders() })
    if (r.ok) return r.json()
  } catch {}
  return MOCK_TREND
}

export async function submitPlannerQuery(query, student_id = 'S045') {
  try {
    const r = await fetch(`${API_BASE}/planner/query`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ query, student_id }),
    })
    if (r.ok) return r.json()
  } catch {}
  return { answer: 'AI Planner service unavailable. Please check your connection.' }
}

export async function uploadProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const r = await fetch(`${API_BASE}/student/profile/photo`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ photo_data: e.target.result }),
        })
        const json = await r.json()
        r.ok ? resolve(json) : reject(json)
      } catch (err) {
        reject({ error: err.message || 'Upload failed' })
      }
    }
    reader.onerror = () => reject({ error: 'Failed to read file' })
    reader.readAsDataURL(file)
  })
}

export async function removeProfilePhoto() {
  try {
    const r = await fetch(`${API_BASE}/student/profile/photo`, {
      method: 'DELETE', headers: authHeaders(),
    })
    return r.json()
  } catch {}
  return { error: 'Could not connect' }
}

/* ─── AUTH APIs ─── */
export async function loginUser({ email, password, role }) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  })
  return r.json()
}

export async function registerUser({ name, email, password, role, enrollment_no }) {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, enrollment_no }),
  })
  return r.json()
}

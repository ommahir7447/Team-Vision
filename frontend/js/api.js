/**
 * api.js — SmartAttend Data Layer
 * Connects directly to Flask Backend REST APIs (http://localhost:5000/api)
 * with automatic fallback to local mock data if server is offline.
 */

export const API_BASE = 'http://localhost:5000/api';
export const USE_MOCK = false;

/* ── Auth Header Helper ── */
function authHeaders() {
  const token = localStorage.getItem('smartattend_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/* ── TREND LABELS (shared) ── */
const WEEKS = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'];

/*
MOCK CLASS REGISTRY (Fallback Data)
*/
const MOCK_CLASSES = {
  'Machine Learning': {
    'B.Tech CSE': {
      'Semester 7': {
        'Section B': {
          stats: { total: 38, present: 32, absent: 4, flagged: 2, rate: 84.2 },
          trend: { labels: WEEKS, datasets: [{ label: 'Attendance %', data: [88, 85, 82, 80, 84, 81, 83, 84] }] },
          students: [
            { id: '22BCS701', name: 'Aarav Mehta', status: 'Present', confidence: 0.97, time: '09:02 AM', type: 'Auto' },
            { id: '22BCS702', name: 'Bhavya Shah', status: 'Present', confidence: 0.91, time: '09:04 AM', type: 'Auto' },
            { id: '22BCS703', name: 'Chirag Patel', status: 'Absent', confidence: null, time: '—', type: null },
            { id: '22BCS704', name: 'Diya Joshi', status: 'Present', confidence: 0.88, time: '09:07 AM', type: 'Auto' },
            { id: '22BCS705', name: 'Esha Trivedi', status: 'Flagged', confidence: 0.63, time: '09:09 AM', type: 'Manual' },
            { id: '22BCS706', name: 'Farhan Khan', status: 'Present', confidence: 0.95, time: '09:11 AM', type: 'Auto' },
            { id: '22BCS707', name: 'Gauri Desai', status: 'Present', confidence: 0.82, time: '09:13 AM', type: 'Auto' },
            { id: '22BCS708', name: 'Harsh Gupta', status: 'Absent', confidence: null, time: '—', type: null },
            { id: '22BCS709', name: 'Isha Nair', status: 'Present', confidence: 0.93, time: '09:15 AM', type: 'Auto' },
            { id: '22BCS710', name: 'Jay Verma', status: 'Present', confidence: 0.79, time: '09:18 AM', type: 'Auto' },
            { id: '22BCS711', name: 'Kriti Agrawal', status: 'Present', confidence: 0.96, time: '09:20 AM', type: 'Auto' },
            { id: '22BCS712', name: 'Laksh Solanki', status: 'Absent', confidence: null, time: '—', type: null },
            { id: '22BCS713', name: 'Mira Jain', status: 'Present', confidence: 0.84, time: '09:22 AM', type: 'Auto' },
            { id: '22BCS714', name: 'Nikhil Rao', status: 'Present', confidence: 0.90, time: '09:25 AM', type: 'Auto' },
          ],
          activity: [
            { name: 'Aarav Mehta', action: 'marked Present', course: 'Machine Learning', time: '2 min ago', status: 'present' },
            { name: 'Chirag Patel', action: 'marked Absent (no detection)', course: 'Machine Learning', time: '4 min ago', status: 'absent' },
            { name: 'Esha Trivedi', action: 'flagged for manual review (63%)', course: 'Machine Learning', time: '6 min ago', status: 'flagged' },
            { name: 'Diya Joshi', action: 'marked Present', course: 'Machine Learning', time: '8 min ago', status: 'present' },
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
            { id: '24BCS501', name: 'Aman Singh', status: 'Present', confidence: 0.90, time: '11:02 AM', type: 'Auto' },
            { id: '24BCS502', name: 'Bhanu Pratap', status: 'Absent', confidence: null, time: '—', type: null },
          ],
          activity: []
        }
      }
    }
  }
};

const MOCK_FACULTY = {
  faculty_id: 'F001',
  name: 'Dr. Priya Sharma',
  department: 'Computer Science & Engineering',
  email: 'p.sharma@karnavati.edu',
  initials: 'PS',
};

const MOCK_STUDENT = {
  student_id: 'S045', name: 'Nidhi Tak', enrollment_no: '22BCS045',
  email: 'nidhi.tak@karnavati.edu', program: 'B.Tech Computer Science & Engineering',
  semester: 6, section: 'C', initials: 'NT',
};

const MOCK_STUDENT_PROFILE_FULL = {
  name: 'NIDHI TAK', enrollment_no: '22BCS045', student_id: 'S045',
  program: 'B.Tech Computer Science & Engineering', branch: 'CSE', semester: 6, section: 'C', initials: 'NT',
  institute_code: 'KU-UIT-001', name_10th: 'NIDHI TAK', dob: '15/08/2004', mobile: '+91 98765 43210',
  email: 'nidhi.tak@karnavati.edu', category: 'General', religion: 'Hindu', batch: '2022–2026',
  application_no: 'KU2022BCS0451', academic_year: '2025–2026', admitted_year: '2022', gender: 'Female',
  doj: '01/08/2022', blood_group: 'B+', nationality: 'Indian', marital_status: 'Single', aadhar: 'XXXX XXXX 1234'
};

const MOCK_STUDENT_SUMMARY = { overall_pct: 78.4, total_classes: 120, present: 94, absent: 26, flagged: 0 };
const MOCK_SUBJECTS = [
  { course_id: 'C101', code: 'CS601', name: 'Machine Learning', total: 42, attended: 37, present: 37, absent: 5, pct: 88.1, status: 'Satisfactory' },
  { course_id: 'C102', code: 'CS602', name: 'Cloud Computing', total: 40, attended: 32, present: 32, absent: 8, pct: 80.0, status: 'Satisfactory' },
  { course_id: 'C103', code: 'CS603', name: 'Cybersecurity', total: 38, attended: 27, present: 27, absent: 11, pct: 71.1, status: 'Needs Attention' },
  { course_id: 'C104', code: 'CS604', name: 'Database Management Systems', total: 36, attended: 30, present: 30, absent: 6, pct: 83.3, status: 'Satisfactory' },
];

const MOCK_ATTENDANCE_HISTORY = [
  { date: '2026-08-20', subject: 'Machine Learning', code: 'CS601', status: 'Present', time: '09:02 AM', verification: 'Face Verified' },
  { date: '2026-08-20', subject: 'Cloud Computing', code: 'CS602', status: 'Absent', time: '—', verification: 'Not Recorded' },
  { date: '2026-08-20', subject: 'Cybersecurity', code: 'CS603', status: 'Present', time: '02:04 PM', verification: 'Face Verified' },
];

const MOCK_STUDENT_TREND = { labels: WEEKS, data: [90, 85, 80, 75, 78, 73, 76, 78] };

/* ================================================================
   DROPDOWN HELPERS
   ================================================================ */
export function getAvailableSubjects() {
  return Object.keys(MOCK_CLASSES);
}
export function getPrograms(subject) {
  return subject && MOCK_CLASSES[subject] ? Object.keys(MOCK_CLASSES[subject]) : ['B.Tech CSE'];
}
export function getSemesters(subject, program) {
  return ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
}
export function getSections(subject, program, semester) {
  return ['Section A', 'Section B', 'Section C', 'Section D', 'Section E'];
}

function _getOrCreateClassData(subject, program, semester, section) {
  const existing = MOCK_CLASSES[subject]?.[program]?.[semester]?.[section];
  if (existing) return existing;
  return MOCK_CLASSES['Machine Learning']['B.Tech CSE']['Semester 7']['Section B'];
}

/* ================================================================
   FACULTY ASYNC APIS (LIVE FETCH WITH FALLBACK)
   ================================================================ */
export async function getFacultyProfile() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/faculty/profile`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend server unreachable, falling back to mock profile data.');
    }
  }
  return MOCK_FACULTY;
}

export async function getClassAttendanceData(subject, program, semester, section) {
  if (!USE_MOCK) {
    try {
      const url = `${API_BASE}/attendance/class?subject=${encodeURIComponent(subject || '')}&program=${encodeURIComponent(program || '')}&semester=${encodeURIComponent(semester || '')}&section=${encodeURIComponent(section || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return { stats: data.stats, students: data.students };
      }
    } catch (e) {
      console.warn('Backend server unreachable, falling back to mock class data.');
    }
  }
  const data = _getOrCreateClassData(subject, program, semester, section);
  return { stats: data.stats, students: data.students };
}

export async function getAttendanceTrend(subject, program, semester, section) {
  if (!USE_MOCK) {
    try {
      const url = `${API_BASE}/attendance/class?subject=${encodeURIComponent(subject || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.trend;
      }
    } catch (e) { }
  }
  const data = _getOrCreateClassData(subject, program, semester, section);
  return data.trend;
}

export async function getRecentActivity(subject, program, semester, section) {
  if (!USE_MOCK) {
    try {
      const url = `${API_BASE}/attendance/class?subject=${encodeURIComponent(subject || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.activity;
      }
    } catch (e) { }
  }
  const data = _getOrCreateClassData(subject, program, semester, section);
  return data.activity;
}

/* ================================================================
   STUDENT PORTAL ASYNC APIS (LIVE FETCH WITH FALLBACK)
   ================================================================ */
export async function getStudentProfile() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/student/profile`, { headers: authHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { }
  }
  return MOCK_STUDENT;
}

export async function getStudentProfileFull() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/student/profile/full`, { headers: authHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { }
  }
  return MOCK_STUDENT_PROFILE_FULL;
}

export async function getStudentAttendanceSummary() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/student/summary`, { headers: authHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { }
  }
  return MOCK_STUDENT_SUMMARY;
}

export async function getSubjectWiseAttendance() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/student/subjects`, { headers: authHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { }
  }
  return MOCK_SUBJECTS;
}

export async function getStudentSubjects() {
  return getSubjectWiseAttendance();
}

export async function getAttendanceHistory(limit = 20) {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/student/history?limit=${limit}`, { headers: authHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { }
  }
  return MOCK_ATTENDANCE_HISTORY.slice(0, limit);
}

export async function getFullAttendanceHistory(filters = {}) {
  return getAttendanceHistory(50);
}

export async function getStudentTrend() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/student/trend`, { headers: authHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { }
  }
  return MOCK_STUDENT_TREND;
}

export async function submitPlannerQuery(query, student_id = 'S045') {
  try {
    const res = await fetch(`${API_BASE}/planner/query`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ query, student_id })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.error('Planner API error:', e);
  }
  return { answer: 'AI Planner service unavailable.' };
}

/**
 * Upload a new profile photo for the currently logged-in student.
 * Accepts a File object (from <input type="file">) and sends it as
 * a Base64 data URI in a JSON body.
 * @param {File} file - The image file to upload.
 * @returns {Promise<{profile_picture: string}|{error: string}>}
 */
export async function uploadProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoData = e.target.result; // data:image/...;base64,...
      try {
        const res = await fetch(`${API_BASE}/student/profile/photo`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ photo_data: photoData }),
        });
        const json = await res.json();
        if (res.ok) resolve(json);
        else reject(json);
      } catch (err) {
        reject({ error: err.message || 'Upload failed' });
      }
    };
    reader.onerror = () => reject({ error: 'Failed to read file' });
    reader.readAsDataURL(file);
  });
}

/**
 * Remove the current profile photo for the logged-in student.
 * @returns {Promise<{message: string}|{error: string}>}
 */
export async function removeProfilePhoto() {
  try {
    const token = localStorage.getItem('smartattend_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/student/profile/photo`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch (e) {
    console.error('Remove photo error:', e);
    return { error: 'Could not connect to server' };
  }
}

/* ================================================================
   ENHANCED FACULTY APIs
   ================================================================ */
export async function getFacultyTimetable(faculty_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/faculty/timetable?faculty_id=${faculty_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { slots: [], by_day: {}, total_classes_per_week: 0 };
}

export async function getFacultySubjects(faculty_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/faculty/subjects?faculty_id=${faculty_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

export async function getFacultyClassWeeks(faculty_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/faculty/class-weeks?faculty_id=${faculty_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total_per_week: 0, breakdown: {} };
}

export async function getFacultyStudents(faculty_id = 'F001', search = '', course_id = '') {
  try {
    const url = `${API_BASE}/faculty/students?faculty_id=${faculty_id}&search=${encodeURIComponent(search)}&course_id=${encodeURIComponent(course_id)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total: 0, students: [] };
}

export async function getFacultyStudentDetail(student_id) {
  try {
    const res = await fetch(`${API_BASE}/faculty/student/${student_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

export async function getFacultyDefaulters(faculty_id = 'F001', threshold = 75) {
  try {
    const res = await fetch(`${API_BASE}/faculty/defaulters?faculty_id=${faculty_id}&threshold=${threshold}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { threshold: 75, count: 0, defaulters: [] };
}

export async function getFacultyAppeals(faculty_id = 'F001', status = '') {
  try {
    const url = `${API_BASE}/faculty/appeals?faculty_id=${faculty_id}&status=${encodeURIComponent(status)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total: 0, appeals: [] };
}

export async function reviewAppeal(appeal_id, action, faculty_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/faculty/appeals/${appeal_id}/review?faculty_id=${faculty_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { error: 'Failed to review appeal' };
}

export async function getFacultyAnalytics(faculty_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/faculty/analytics?faculty_id=${faculty_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total_enrolled: 0, avg_attendance_rate: 0, defaulters_count: 0, course_rates: [], weekly_trend: { labels: [], data: [] } };
}

export function getFacultyExportURL(faculty_id = 'F001', course_id = '') {
  return `${API_BASE}/faculty/reports/export?faculty_id=${faculty_id}&course_id=${encodeURIComponent(course_id)}`;
}

/* ================================================================
   MENTOR DASHBOARD APIs
   ================================================================ */
export async function getMentorProfile(mentor_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/mentor/profile?mentor_id=${mentor_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { mentor_id: 'F001', name: 'Dr. Priya Sharma', department: 'CSE', initials: 'PS', total_mentees: 0 };
}

export async function getMentees(mentor_id = 'F001', search = '') {
  try {
    const url = `${API_BASE}/mentor/mentees?mentor_id=${mentor_id}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total: 0, mentees: [] };
}

export async function getMenteeDetail(student_id, mentor_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/mentor/mentee/${student_id}?mentor_id=${mentor_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

export async function getMenteeAttendance(student_id, mentor_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/mentor/mentee/${student_id}/attendance?mentor_id=${mentor_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { student_id, overall_pct: 0, subjects: [] };
}

export async function getMenteeHistory(student_id, mentor_id = 'F001', limit = 30) {
  try {
    const res = await fetch(`${API_BASE}/mentor/mentee/${student_id}/history?mentor_id=${mentor_id}&limit=${limit}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

export async function getMentorAnalytics(mentor_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/mentor/analytics?mentor_id=${mentor_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total_mentees: 0, avg_attendance: 0, at_risk_count: 0, satisfactory_count: 0, mentee_rates: [] };
}

export async function getMentorAlerts(mentor_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/mentor/alerts?mentor_id=${mentor_id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { total_alerts: 0, alerts: [] };
}

export async function updateMenteeNotes(student_id, notes, mentor_id = 'F001') {
  try {
    const res = await fetch(`${API_BASE}/mentor/mentee/${student_id}/notes?mentor_id=${mentor_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { error: 'Failed to update notes' };
}


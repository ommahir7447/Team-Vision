/**
 * faculty.js — Enhanced Faculty Dashboard Controller (SPA)
 * Handles section switching, timetable, subjects, student management,
 * defaulters, appeals, reports, plus original attendance filter view.
 */

import {
  getFacultyProfile,
  getClassAttendanceData,
  getAttendanceTrend,
  getRecentActivity,
  getAvailableSubjects,
  getPrograms,
  getSemesters,
  getSections,
  getFacultyTimetable,
  getFacultySubjects,
  getFacultyStudents,
  getFacultyDefaulters,
  getFacultyAppeals,
  reviewAppeal,
  getFacultyAnalytics,
  getFacultyExportURL,
} from './api.js';

import { renderTrendChart, renderDonutChart } from './charts.js';

/* ── Current state ── */
const state = {
  currentSection: 'dashboard',
  facultyId: 'F001',
  subject: '', program: '', semester: '', section: '', date: '',
};

const $ = id => document.getElementById(id);

/* ================================================================
   SPA NAVIGATION
   ================================================================ */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });

  // Quick action cards
  document.querySelectorAll('.quick-action-card[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.goto));
  });
}

function switchSection(section) {
  state.currentSection = section;

  // Toggle active nav
  document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Toggle section visibility
  document.querySelectorAll('.dashboard-section').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active-section');
  });
  const el = $(`section-${section}`);
  if (el) {
    el.style.display = 'block';
    // Trigger animation
    el.classList.remove('active-section');
    void el.offsetWidth;
    el.classList.add('active-section');
  }

  // Update title
  const titles = {
    dashboard: 'Faculty Dashboard', timetable: 'Weekly Timetable',
    subjects: 'My Subjects', attendance: 'Class Attendance',
    students: 'Student Directory', defaulters: 'Defaulter Report',
    appeals: 'Appeals Management', reports: 'Reports & Export',
  };
  const titleEl = $('topbar-title');
  if (titleEl) titleEl.textContent = titles[section] || 'Faculty Dashboard';

  // Load section data
  loadSectionData(section);

  // Close mobile sidebar
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('active');
}

async function loadSectionData(section) {
  switch (section) {
    case 'dashboard':  return loadDashboardHome();
    case 'timetable':  return loadTimetable();
    case 'subjects':   return loadSubjects();
    case 'attendance': return initFilters();
    case 'students':   return loadStudents();
    case 'defaulters': return loadDefaulters();
    case 'appeals':    return loadAppeals();
    case 'reports':    return loadReports();
  }
}

/* ================================================================
   SECTION: Dashboard Home
   ================================================================ */
async function loadDashboardHome() {
  try {
    const analytics = await getFacultyAnalytics(state.facultyId);
    $('dash-total-courses')  && ($('dash-total-courses').textContent = analytics.total_courses || 0);
    $('dash-total-students') && ($('dash-total-students').textContent = analytics.total_enrolled || 0);
    $('dash-avg-rate')       && ($('dash-avg-rate').textContent = `${analytics.avg_attendance_rate || 0}%`);
    $('dash-defaulters')     && ($('dash-defaulters').textContent = analytics.defaulters_count || 0);
    $('defaulter-badge')     && ($('defaulter-badge').textContent = analytics.defaulters_count || 0);

    // Today's schedule
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    $('today-day-label') && ($('today-day-label').textContent = today);
    const tt = await getFacultyTimetable(state.facultyId);
    const todaySlots = (tt.by_day && tt.by_day[today]) || [];
    const scheduleEl = $('today-schedule-list');
    if (scheduleEl) {
      if (todaySlots.length === 0) {
        scheduleEl.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-state-title">No classes today</div><div class="empty-state-desc">Enjoy your day off!</div></div>';
      } else {
        scheduleEl.innerHTML = todaySlots.map(s => `
          <div class="today-schedule-item">
            <div class="today-schedule-time-badge">${s.start_time} – ${s.end_time}</div>
            <div class="today-schedule-info">
              <div class="today-schedule-name">${s.course_name}</div>
              <div class="today-schedule-meta">${s.course_code} · ${s.room} · ${s.section}</div>
            </div>
            <span class="timetable-slot-type ${s.type.toLowerCase()}">${s.type}</span>
          </div>`).join('');
      }
    }

    // Subject performance bar chart
    if (analytics.course_rates?.length) {
      renderSubjectPerfChart(analytics.course_rates);
    }
  } catch (e) {
    console.error('[dashboard] load error:', e);
  }
}

function renderSubjectPerfChart(courseRates) {
  const canvas = $('subject-perf-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Destroy old chart
  if (canvas._chartInstance) canvas._chartInstance.destroy();

  const labels = courseRates.map(c => c.code || c.name.slice(0, 15));
  const data = courseRates.map(c => c.rate);
  const colors = data.map(v => v >= 80 ? '#059669' : v >= 70 ? '#D97706' : '#E11D48');

  canvas._chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Attendance %', data, backgroundColor: colors, borderRadius: 6, barThickness: 28 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ================================================================
   SECTION: Timetable
   ================================================================ */
async function loadTimetable() {
  const grid = $('timetable-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row w-60"></div></div>';

  const data = await getFacultyTimetable(state.facultyId);
  $('tt-total-classes') && ($('tt-total-classes').textContent = `${data.total_classes_per_week} classes/week`);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  grid.innerHTML = days.map(day => {
    const slots = (data.by_day && data.by_day[day]) || [];
    const isToday = day === todayName;
    return `
      <div class="timetable-day-col">
        <div class="timetable-day-header ${isToday ? 'today' : ''}">${day.slice(0, 3)}${isToday ? ' ★' : ''}</div>
        ${slots.length === 0
          ? '<div class="timetable-empty">No classes</div>'
          : slots.map(s => `
            <div class="timetable-slot">
              <div class="timetable-slot-time">${s.start_time} – ${s.end_time}</div>
              <div class="timetable-slot-name">${s.course_name}</div>
              <div class="timetable-slot-meta">${s.course_code} · ${s.room}</div>
              <span class="timetable-slot-type ${s.type.toLowerCase()}">${s.type}</span>
            </div>`).join('')
        }
      </div>`;
  }).join('');
}

/* ================================================================
   SECTION: Subjects
   ================================================================ */
async function loadSubjects() {
  const grid = $('subjects-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div></div>';

  const subjects = await getFacultySubjects(state.facultyId);

  if (!subjects.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">No subjects found</div></div>';
    return;
  }

  grid.innerHTML = subjects.map(s => {
    const statusClass = s.status === 'Good' ? 'good' : s.status === 'Warning' ? 'warn' : 'critical';
    return `
      <div class="subject-card ${statusClass}">
        <div class="subject-card-header">
          <div>
            <div class="subject-card-code">${s.code}</div>
            <div class="subject-card-name">${s.name}</div>
          </div>
          <span class="badge ${s.attendance_rate >= 80 ? 'badge-present' : s.attendance_rate >= 70 ? 'badge-flagged' : 'badge-absent'}">${s.attendance_rate}%</span>
        </div>
        <div style="font-size:12px;color:var(--color-text-muted)">${s.program} · ${s.semester} · ${s.section}</div>
        <div class="subject-card-stats">
          <div class="subject-card-stat">
            <div class="subject-card-stat-value">${s.enrolled_students}</div>
            <div class="subject-card-stat-label">Students</div>
          </div>
          <div class="subject-card-stat">
            <div class="subject-card-stat-value">${s.classes_per_week}</div>
            <div class="subject-card-stat-label">Classes/Wk</div>
          </div>
          <div class="subject-card-stat">
            <div class="subject-card-stat-value">${s.total_classes}</div>
            <div class="subject-card-stat-label">Total Classes</div>
          </div>
        </div>
        <div style="margin-top:12px">
          <div class="progress-track"><div class="progress-fill ${s.attendance_rate >= 80 ? 'high' : s.attendance_rate >= 70 ? 'medium' : 'low'}" style="width:${s.attendance_rate}%"></div></div>
        </div>
      </div>`;
  }).join('');
}

/* ================================================================
   SECTION: Students
   ================================================================ */
let studentSearchTimeout = null;

async function loadStudents(search = '') {
  const tbody = $('students-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted)">Loading...</td></tr>';

  const data = await getFacultyStudents(state.facultyId, search);

  if (!data.students.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted)">No students found</td></tr>';
    return;
  }

  tbody.innerHTML = data.students.map((s, i) => `
    <tr>
      <td class="td-mono">${i + 1}</td>
      <td class="td-mono">${s.enrollment_no}</td>
      <td>
        <div class="flex items-center gap-2">
          <div class="avatar avatar-sm">${initials(s.name)}</div>
          <span class="td-primary">${s.name}</span>
        </div>
      </td>
      <td>${s.program || '—'}</td>
      <td>${s.semester || '—'}</td>
      <td>
        <div class="confidence-cell">
          <span class="confidence-pct ${s.attendance_pct >= 75 ? 'high' : s.attendance_pct >= 60 ? 'medium' : 'low'}">${s.attendance_pct}%</span>
          <div class="confidence-bar-track"><div class="confidence-bar-fill ${s.attendance_pct >= 75 ? 'high' : s.attendance_pct >= 60 ? 'medium' : 'low'}" style="width:${s.attendance_pct}%"></div></div>
        </div>
      </td>
      <td><span class="badge ${s.status === 'Satisfactory' ? 'badge-present' : 'badge-absent'}">${s.status}</span></td>
    </tr>`).join('');
}

function initStudentSearch() {
  const searchEl = $('student-search');
  if (!searchEl) return;
  searchEl.addEventListener('input', () => {
    clearTimeout(studentSearchTimeout);
    studentSearchTimeout = setTimeout(() => loadStudents(searchEl.value), 300);
  });
}

/* ================================================================
   SECTION: Defaulters
   ================================================================ */
async function loadDefaulters() {
  const tbody = $('defaulters-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-text-muted)">Loading...</td></tr>';

  const data = await getFacultyDefaulters(state.facultyId);
  $('defaulter-count-badge') && ($('defaulter-count-badge').textContent = `${data.count} students`);
  $('defaulter-badge')       && ($('defaulter-badge').textContent = data.count);

  if (!data.defaulters.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-success)">✓ No defaulters — all students are above 75%</td></tr>';
    return;
  }

  tbody.innerHTML = data.defaulters.map((d, i) => `
    <tr>
      <td class="td-mono">${i + 1}</td>
      <td class="td-mono">${d.enrollment_no}</td>
      <td class="td-primary">${d.name}</td>
      <td>${d.course} <span class="text-muted">(${d.course_code})</span></td>
      <td>${d.present}</td>
      <td>${d.total}</td>
      <td><span class="badge badge-absent">${d.pct}%</span></td>
      <td style="color:var(--color-danger);font-weight:700">-${d.deficit}%</td>
    </tr>`).join('');
}

/* ================================================================
   SECTION: Appeals
   ================================================================ */
async function loadAppeals(statusFilter = '') {
  const list = $('appeals-list');
  if (!list) return;
  list.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row w-60"></div></div>';

  const data = await getFacultyAppeals(state.facultyId, statusFilter);
  $('appeal-badge') && ($('appeal-badge').textContent = data.total);

  if (!data.appeals.length) {
    list.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No appeals</div><div class="empty-state-desc">No student appeals to review.</div></div>';
    return;
  }

  list.innerHTML = data.appeals.map(a => {
    const statusBadge = a.status === 'Pending' ? 'badge-flagged' : a.status === 'Approved' ? 'badge-present' : 'badge-absent';
    const isPending = a.status === 'Pending';
    return `
      <div class="appeal-card">
        <div class="appeal-card-header">
          <div class="appeal-card-student">${a.student_name} <span style="font-weight:400;color:var(--color-text-muted)">(${a.student_enrollment})</span></div>
          <span class="badge ${statusBadge}">${a.status}</span>
        </div>
        <div class="appeal-card-meta">${a.course_name} (${a.course_code}) · Record: ${a.record_id} · ${a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</div>
        <div class="appeal-card-reason">"${a.reason}"</div>
        ${isPending ? `
        <div class="appeal-card-actions">
          <button class="btn btn-outline" onclick="window._rejectAppeal('${a.appeal_id}')">Reject</button>
          <button class="btn btn-primary" onclick="window._approveAppeal('${a.appeal_id}')">Approve</button>
        </div>` : `<div style="font-size:12px;color:var(--color-text-muted)">Reviewed by ${a.reviewed_by || '—'} on ${a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : '—'}</div>`}
      </div>`;
  }).join('');
}

// Global handlers for appeal buttons
window._approveAppeal = async (id) => {
  const result = await reviewAppeal(id, 'Approved', state.facultyId);
  if (!result.error) { showToast('Appeal approved successfully'); loadAppeals(); }
  else showToast('Failed to approve appeal');
};
window._rejectAppeal = async (id) => {
  const result = await reviewAppeal(id, 'Rejected', state.facultyId);
  if (!result.error) { showToast('Appeal rejected'); loadAppeals(); }
  else showToast('Failed to reject appeal');
};

function initAppealFilter() {
  const filter = $('appeal-status-filter');
  if (filter) filter.addEventListener('change', () => loadAppeals(filter.value));
}

/* ================================================================
   SECTION: Reports
   ================================================================ */
async function loadReports() {
  const select = $('export-course-select');
  if (!select) return;

  const subjects = await getFacultySubjects(state.facultyId);
  select.innerHTML = '<option value="">All Courses</option>' +
    subjects.map(s => `<option value="${s.course_id}">${s.name} (${s.code})</option>`).join('');

  const exportAll = $('export-all-btn');
  if (exportAll) {
    exportAll.onclick = () => {
      window.open(getFacultyExportURL(state.facultyId, ''), '_blank');
      showToast('Downloading full report...');
    };
  }

  const exportCourse = $('export-course-btn');
  if (exportCourse) {
    exportCourse.onclick = () => {
      const cid = select.value;
      window.open(getFacultyExportURL(state.facultyId, cid), '_blank');
      showToast('Downloading report...');
    };
  }
}

/* ================================================================
   SECTION: Attendance (Original filter-based view)
   ================================================================ */
const filterEls = {};

function initFilterEls() {
  filterEls.subject  = $('filter-subject');
  filterEls.program  = $('filter-program');
  filterEls.semester = $('filter-semester');
  filterEls.section  = $('filter-section');
  filterEls.date     = $('filter-date');
  filterEls.context  = $('filter-context-text');
  filterEls.badge    = $('filter-rate-badge');
}

function populateSelect(selectEl, options, placeholder) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = placeholder; opt.disabled = true; opt.selected = true;
    selectEl.appendChild(opt);
  }
  options.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

function disableSelect(selectEl, text) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="" disabled selected>${text}</option>`;
  selectEl.disabled = true;
}

function onSubjectChange() {
  state.subject = filterEls.subject.value; state.program = ''; state.semester = ''; state.section = '';
  populateSelect(filterEls.program, getPrograms(state.subject));
  filterEls.program.disabled = false;
  disableSelect(filterEls.semester, '— Semester —');
  disableSelect(filterEls.section, '— Section —');
  clearAttendanceDashboard();
  const programs = getPrograms(state.subject);
  if (programs.length === 1) { filterEls.program.value = programs[0]; onProgramChange(); }
}

function onProgramChange() {
  state.program = filterEls.program.value; state.semester = ''; state.section = '';
  const semesters = getSemesters(state.subject, state.program);
  populateSelect(filterEls.semester, semesters);
  filterEls.semester.disabled = false;
  disableSelect(filterEls.section, '— Section —');
  clearAttendanceDashboard();
  if (semesters.length === 1) { filterEls.semester.value = semesters[0]; onSemesterChange(); }
}

function onSemesterChange() {
  state.semester = filterEls.semester.value; state.section = '';
  const sections = getSections(state.subject, state.program, state.semester);
  populateSelect(filterEls.section, sections);
  filterEls.section.disabled = false;
  clearAttendanceDashboard();
  if (sections.length === 1) { filterEls.section.value = sections[0]; onSectionChange(); }
}

function onSectionChange() {
  state.section = filterEls.section.value;
  if (state.section) loadAttendanceDashboard();
}

function clearAttendanceDashboard() {
  updateContextLabel();
  $('stat-total')   && ($('stat-total').textContent = '—');
  $('stat-present') && ($('stat-present').textContent = '—');
  $('stat-absent')  && ($('stat-absent').textContent = '—');
  $('stat-rate')    && ($('stat-rate').textContent = '—');
  const tbody = $('attendance-table-body');
  if (tbody) tbody.innerHTML = '';
  showElement('table-empty', true);
  showElement('table-container', false);
}

function updateContextLabel() {
  const { subject, program, semester, section } = state;
  if (!subject) { if (filterEls.context) filterEls.context.textContent = 'Select a class to begin'; return; }
  const parts = [subject, program, semester, section].filter(Boolean);
  if (filterEls.context) filterEls.context.textContent = parts.join(' › ');
}

async function loadAttendanceDashboard() {
  const { subject, program, semester, section } = state;
  if (!subject || !program || !semester || !section) return;
  updateContextLabel();
  await Promise.all([loadStats(), loadAttendanceTable(), loadCharts(), loadActivity()]);
}

async function loadStats() {
  try {
    const { stats } = await getClassAttendanceData(state.subject, state.program, state.semester, state.section);
    $('stat-total')   && ($('stat-total').textContent = stats.total);
    $('stat-present') && ($('stat-present').textContent = stats.present);
    $('stat-absent')  && ($('stat-absent').textContent = stats.absent + (stats.flagged ? ` (+${stats.flagged})` : ''));
    $('stat-rate')    && ($('stat-rate').textContent = `${stats.rate}%`);
    if (filterEls.badge) {
      filterEls.badge.className = 'filter-rate-badge ' + (stats.rate >= 80 ? 'good' : stats.rate >= 70 ? 'warn' : 'bad');
      filterEls.badge.textContent = `${stats.rate}% class avg`;
    }
  } catch (e) { console.error('[faculty] loadStats:', e); }
}

async function loadAttendanceTable() {
  const tbody = $('attendance-table-body');
  if (!tbody) return;
  showElement('table-loading', true); showElement('table-empty', false); showElement('table-container', false);
  try {
    const { students } = await getClassAttendanceData(state.subject, state.program, state.semester, state.section);
    showElement('table-loading', false);
    if (!students?.length) { showElement('table-empty', true); return; }
    showElement('table-container', true);
    tbody.innerHTML = students.map((r, idx) => `
      <tr>
        <td class="td-mono">${idx + 1}</td>
        <td class="td-mono">${r.id}</td>
        <td><div class="flex items-center gap-2"><div class="avatar avatar-sm">${initials(r.name)}</div><span class="td-primary">${r.name}</span></div></td>
        <td>${statusBadge(r.status)}</td>
        <td>${confidenceCell(r.confidence)}</td>
        <td style="font-size:12px;color:var(--color-text-muted);white-space:nowrap">${r.time}</td>
        <td>${verifyBadge(r.type)}</td>
      </tr>`).join('');
  } catch (e) { showElement('table-loading', false); console.error(e); }
}

async function loadCharts() {
  try {
    const trend = await getAttendanceTrend(state.subject, state.program, state.semester, state.section);
    renderTrendChart('trend-chart', trend);
    const { stats } = await getClassAttendanceData(state.subject, state.program, state.semester, state.section);
    renderDonutChart('donut-chart', stats.present, stats.absent, stats.flagged ?? 0);
  } catch (e) { console.error(e); }
}

async function loadActivity() {
  const feed = $('activity-feed');
  if (!feed) return;
  feed.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row w-60"></div></div>';
  try {
    const items = await getRecentActivity(state.subject, state.program, state.semester, state.section);
    if (!items?.length) { feed.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-state-title">No activity</div></div>'; return; }
    feed.innerHTML = items.map(item => `
      <div class="activity-item">
        <div class="activity-dot ${item.status}"></div>
        <div class="activity-content"><div class="activity-name">${item.name}</div><div class="activity-detail">${item.action} · ${item.course}</div></div>
        <div class="activity-time">${item.time}</div>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

let filtersInitialized = false;
function initFilters() {
  initFilterEls();
  if (filtersInitialized) return;
  filtersInitialized = true;

  const subjects = getAvailableSubjects();
  populateSelect(filterEls.subject, subjects, '— Select Subject —');
  filterEls.subject.disabled = false;
  disableSelect(filterEls.program, '— Select Program —');
  disableSelect(filterEls.semester, '— Semester —');
  disableSelect(filterEls.section, '— Section —');
  if (filterEls.date) { filterEls.date.value = new Date().toISOString().split('T')[0]; state.date = filterEls.date.value; }

  filterEls.subject?.addEventListener('change', onSubjectChange);
  filterEls.program?.addEventListener('change', onProgramChange);
  filterEls.semester?.addEventListener('change', onSemesterChange);
  filterEls.section?.addEventListener('change', onSectionChange);
  filterEls.date?.addEventListener('change', () => { state.date = filterEls.date.value; if (state.section) loadAttendanceDashboard(); });

  // Auto-load default
  _autoSelectDefaults('Machine Learning', 'B.Tech CSE', 'Semester 7', 'Section B');
}

function _autoSelectDefaults(sub, prog, sem, sec) {
  filterEls.subject.value = sub; state.subject = sub;
  populateSelect(filterEls.program, getPrograms(sub)); filterEls.program.disabled = false;
  filterEls.program.value = prog; state.program = prog;
  populateSelect(filterEls.semester, getSemesters(sub, prog)); filterEls.semester.disabled = false;
  filterEls.semester.value = sem; state.semester = sem;
  populateSelect(filterEls.section, getSections(sub, prog, sem)); filterEls.section.disabled = false;
  filterEls.section.value = sec; state.section = sec;
  loadAttendanceDashboard();
}

/* ================================================================
   UI HELPERS
   ================================================================ */
function showElement(id, visible) { const el = $(id); if (el) el.style.display = visible ? 'block' : 'none'; }
function initials(name) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function statusBadge(status) {
  const map = { Present:'badge-present', Absent:'badge-absent', Flagged:'badge-flagged' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}
function verifyBadge(type) {
  if (!type) return '<span class="text-muted" style="font-size:11px">—</span>';
  return `<span class="badge ${type === 'Auto' ? 'badge-auto' : 'badge-manual'}">${type}</span>`;
}
function confidenceCell(score) {
  if (score === null || score === undefined) return '<span style="color:var(--color-text-disabled);font-size:12px">—</span>';
  const pct = Math.round(score * 100);
  const cls = pct >= 85 ? 'high' : pct >= 70 ? 'medium' : 'low';
  return `<div class="confidence-cell"><span class="confidence-pct ${cls}">${pct}%</span><div class="confidence-bar-track"><div class="confidence-bar-fill ${cls}" style="width:${pct}%"></div></div></div>`;
}
function showToast(msg) {
  const container = $('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ================================================================
   SIDEBAR, MODALS, DROPDOWNS
   ================================================================ */
function initSidebar() {
  const toggle = $('sidebar-toggle'), sidebar = $('sidebar'), overlay = $('sidebar-overlay');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay?.classList.toggle('active'); });
  }
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay.classList.remove('active'); });

  $('sidebar-logout-btn')?.addEventListener('click', () => { showToast('Logging out...'); setTimeout(() => window.location.href = 'index.html', 800); });
}

function initModals() {
  const avatarBtn = $('faculty-avatar-top'), dropdown = $('account-dropdown');
  const notifBtn = $('notif-btn'), notifModal = $('notif-modal');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('show'); });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
  }

  $('account-logout-item')?.addEventListener('click', e => { e.preventDefault(); showToast('Logging out...'); setTimeout(() => window.location.href = 'index.html', 800); });

  if (notifBtn && notifModal) {
    notifBtn.addEventListener('click', () => { notifModal.classList.add('open'); notifModal.setAttribute('aria-hidden', 'false'); });
  }
  const closeNotif = () => { notifModal?.classList.remove('open'); notifModal?.setAttribute('aria-hidden', 'true'); };
  $('notif-close-btn')?.addEventListener('click', closeNotif);
  $('notif-done-btn')?.addEventListener('click', closeNotif);
  $('notif-read-all-btn')?.addEventListener('click', () => {
    document.querySelectorAll('#notif-list .notif-item').forEach(i => i.classList.remove('unread'));
    $('notif-dot') && ($('notif-dot').style.display = 'none');
    showToast('All notifications marked as read.');
  });
}

/* ════════ Boot ════════ */
async function init() {
  initSidebar();
  initModals();
  initNavigation();
  initStudentSearch();
  initAppealFilter();

  $('header-date') && ($('header-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

  try {
    const faculty = await getFacultyProfile(state.facultyId);
    $('faculty-name')      && ($('faculty-name').textContent = faculty.name);
    $('faculty-dept')      && ($('faculty-dept').textContent = faculty.department);
    $('faculty-avatar')    && ($('faculty-avatar').textContent = faculty.initials);
    $('faculty-avatar-top') && ($('faculty-avatar-top').textContent = faculty.initials);
  } catch (e) {}

  switchSection('dashboard');
}

document.addEventListener('DOMContentLoaded', init);

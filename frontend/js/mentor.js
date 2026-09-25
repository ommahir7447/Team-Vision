/**
 * mentor.js — Mentor Dashboard Controller (SPA)
 * Handles mentee overview, individual student detail, attendance analytics,
 * and at-risk alerts. Access is scoped to assigned students only.
 */

import {
  getMentorProfile,
  getMentees,
  getMenteeDetail,
  getMenteeAttendance,
  getMenteeHistory,
  getMentorAnalytics,
  getMentorAlerts,
  updateMenteeNotes,
} from './api.js';

/* ── State ── */
const state = {
  mentorId: 'F001',
  currentSection: 'overview',
  selectedMentee: null,
};

const $ = id => document.getElementById(id);

/* ================================================================
   SPA NAVIGATION
   ================================================================ */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchSection(item.dataset.section);
    });
  });

  $('back-to-mentees')?.addEventListener('click', e => {
    e.preventDefault();
    switchSection('mentees');
  });
}

function switchSection(section) {
  state.currentSection = section;

  document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (activeNav) activeNav.classList.add('active');

  document.querySelectorAll('.dashboard-section').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active-section');
  });
  const el = $(`section-${section}`);
  if (el) {
    el.style.display = 'block';
    void el.offsetWidth;
    el.classList.add('active-section');
  }

  const titles = {
    overview: 'Mentor Dashboard', mentees: 'My Mentees',
    detail: 'Student Detail', alerts: 'At-Risk Alerts',
  };
  $('topbar-title') && ($('topbar-title').textContent = titles[section] || 'Mentor Dashboard');

  // Show/hide detail nav item
  const detailNav = $('nav-detail');
  if (detailNav) detailNav.style.display = section === 'detail' ? 'flex' : 'none';

  loadSectionData(section);

  // Close mobile sidebar
  $('sidebar')?.classList.remove('open');
  $('sidebar-overlay')?.classList.remove('active');
}

async function loadSectionData(section) {
  switch (section) {
    case 'overview': return loadOverview();
    case 'mentees':  return loadMenteesList();
    case 'detail':   return loadMenteeDetail(state.selectedMentee);
    case 'alerts':   return loadAlerts();
  }
}

/* ================================================================
   SECTION: Overview
   ================================================================ */
async function loadOverview() {
  try {
    const analytics = await getMentorAnalytics(state.mentorId);
    $('ov-total-mentees')  && ($('ov-total-mentees').textContent = analytics.total_mentees || 0);
    $('ov-avg-attendance') && ($('ov-avg-attendance').textContent = `${analytics.avg_attendance || 0}%`);
    $('ov-satisfactory')   && ($('ov-satisfactory').textContent = analytics.satisfactory_count || 0);
    $('ov-at-risk')        && ($('ov-at-risk').textContent = analytics.at_risk_count || 0);
    $('alert-count-badge') && ($('alert-count-badge').textContent = analytics.at_risk_count || 0);

    // Bar chart — mentee rates
    if (analytics.mentee_rates?.length) {
      renderMenteeBarChart(analytics.mentee_rates);
      renderMenteeDonutChart(analytics.satisfactory_count || 0, analytics.at_risk_count || 0);
    }
  } catch (e) {
    console.error('[mentor] overview error:', e);
  }
}

function renderMenteeBarChart(rates) {
  const canvas = $('mentee-bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvas._chart) canvas._chart.destroy();

  const labels = rates.map(r => r.name.split(' ')[0]);
  const data = rates.map(r => r.pct);
  const colors = data.map(v => v >= 75 ? '#059669' : v >= 60 ? '#D97706' : '#E11D48');

  canvas._chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Attendance %', data, backgroundColor: colors, borderRadius: 6, barThickness: 24 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderMenteeDonutChart(satisfactory, atRisk) {
  const canvas = $('mentee-donut-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvas._chart) canvas._chart.destroy();

  canvas._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Satisfactory', 'At Risk'],
      datasets: [{
        data: [satisfactory, atRisk],
        backgroundColor: ['#059669', '#E11D48'],
        borderWidth: 0, spacing: 2, borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12, weight: 600 }, padding: 16, usePointStyle: true, pointStyleWidth: 10 } }
      }
    }
  });
}

/* ================================================================
   SECTION: Mentees List
   ================================================================ */
async function loadMenteesList(search = '') {
  const grid = $('mentees-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row w-60"></div></div>';

  const data = await getMentees(state.mentorId, search);

  if (!data.mentees.length) {
    grid.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-title">No mentees found</div><div class="empty-state-desc">No students are assigned to you.</div></div>';
    return;
  }

  grid.innerHTML = data.mentees.map(m => {
    const statusClass = m.status === 'Satisfactory' ? 'satisfactory' : 'at-risk';
    return `
      <div class="mentee-card ${statusClass}" data-student-id="${m.student_id}" onclick="window._viewMentee('${m.student_id}')">
        <div class="mentee-card-header">
          <div class="mentee-card-avatar">${m.initials || m.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
          <div class="mentee-card-info">
            <div class="mentee-card-name">${m.name}</div>
            <div class="mentee-card-enrollment">${m.enrollment_no} · Sem ${m.semester} · Sec ${m.section}</div>
          </div>
          <span class="badge ${m.status === 'Satisfactory' ? 'badge-present' : 'badge-absent'}">${m.attendance_pct}%</span>
        </div>
        <div class="mentee-card-stats">
          <div class="mentee-card-stat">
            <div class="mentee-card-stat-value">${m.present}</div>
            <div class="mentee-card-stat-label">Present</div>
          </div>
          <div class="mentee-card-stat">
            <div class="mentee-card-stat-value">${m.absent}</div>
            <div class="mentee-card-stat-label">Absent</div>
          </div>
          <div class="mentee-card-stat">
            <div class="mentee-card-stat-value">${m.enrolled_courses}</div>
            <div class="mentee-card-stat-label">Courses</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Global handler
window._viewMentee = (studentId) => {
  state.selectedMentee = studentId;
  switchSection('detail');
};

let menteeSearchTimeout = null;
function initMenteeSearch() {
  const el = $('mentee-search');
  if (!el) return;
  el.addEventListener('input', () => {
    clearTimeout(menteeSearchTimeout);
    menteeSearchTimeout = setTimeout(() => loadMenteesList(el.value), 300);
  });
}

/* ================================================================
   SECTION: Student Detail
   ================================================================ */
async function loadMenteeDetail(studentId) {
  const container = $('mentee-detail-content');
  if (!container || !studentId) {
    if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Select a mentee</div></div>';
    return;
  }

  container.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row w-60"></div><div class="skeleton skeleton-row"></div></div>';

  const [detailData, attendanceData, historyData] = await Promise.all([
    getMenteeDetail(studentId, state.mentorId),
    getMenteeAttendance(studentId, state.mentorId),
    getMenteeHistory(studentId, state.mentorId, 15),
  ]);

  if (!detailData || !detailData.profile) {
    container.innerHTML = '<div class="error-state" style="margin:20px"><span>Access denied or student not found.</span></div>';
    return;
  }

  const p = detailData.profile;
  const a = attendanceData;
  const notes = detailData.assignment?.notes || '';

  $('detail-title') && ($('detail-title').textContent = p.name);

  const overallStatus = a.overall_pct >= 75 ? 'Satisfactory' : 'At Risk';
  const overallBadge = a.overall_pct >= 75 ? 'badge-present' : 'badge-absent';

  container.innerHTML = `
    <!-- Profile Panel -->
    <div class="mentee-detail-panel">
      <div class="mentee-detail-header">
        <div class="mentee-detail-avatar">${p.initials || '?'}</div>
        <div class="mentee-detail-info">
          <h2>${p.name}</h2>
          <div class="mentee-detail-meta">${p.enrollment_no} · ${p.program} · Semester ${p.semester} · Section ${p.section}</div>
          <div class="mentee-detail-meta">${p.email}</div>
        </div>
        <span class="badge ${overallBadge}" style="font-size:14px;padding:6px 14px">${a.overall_pct}% Overall</span>
      </div>

      <!-- Quick Stats Row -->
      <div class="stats-grid" style="margin-bottom:0">
        <div class="stat-card primary" style="padding:14px 18px">
          <div class="stat-value" style="font-size:22px">${a.overall_pct}%</div>
          <div class="stat-label">Overall</div>
        </div>
        <div class="stat-card success" style="padding:14px 18px">
          <div class="stat-value" style="font-size:22px">${a.total_present || 0}</div>
          <div class="stat-label">Present</div>
        </div>
        <div class="stat-card danger" style="padding:14px 18px">
          <div class="stat-value" style="font-size:22px">${a.total_classes - (a.total_present || 0)}</div>
          <div class="stat-label">Absent</div>
        </div>
        <div class="stat-card warning" style="padding:14px 18px">
          <div class="stat-value" style="font-size:22px">${a.subjects?.length || 0}</div>
          <div class="stat-label">Subjects</div>
        </div>
      </div>
    </div>

    <!-- Subject-wise Attendance -->
    <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:var(--color-text-primary)">Subject-wise Attendance</h2>
    <div class="mentee-subjects-grid" style="margin-bottom:24px">
      ${a.subjects?.map(s => `
        <div class="stat-card ${s.pct >= 75 ? 'success' : 'danger'}" style="padding:16px">
          <div style="font-size:11px;font-weight:700;color:var(--color-primary-accent);letter-spacing:0.5px">${s.code}</div>
          <div style="font-size:14px;font-weight:700;margin:4px 0">${s.name}</div>
          <div style="font-size:12px;color:var(--color-text-muted)">${s.faculty || '—'}</div>
          <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--color-border-light)">
            <span style="font-size:12px;color:var(--color-text-muted)">Present: <strong>${s.present}</strong>/${s.total}</span>
            <span class="badge ${s.pct >= 75 ? 'badge-present' : 'badge-absent'}">${s.pct}%</span>
          </div>
          <div class="progress-track" style="margin-top:8px"><div class="progress-fill ${s.pct >= 75 ? 'high' : s.pct >= 60 ? 'medium' : 'low'}" style="width:${s.pct}%"></div></div>
        </div>
      `).join('') || '<p style="color:var(--color-text-muted)">No subject data available.</p>'}
    </div>

    <!-- Recent History -->
    <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:var(--color-text-primary)">Recent Attendance History</h2>
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:24px">
      <div class="table-container">
        <table>
          <thead><tr><th>Date</th><th>Subject</th><th>Code</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            ${historyData.length ? historyData.map(h => `
              <tr>
                <td class="td-mono">${h.date}</td>
                <td class="td-primary">${h.subject}</td>
                <td class="td-mono">${h.code}</td>
                <td><span class="badge ${h.status === 'Present' ? 'badge-present' : h.status === 'Flagged' ? 'badge-flagged' : 'badge-absent'}">${h.status}</span></td>
                <td style="font-size:12px;color:var(--color-text-muted)">${h.time}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--color-text-muted)">No history available</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mentor Notes -->
    <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:var(--color-text-primary)">Mentor Notes</h2>
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:20px">
      <textarea class="notes-textarea" id="mentee-notes" placeholder="Add private notes about this student...">${notes}</textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:10px">
        <button class="btn btn-primary" id="save-notes-btn">Save Notes</button>
      </div>
    </div>
  `;

  // Wire save notes
  $('save-notes-btn')?.addEventListener('click', async () => {
    const notesVal = $('mentee-notes')?.value || '';
    const result = await updateMenteeNotes(studentId, notesVal, state.mentorId);
    if (!result.error) showToast('Notes saved successfully');
    else showToast('Failed to save notes');
  });
}

/* ================================================================
   SECTION: At-Risk Alerts
   ================================================================ */
async function loadAlerts() {
  const list = $('alerts-list');
  if (!list) return;
  list.innerHTML = '<div class="loading-state"><div class="skeleton skeleton-row"></div></div>';

  const data = await getMentorAlerts(state.mentorId);
  $('alert-total-badge')  && ($('alert-total-badge').textContent = `${data.total_alerts} students`);
  $('alert-count-badge')  && ($('alert-count-badge').textContent = data.total_alerts);

  if (!data.alerts.length) {
    list.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-state-icon" style="color:var(--color-success)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="empty-state-title" style="color:var(--color-success)">All Clear!</div><div class="empty-state-desc">All your mentees are above the 75% attendance threshold.</div></div>';
    return;
  }

  list.innerHTML = data.alerts.map(a => `
    <div class="alert-card ${a.severity.toLowerCase()}" style="cursor:pointer" onclick="window._viewMentee('${a.student_id}')">
      <div class="alert-card-icon ${a.severity.toLowerCase()}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div class="alert-card-content">
        <div class="alert-card-name">${a.name} <span style="font-weight:400;color:var(--color-text-muted)">(${a.enrollment_no})</span></div>
        <div class="alert-card-detail">Worst: ${a.worst_subject} at ${a.worst_subject_pct}% · Deficit: -${a.deficit}%</div>
      </div>
      <div class="alert-card-pct ${a.severity.toLowerCase()}">${a.overall_pct}%</div>
    </div>
  `).join('');
}

/* ================================================================
   UI HELPERS
   ================================================================ */
function showToast(msg) {
  const container = $('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function initSidebar() {
  const toggle = $('sidebar-toggle'), sidebar = $('sidebar'), overlay = $('sidebar-overlay');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay?.classList.toggle('active'); });
  }
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay.classList.remove('active'); });
  $('sidebar-logout-btn')?.addEventListener('click', () => { showToast('Logging out...'); setTimeout(() => window.location.href = 'index.html', 800); });
}

/* ════════ Boot ════════ */
async function init() {
  initSidebar();
  initNavigation();
  initMenteeSearch();

  $('header-date') && ($('header-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

  try {
    const profile = await getMentorProfile(state.mentorId);
    $('mentor-name')   && ($('mentor-name').textContent = profile.name);
    $('mentor-dept')   && ($('mentor-dept').textContent = profile.department);
    $('mentor-avatar') && ($('mentor-avatar').textContent = profile.initials);
  } catch (e) {}

  switchSection('overview');
}

document.addEventListener('DOMContentLoaded', init);

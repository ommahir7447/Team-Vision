/**
 * faculty.js — Faculty Dashboard Controller
 * Handles cascade filter dropdowns + full dashboard re-render on context change.
 * Data flow: api.js → this file → DOM
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
} from './api.js';

import { renderTrendChart, renderDonutChart } from './charts.js';

/* ── Current filter state ── */
const state = {
  subject:  '',
  program:  '',
  semester: '',
  section:  '',
  date:     '',
};

/* ── DOM references ── */
const $ = id => document.getElementById(id);

const filterEls = {
  subject:  $('filter-subject'),
  program:  $('filter-program'),
  semester: $('filter-semester'),
  section:  $('filter-section'),
  date:     $('filter-date'),
  context:  $('filter-context-text'),
  badge:    $('filter-rate-badge'),
};

/* ================================================================
   FILTER / CASCADE LOGIC
   ================================================================ */

/** Populate a <select> with an array of option strings */
function populateSelect(selectEl, options, placeholder) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = placeholder; opt.disabled = true;
    selectEl.appendChild(opt);
  }
  options.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

/** Disable a select and show a placeholder */
function disableSelect(selectEl, text) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="" disabled selected>${text}</option>`;
  selectEl.disabled = true;
}

function onSubjectChange() {
  state.subject  = filterEls.subject.value;
  state.program  = '';
  state.semester = '';
  state.section  = '';

  const programs = getPrograms(state.subject);
  populateSelect(filterEls.program, programs);
  filterEls.program.disabled = false;

  disableSelect(filterEls.semester, '— Select Semester —');
  disableSelect(filterEls.section,  '— Select Section —');
  clearDashboard();

  // Auto-advance if only one program is available
  if (programs.length === 1) {
    filterEls.program.value = programs[0];
    onProgramChange();
  }
}

function onProgramChange() {
  state.program  = filterEls.program.value;
  state.semester = '';
  state.section  = '';

  const semesters = getSemesters(state.subject, state.program);
  populateSelect(filterEls.semester, semesters);
  filterEls.semester.disabled = false;

  disableSelect(filterEls.section, '— Select Section —');
  clearDashboard();

  // Auto-advance if only one semester is available
  if (semesters.length === 1) {
    filterEls.semester.value = semesters[0];
    onSemesterChange();
  }
}

function onSemesterChange() {
  state.semester = filterEls.semester.value;
  state.section  = '';

  const sections = getSections(state.subject, state.program, state.semester);
  populateSelect(filterEls.section, sections);
  filterEls.section.disabled = false;
  clearDashboard();

  // Auto-advance if only one section is available
  if (sections.length === 1) {
    filterEls.section.value = sections[0];
    onSectionChange();
  }
}

function onSectionChange() {
  state.section = filterEls.section.value;
  if (state.section) loadDashboard();
}

function onDateChange() {
  state.date = filterEls.date.value;
  if (state.section) loadDashboard();
}

/** Update the context label "Machine Learning | B.Tech CSE | Semester 7 | Section B" */
function updateContextLabel() {
  const { subject, program, semester, section } = state;
  if (!subject) { if (filterEls.context) filterEls.context.textContent = 'Select a class to begin'; return; }
  const parts = [subject, program, semester, section].filter(Boolean);
  if (filterEls.context) filterEls.context.textContent = parts.join(' › ');
}

/* ================================================================
   DASHBOARD SECTIONS
   ================================================================ */

function clearDashboard() {
  updateContextLabel();
  $('stat-total')   && ($('stat-total').textContent   = '—');
  $('stat-present') && ($('stat-present').textContent = '—');
  $('stat-absent')  && ($('stat-absent').textContent  = '—');
  $('stat-rate')    && ($('stat-rate').textContent    = '—');
  if (filterEls.badge) filterEls.badge.className = 'filter-rate-badge';

  const tbody = $('attendance-table-body');
  if (tbody) tbody.innerHTML = '';
  showElement('table-empty', true);
  showElement('table-container', false);
  showElement('table-loading', false);

  const feed = $('activity-feed');
  if (feed) feed.innerHTML = `
    <div class="empty-state" style="padding:24px">
      <div class="empty-state-icon" style="opacity:0.3;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
      </div>
      <div class="empty-state-title">Select a class to begin</div>
      <div class="empty-state-desc">Choose Subject, Program, Semester and Section to load attendance data.</div>
    </div>`;
}

async function loadDashboard() {
  const { subject, program, semester, section } = state;
  if (!subject || !program || !semester || !section) return;

  updateContextLabel();

  // Run all three requests concurrently
  await Promise.all([
    loadStats(),
    loadAttendanceTable(),
    loadCharts(),
    loadActivity(),
  ]);
}

async function loadStats() {
  try {
    const { stats } = await getClassAttendanceData(state.subject, state.program, state.semester, state.section);
    $('stat-total')   && ($('stat-total').textContent   = stats.total);
    $('stat-present') && ($('stat-present').textContent = stats.present);
    $('stat-absent')  && ($('stat-absent').textContent  = stats.absent + (stats.flagged ? ` (+${stats.flagged})` : ''));
    $('stat-rate')    && ($('stat-rate').textContent    = `${stats.rate}%`);

    // Present delta: show percentage
    const presentPct = stats.total ? ((stats.present / stats.total) * 100).toFixed(1) : '—';
    $('present-delta') && ($('present-delta').textContent = `${presentPct}% of enrolled students`);

    // Colour the rate badge
    if (filterEls.badge) {
      filterEls.badge.className = 'filter-rate-badge ' +
        (stats.rate >= 80 ? 'good' : stats.rate >= 70 ? 'warn' : 'bad');
      filterEls.badge.textContent = `${stats.rate}% class avg`;
    }
  } catch (err) {
    console.error('[faculty] loadStats:', err);
  }
}

async function loadAttendanceTable() {
  const tbody = $('attendance-table-body');
  if (!tbody) return;

  showElement('table-loading', true);
  showElement('table-empty', false);
  showElement('table-container', false);
  tbody.innerHTML = '';

  try {
    const { students } = await getClassAttendanceData(state.subject, state.program, state.semester, state.section);
    showElement('table-loading', false);

    if (!students?.length) {
      showElement('table-empty', true);
      showElement('table-container', false);
      return;
    }

    showElement('table-empty', false);
    showElement('table-container', true);

    tbody.innerHTML = students.map((r, idx) => `
      <tr>
        <td class="td-mono">${idx + 1}</td>
        <td class="td-mono">${r.id}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="avatar avatar-sm">${initials(r.name)}</div>
            <span class="td-primary">${r.name}</span>
          </div>
        </td>
        <td>${statusBadge(r.status)}</td>
        <td>${confidenceCell(r.confidence)}</td>
        <td style="font-size:12px;color:var(--color-text-muted);white-space:nowrap">${r.time}</td>
        <td>${verifyBadge(r.type)}</td>
      </tr>`).join('');


  } catch (err) {
    console.error('[faculty] loadAttendanceTable:', err);
    showElement('table-loading', false);
    showError(tbody, 'Could not load attendance records.');
  }
}

async function loadCharts() {
  const { subject, program, semester, section } = state;
  try {
    // Trend chart
    const trend = await getAttendanceTrend(subject, program, semester, section);
    renderTrendChart('trend-chart', trend);

    // Donut chart — fetch stats separately (already cached by mock, fast)
    const { stats } = await getClassAttendanceData(subject, program, semester, section);
    renderDonutChart('donut-chart', stats.present, stats.absent, stats.flagged ?? 0);
  } catch (err) {
    console.error('[faculty] loadCharts:', err);
  }
}

async function loadActivity() {
  const feed = $('activity-feed');
  if (!feed) return;

  feed.innerHTML = `<div class="loading-state">
    <div class="skeleton skeleton-row"></div>
    <div class="skeleton skeleton-row w-60"></div>
    <div class="skeleton skeleton-row w-40"></div>
  </div>`;

  try {
    const { subject, program, semester, section } = state;
    const items = await getRecentActivity(subject, program, semester, section);

    if (!items?.length) {
      feed.innerHTML = `<div class="empty-state" style="padding:24px">
        <div class="empty-state-title">No activity recorded</div>
        <div class="empty-state-desc">No recognition events for this class.</div>
      </div>`;
      return;
    }

    feed.innerHTML = items.map(item => `
      <div class="activity-item">
        <div class="activity-dot ${item.status}"></div>
        <div class="activity-content">
          <div class="activity-name">${item.name}</div>
          <div class="activity-detail">${item.action} · ${item.course}</div>
        </div>
        <div class="activity-time">${item.time}</div>
      </div>`).join('');
  } catch (err) {
    console.error('[faculty] loadActivity:', err);
    showError(feed, 'Activity unavailable.');
  }
}

/* ================================================================
   SIDEBAR TOGGLE (mobile)
   ================================================================ */
function initSidebar() {
  const toggle  = $('sidebar-toggle');
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('active');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

/* ================================================================
   FILTER BAR INITIALISATION
   ================================================================ */
function initFilters() {
  // Populate subject dropdown
  const subjects = getAvailableSubjects();
  populateSelect(filterEls.subject, subjects, '— Select Subject —');
  filterEls.subject.disabled = false;

  // Start with other dropdowns disabled
  disableSelect(filterEls.program,  '— Select Program —');
  disableSelect(filterEls.semester, '— Select Semester —');
  disableSelect(filterEls.section,  '— Select Section —');

  // Set today's date
  if (filterEls.date) {
    filterEls.date.value = new Date().toISOString().split('T')[0];
    state.date = filterEls.date.value;
  }

  // Wire events
  filterEls.subject?.addEventListener('change',  onSubjectChange);
  filterEls.program?.addEventListener('change',  onProgramChange);
  filterEls.semester?.addEventListener('change', onSemesterChange);
  filterEls.section?.addEventListener('change',  onSectionChange);
  filterEls.date?.addEventListener('change',     onDateChange);

  // Auto-load the default demo class: ML › CSE › Sem 7 › Sec B
  _autoSelectDefaults('Machine Learning', 'B.Tech CSE', 'Semester 7', 'Section B');
}

function _autoSelectDefaults(sub, prog, sem, sec) {
  // Subject
  filterEls.subject.value = sub; state.subject = sub;
  populateSelect(filterEls.program, getPrograms(sub));
  filterEls.program.disabled = false;

  // Program
  filterEls.program.value = prog; state.program = prog;
  populateSelect(filterEls.semester, getSemesters(sub, prog));
  filterEls.semester.disabled = false;

  // Semester
  filterEls.semester.value = sem; state.semester = sem;
  populateSelect(filterEls.section, getSections(sub, prog, sem));
  filterEls.section.disabled = false;

  // Section
  filterEls.section.value = sec; state.section = sec;

  loadDashboard();
}

/* ================================================================
   UTILITY HELPERS
   ================================================================ */
function initClock() {
  const el = $('header-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });
}

function showElement(id, visible) {
  const el = $(id);
  if (el) el.style.display = visible ? 'block' : 'none';
}

function showError(container, msg) {
  if (container) container.innerHTML =
    `<div class="error-state"><span class="error-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span><span>${msg}</span></div>`;
}

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function statusBadge(status) {
  const map = { Present:'badge-present', Absent:'badge-absent', Flagged:'badge-flagged' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function verifyBadge(type) {
  if (!type) return '<span class="text-muted" style="font-size:11px">—</span>';
  return `<span class="badge ${type === 'Auto' ? 'badge-auto' : 'badge-manual'}">${type}</span>`;
}

function confidenceCell(score) {
  if (score === null || score === undefined) {
    return '<span style="color:var(--color-text-disabled);font-size:12px">—</span>';
  }
  const pct = Math.round(score * 100);
  const cls = pct >= 85 ? 'high' : pct >= 70 ? 'medium' : 'low';
  return `<div class="confidence-cell">
    <span class="confidence-pct ${cls}">${pct}%</span>
    <div class="confidence-bar-track">
      <div class="confidence-bar-fill ${cls}" style="width:${pct}%"></div>
    </div>
  </div>`;
}

/* ── Toast Helper ── */
function showToast(msg) {
  const container = $('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ── Modals & Dropdowns ── */
function initModalsAndDropdowns() {
  const avatarBtn = $('faculty-avatar-top');
  const dropdown = $('account-dropdown');
  const notifBtn = $('notif-btn');
  const notifModal = $('notif-modal');
  const notifClose = $('notif-close-btn');
  const notifDone = $('notif-done-btn');
  const notifReadAll = $('notif-read-all-btn');
  const notifDot = $('notif-dot');
  
  const editModal = $('edit-profile-modal');
  const editBtn = $('account-edit-item');
  const editClose = $('edit-profile-close-btn');
  const editCancel = $('edit-profile-cancel');
  const editSave = $('edit-profile-save');
  const logoutBtn = $('account-logout-item');

  // Account dropdown toggle
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
  }

  // Account dropdown items
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Logging out...');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    });
  }

  // Notification modal
  if (notifBtn && notifModal) {
    notifBtn.addEventListener('click', () => {
      notifModal.classList.add('open');
      notifModal.setAttribute('aria-hidden', 'false');
    });
  }
  const closeNotif = () => {
    if (notifModal) {
      notifModal.classList.remove('open');
      notifModal.setAttribute('aria-hidden', 'true');
    }
  };
  if (notifClose) notifClose.addEventListener('click', closeNotif);
  if (notifDone) notifDone.addEventListener('click', closeNotif);
  if (notifReadAll) {
    notifReadAll.addEventListener('click', () => {
      document.querySelectorAll('#notif-list .notif-item').forEach(item => item.classList.remove('unread'));
      if (notifDot) notifDot.style.display = 'none';
      showToast('All notifications marked as read.');
    });
  }

  // Edit profile modal
  if (editBtn && editModal) {
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown && dropdown.classList.remove('show');
      editModal.classList.add('open');
      editModal.setAttribute('aria-hidden', 'false');
    });
  }
  const closeEdit = () => {
    if (editModal) {
      editModal.classList.remove('open');
      editModal.setAttribute('aria-hidden', 'true');
    }
  };
  if (editClose) editClose.addEventListener('click', closeEdit);
  if (editCancel) editCancel.addEventListener('click', closeEdit);
  if (editSave) {
    editSave.addEventListener('click', (e) => {
      e.preventDefault();
      closeEdit();
      showToast('Profile information updated successfully!');
    });
  }
}

/* ── Boot ── */
async function init() {
  initSidebar();
  initClock();
  initModalsAndDropdowns();

  // Load faculty profile for sidebar
  try {
    const faculty = await getFacultyProfile();
    $('faculty-name')   && ($('faculty-name').textContent   = faculty.name);
    $('faculty-dept')   && ($('faculty-dept').textContent   = faculty.department);
    $('faculty-avatar') && ($('faculty-avatar').textContent = faculty.initials);
  } catch (e) { /* non-critical */ }

  initFilters();
  clearDashboard();
}

document.addEventListener('DOMContentLoaded', init);


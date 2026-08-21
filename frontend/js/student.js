/**
 * student.js — Student Portal Controller
 * Implements view routing (Dashboard / Attendance / Subjects / History / Profile)
 * and renders all data obtained via api.js.
 *
 * TODO (backend integration):
 *   Replace each getXxx() call in api.js with fetch() to the Flask REST API.
 *   Endpoints will require JWT auth — enforce role=student on the backend.
 */

import {
  getStudentProfile,
  getStudentAttendanceSummary,
  getSubjectWiseAttendance,
  getAttendanceHistory,
  getStudentTrend,
  getStudentProfileFull,
  getStudentSubjects,
  getFullAttendanceHistory,
} from './api.js';

import { renderStudentTrendChart, renderSubjectBarChart } from './charts.js';

/* ── DOM shorthand ── */
const $ = id => document.getElementById(id);

/* ── Cached data (load once) ── */
let _summary   = null;
let _subjects  = null;
let _history   = null;
let _profile   = null;
let _trend     = null;

/* ================================================================
   VIEW ROUTER
   ================================================================ */
const VIEWS = ['dashboard', 'attendance', 'subjects', 'history', 'profile'];
const VIEW_TITLES = {
  dashboard:  'Student Dashboard',
  attendance: 'Attendance Overview',
  subjects:   'My Subjects',
  history:    'Attendance History',
  profile:    'Student Profile',
};

function showView(name) {
  if (!VIEWS.includes(name)) return;

  VIEWS.forEach(v => {
    const el = $(`view-${v}`);
    if (el) el.hidden = (v !== name);
  });

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    const active = item.dataset.view === name;
    item.classList.toggle('active', active);
    active ? item.setAttribute('aria-current', 'page') : item.removeAttribute('aria-current');
  });

  const titleEl = $('page-title');
  if (titleEl) titleEl.textContent = VIEW_TITLES[name] || 'Student Portal';

  loadView(name);
}

async function loadView(name) {
  switch (name) {
    case 'dashboard':  await renderDashboard();   break;
    case 'attendance': await renderAttendance();  break;
    case 'subjects':   await renderSubjects();    break;
    case 'history':    await renderHistory();     break;
    case 'profile':    await renderProfile();     break;
  }
}

/* ================================================================
   VIEW: DASHBOARD
   ================================================================ */
async function renderDashboard() {
  try {
    // Load in parallel
    [_summary, _subjects, _trend] = await Promise.all([
      _summary  ?? getStudentAttendanceSummary(),
      _subjects ?? getStudentSubjects(),
      _trend    ?? getStudentTrend(),
    ]);
    _summary  = _summary;
    _subjects = _subjects;
    _trend    = _trend;

    const s = _summary;

    // Stats
    setText('quick-total',      s.total_classes);
    setText('quick-present',    s.present);
    setText('quick-absent',     s.absent);
    setText('overall-pct-stat', `${s.overall_pct}%`);

    // Risk banner
    const risk = $('risk-alert');
    if (risk) {
      const show = s.overall_pct < 75;
      risk.style.display = show ? 'flex' : 'none';
      if (show) setText('risk-alert-msg',
        `Attendance is ${s.overall_pct}%. A minimum of 75% is required.`);
    }

    // Charts
    renderStudentTrendChart('student-trend-chart', _trend);
    renderSubjectBarChart('subject-bar-chart', _subjects);

    // Recent history table (first 7)
    const hist = await getAttendanceHistory(7);
    renderHistoryRows('history-table-body', hist);

  } catch (err) {
    console.error('[student] renderDashboard:', err);
  }
}

/* ================================================================
   VIEW: ATTENDANCE OVERVIEW
   ================================================================ */
async function renderAttendance() {
  try {
    _summary  = _summary  ?? await getStudentAttendanceSummary();
    _subjects = _subjects ?? await getStudentSubjects();
    _trend    = _trend    ?? await getStudentTrend();

    const s = _summary;
    setText('att-total',   s.total_classes);
    setText('att-present', s.present);
    setText('att-absent',  s.absent);
    setText('att-rate',    `${s.overall_pct}%`);

    // Subject rows
    const container = $('att-subject-rows');
    if (container) {
      container.innerHTML = _subjects.map(sub => {
        const cls = sub.pct >= 80 ? 'high' : sub.pct >= 75 ? 'medium' : 'low';
        return `
          <div class="subject-att-row">
            <div class="subject-att-info">
              <span class="subject-att-name">${sub.name}</span>
              <span class="subject-att-code">${sub.code}</span>
            </div>
            <div class="subject-att-bar-wrap">
              <div class="progress-track" style="flex:1;">
                <div class="progress-fill ${cls}" style="width:${sub.pct}%"></div>
              </div>
              <span class="subject-att-pct ${cls}">${sub.pct}%</span>
              <span class="badge ${sub.pct >= 75 ? 'badge-present' : 'badge-absent'}">${sub.attended}/${sub.total}</span>
            </div>
          </div>`;
      }).join('');
    }

    // Duplicate trend chart for this view
    renderStudentTrendChart('att-trend-chart', _trend);

  } catch (err) {
    console.error('[student] renderAttendance:', err);
  }
}

/* ================================================================
   VIEW: SUBJECTS
   ================================================================ */
async function renderSubjects() {
  const loading = $('subjects-loading');
  const wrap    = $('subjects-table-wrap');
  const tbody   = $('subjects-table-body');
  const count   = $('subjects-count');
  if (!tbody) return;

  if (loading) loading.style.display = 'flex';
  if (wrap)    wrap.style.display    = 'none';

  try {
    _subjects = _subjects ?? await getStudentSubjects();
    if (loading) loading.style.display = 'none';
    if (wrap)    wrap.style.display    = 'block';
    if (count)   count.textContent     = `${_subjects.length} subject${_subjects.length !== 1 ? 's' : ''} enrolled`;

    tbody.innerHTML = _subjects.map((s, i) => {
      const cls = s.pct >= 80 ? 'high' : s.pct >= 75 ? 'medium' : 'low';
      return `<tr>
        <td class="td-primary">${s.name}<br><small class="td-mono">${s.faculty}</small></td>
        <td class="td-mono">${s.code}</td>
        <td class="td-mono">${s.faculty}</td>
        <td class="td-mono">${s.total}</td>
        <td class="td-mono">${s.attended}</td>
        <td class="td-mono">${s.absent}</td>
        <td>
          <div class="confidence-cell">
            <span class="confidence-pct ${cls}">${s.pct}%</span>
            <div class="confidence-bar-track">
              <div class="confidence-bar-fill ${cls}" style="width:${s.pct}%"></div>
            </div>
          </div>
        </td>
        <td><span class="badge ${s.pct >= 75 ? 'badge-present' : 'badge-absent'}">${s.status}</span></td>
      </tr>`;
    }).join('');

  } catch (err) {
    if (loading) loading.style.display = 'none';
    console.error('[student] renderSubjects:', err);
  }
}

/* ================================================================
   VIEW: ATTENDANCE HISTORY
   ================================================================ */
let _allHistory = null;

async function renderHistory() {
  // Populate subject dropdown once
  const subjectSel = $('hist-subject');
  if (subjectSel && subjectSel.options.length === 1) {
    _subjects = _subjects ?? await getStudentSubjects();
    _subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name; opt.textContent = s.name;
      subjectSel.appendChild(opt);
    });
  }

  await applyHistoryFilters();

  // Wire filter events (only once)
  if (!subjectSel?.dataset.wired) {
    ['hist-subject', 'hist-status', 'hist-from', 'hist-to'].forEach(id => {
      const el = $(id);
      if (el) { el.addEventListener('change', applyHistoryFilters); el.dataset.wired = '1'; }
    });
    const clearBtn = $('hist-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      ['hist-subject','hist-status','hist-from','hist-to'].forEach(id => { const e=$(id); if(e) e.value=''; });
      applyHistoryFilters();
    });
  }
}

async function applyHistoryFilters() {
  const subject = $('hist-subject')?.value || '';
  const status  = $('hist-status')?.value  || '';
  const from    = $('hist-from')?.value    || '';
  const to      = $('hist-to')?.value      || '';

  const loading = $('hist-loading');
  const empty   = $('hist-empty');
  const wrap    = $('hist-table-wrap');
  const tbody   = $('hist-table-body');
  const countEl = $('hist-record-count');

  if (loading) loading.style.display = 'flex';
  if (empty)   empty.style.display   = 'none';
  if (wrap)    wrap.style.display    = 'none';

  try {
    const records = await getFullAttendanceHistory({ subject, status, from, to });

    if (loading) loading.style.display = 'none';
    if (countEl) countEl.textContent   = `${records.length} record${records.length !== 1 ? 's' : ''}`;

    if (!records.length) {
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (wrap)  wrap.style.display  = 'block';
    if (tbody) tbody.innerHTML = records.map((r, i) => `
      <tr>
        <td class="td-mono">${i + 1}</td>
        <td style="white-space:nowrap;font-size:12px;">${formatDate(r.date)}</td>
        <td class="td-primary">${r.subject}</td>
        <td class="td-mono">${r.code}</td>
        <td>${statusBadge(r.status)}</td>
        <td style="font-size:12px;color:var(--color-text-muted);white-space:nowrap;">${r.time}</td>
        <td style="font-size:12px;color:var(--color-text-muted);">${r.verification}</td>
      </tr>`).join('');

  } catch (err) {
    if (loading) loading.style.display = 'none';
    console.error('[student] applyHistoryFilters:', err);
  }
}

/* ================================================================
   VIEW: PROFILE
   ================================================================ */
async function renderProfile() {
  try {
    _profile = _profile ?? await getStudentProfileFull();
    const p = _profile;

    // Header
    setText('profile-name',         p.name);
    setText('profile-enrollment',   p.enrollment_no);
    setText('profile-program-short',`B.Tech ${p.branch}`);
    setText('profile-semester-label',`Semester ${p.semester}`);
    setText('profile-section-label', `Section ${p.section}`);
    setText('profile-avatar',        p.initials);

    // Two-column info grid
    const grid = $('profile-info-grid');
    if (!grid) return;

    const LEFT = [
      ['Institute Code',       p.institute_code],
      ['Name (as per 10th)',   p.name_10th],
      ['Program / Branch',     p.program],
      ['Date of Birth',        p.dob],
      ['Mobile Number',        p.mobile],
      ['Email ID',             p.email],
      ['Category',             p.category],
      ['Religion',             p.religion],
      ['Batch',                p.batch],
    ];
    const RIGHT = [
      ['Application Number',   p.application_no],
      ['Academic Year',        p.academic_year],
      ['Admitted Year',        p.admitted_year],
      ['Gender',               p.gender],
      ['Date of Joining',      p.doj],
      ['Blood Group',          p.blood_group],
      ['Nationality',          p.nationality],
      ['Marital Status',       p.marital_status],
      ['Aadhaar Number',       p.aadhar],
    ];

    grid.innerHTML = `
      <div class="profile-col">
        ${LEFT.map(([label, val]) => profileRow(label, val)).join('')}
      </div>
      <div class="profile-col">
        ${RIGHT.map(([label, val]) => profileRow(label, val)).join('')}
      </div>`;

  } catch (err) {
    console.error('[student] renderProfile:', err);
  }
}

function profileRow(label, value) {
  return `<div class="profile-row">
    <dt class="profile-label">${label}</dt>
    <dd class="profile-value">${value ?? '—'}</dd>
  </div>`;
}

/* ================================================================
   SHARED HELPERS
   ================================================================ */
function renderHistoryRows(tbodyId, records) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  if (!records?.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted);">No attendance records available.</td></tr>`;
    return;
  }
  tbody.innerHTML = records.map(r => `
    <tr>
      <td style="white-space:nowrap;font-size:12px;">${formatDate(r.date)}</td>
      <td class="td-primary">${r.subject}</td>
      <td class="td-mono">${r.code}</td>
      <td>${statusBadge(r.status)}</td>
      <td style="font-size:12px;color:var(--color-text-muted);white-space:nowrap;">${r.time}</td>
      <td style="font-size:12px;color:var(--color-text-muted);">${r.verification}</td>
    </tr>`).join('');
}

function statusBadge(status) {
  const map = { Present: 'badge-present', Absent: 'badge-absent', Flagged: 'badge-flagged' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = val ?? '—';
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
    const open = sidebar.classList.toggle('open');
    overlay?.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    toggle?.setAttribute('aria-expanded', 'false');
  });
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
  const avatarBtn = $('student-topbar-avatar');
  const dropdown = $('account-dropdown');
  const notifBtn = $('notif-btn');
  const notifModal = $('notif-modal');
  const notifClose = $('notif-close-btn');
  const notifDone = $('notif-done-btn');
  const notifReadAll = $('notif-read-all-btn');
  const notifDot = $('notif-dot');
  
  const editModal = $('edit-profile-modal');
  const profileItem = $('account-profile-item');
  const editBtn = $('account-edit-item');
  const editClose = $('edit-profile-close-btn');
  const editCancel = $('edit-profile-cancel');
  const editSave = $('edit-profile-save');
  const logoutBtn = $('account-logout-item');

  // Toggle account dropdown
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
  }

  // Account dropdown items
  if (profileItem) {
    profileItem.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown && dropdown.classList.remove('show');
      showView('profile');
    });
  }
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

/* ================================================================
   INIT
   ================================================================ */
async function init() {
  initSidebar();
  initModalsAndDropdowns();

  // Date
  const dateEl = $('header-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Profile header fields
  try {
    const profile = await getStudentProfile();
    setText('student-name',         profile.name);
    setText('student-enrollment',   profile.enrollment_no);
    setText('student-program',      profile.program.replace('B.Tech ', 'B.Tech '));
    setText('student-semester',     `Semester ${profile.semester}`);
    setText('student-avatar',       profile.initials);
    setText('student-sidebar-avatar', profile.initials);
    setText('student-sidebar-name',   profile.name);
    setText('student-sidebar-enroll', profile.enrollment_no);
    setText('student-topbar-avatar',  profile.initials);
    ['student-avatar','student-sidebar-avatar','student-topbar-avatar'].forEach(id => {
      const el = $(id); if (el) el.textContent = profile.initials;
    });
  } catch (e) { /* non-critical */ }

  // Wire navigation
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      showView(item.dataset.view);
    });
  });

  // Settings nav — mark as coming soon
  const settingsNav = $('nav-settings');
  if (settingsNav) {
    settingsNav.addEventListener('click', e => {
      e.preventDefault();
      showToast('Settings — configuration coming soon.');
    });
  }

  // Load default view
  showView('dashboard');
}

document.addEventListener('DOMContentLoaded', init);


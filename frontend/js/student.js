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
  uploadProfilePhoto,
  removeProfilePhoto,
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

/* ── Cached photo URL ── */
let _currentPhotoUrl = null;

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
          <div class="subject-att-card">
            <div class="subject-att-left">
              <div class="subject-att-title-row">
                <span class="subject-att-name">${sub.name}</span>
                <span class="subject-att-code">${sub.code}</span>
              </div>
              <span class="subject-att-faculty">${sub.faculty || 'Computer Science & Eng.'}</span>
            </div>
            <div class="subject-att-progress-section">
              <div class="subject-att-progress-bar">
                <div class="subject-att-progress-fill ${cls}" style="width:${sub.pct}%"></div>
              </div>
            </div>
            <div class="subject-att-right">
              <span class="subject-att-pct ${cls}">${sub.pct}%</span>
              <span class="subject-att-fraction">${sub.attended}/${sub.total} Classes</span>
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
    const p = await getStudentProfileFull();

    // Header
    setText('profile-name',          p.name);
    setText('profile-enrollment',    p.enrollment_no);
    setText('profile-program-short', `B.Tech ${p.branch || 'CSE'}`);
    setText('profile-semester-label',`Semester ${p.semester || 7}`);
    setText('profile-section-label', `Section ${p.section || 'B'}`);
    setText('profile-avatar',        p.initials || 'ST');

    // Restore profile photo if available
    if (p.profile_picture) {
      _currentPhotoUrl = p.profile_picture;
      updateAvatarUI(p.profile_picture, p.initials || 'ST');
    } else {
      _currentPhotoUrl = null;
      updateAvatarUI(null, p.initials || 'ST');
    }

    const container = $('profile-sections-container');
    if (!container) return;

    const sections = [
      {
        title: 'Academic & Institute Details',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
        fields: [
          { label: 'Institute Code', value: p.institute_code || 'KU-UIT-001', mono: true },
          { label: 'Institute Name', value: p.institute_name || 'Unitedworld Institute of Technology' },
          { label: 'Program / Degree', value: p.program || 'B.Tech Computer Science & Engineering' },
          { label: 'Batch / Duration', value: p.batch || '2022–2026' },
          { label: 'Current Semester', value: `Semester ${p.semester || 7} (Sec ${p.section || 'B'})` },
          { label: 'Academic Year', value: p.academic_year || '2025–2026' },
          { label: 'Application Number', value: p.application_no || 'KU2023BCS0009', mono: true },
          { label: 'Admitted Year', value: p.admitted_year || '2022' },
          { label: 'Date of Joining', value: p.doj || '01/08/2022' },
        ]
      },
      {
        title: 'Personal Information',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        fields: [
          { label: 'Full Name (Official)', value: p.name_10th || p.name },
          { label: 'Gender', value: p.gender || 'Male' },
          { label: 'Date of Birth', value: p.dob || '14/10/2003' },
          { label: 'Blood Group', value: p.blood_group || 'B+' },
          { label: 'Nationality', value: p.nationality || 'Indian' },
          { label: 'Category', value: p.category || 'General' },
          { label: 'Religion', value: p.religion || 'Hindu' },
          { label: 'Marital Status', value: p.marital_status || 'Single' },
        ]
      },
      {
        title: 'Contact & Official Credentials',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
        fields: [
          { label: 'University Email', value: p.email, mono: true },
          { label: 'Mobile Number', value: p.mobile || '+91 98765 43210' },
          { label: 'Aadhaar / National ID', value: p.aadhar || 'XXXX XXXX 5892', mono: true },
          { label: 'Enrollment Number', value: p.enrollment_no, mono: true },
        ]
      }
    ];

    container.innerHTML = sections.map(sec => `
      <div class="profile-section-card">
        <div class="profile-section-title">
          ${sec.icon}
          <span>${sec.title}</span>
        </div>
        <div class="profile-info-grid">
          ${sec.fields.map(f => `
            <div class="profile-field-tile">
              <span class="profile-field-label">${f.label}</span>
              <span class="profile-field-value ${f.mono ? 'mono' : ''}">${f.value || '—'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[student] renderProfile:', err);
  }
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
      <td style="white-space:nowrap;font-size:12px;font-weight:600;color:#334155;">${formatDate(r.date)}</td>
      <td class="td-primary" style="font-weight:600;color:#0F172A;">${r.subject}</td>
      <td class="td-mono" style="color:#64748B;">${r.code}</td>
      <td style="font-size:12px;color:#64748B;white-space:nowrap;">${r.time}</td>
      <td style="font-size:12px;color:#64748B;">${r.verification}</td>
      <td>${statusBadge(r.status)}</td>
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
   PROFILE PHOTO HELPERS
   ================================================================ */
/**
 * Updates all avatar elements across the UI (Topbar, Sidebar, Profile card)
 * to either show an image or fall back to initials text.
 * @param {string|null} photoUrl - Full URL or null to show initials
 * @param {string} initials      - e.g. "NT"
 */
function updateAvatarUI(photoUrl, initials) {
  _currentPhotoUrl = photoUrl || null;

  const profileCircle = $('profile-avatar');
  const topbarBtn     = $('student-topbar-avatar');
  const sidebarAvatar = $('student-sidebar-avatar');
  const removeBtn     = $('profile-remove-photo-btn');

  if (photoUrl) {
    const fullUrl = photoUrl.startsWith('http') || photoUrl.startsWith('data:')
      ? photoUrl
      : `http://localhost:5000${photoUrl}`;

    // Profile card
    if (profileCircle) {
      // Preserve the camera overlay element
      const overlay = profileCircle.querySelector('.profile-avatar-overlay');
      profileCircle.innerHTML = '';
      const img1 = document.createElement('img');
      img1.src = fullUrl;
      img1.alt = 'Profile photo';
      img1.className = 'avatar-photo';
      profileCircle.appendChild(img1);
      if (overlay) profileCircle.appendChild(overlay);
    }

    // Topbar
    if (topbarBtn) {
      topbarBtn.textContent = '';
      const img2 = document.createElement('img');
      img2.src = fullUrl;
      img2.alt = 'Profile photo';
      img2.className = 'avatar-photo';
      img2.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      topbarBtn.appendChild(img2);
    }

    // Sidebar
    if (sidebarAvatar) {
      sidebarAvatar.textContent = '';
      const img3 = document.createElement('img');
      img3.src = fullUrl;
      img3.alt = 'Profile photo';
      img3.className = 'avatar-photo';
      img3.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      sidebarAvatar.appendChild(img3);
    }

    // Show remove button
    if (removeBtn) removeBtn.style.display = 'inline-flex';

  } else {
    // Restore initials everywhere
    const overlay = profileCircle?.querySelector('.profile-avatar-overlay');
    if (profileCircle) {
      profileCircle.innerHTML = initials;
      if (overlay) profileCircle.appendChild(overlay);
    }
    if (topbarBtn)     topbarBtn.textContent   = initials;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;

    // Hide remove button
    if (removeBtn) removeBtn.style.display = 'none';
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

  // ── Profile Photo ──
  const photoInput     = $('profile-photo-input');
  const changPhotoBtn  = $('profile-change-photo-btn');
  const removePhotoBtn = $('profile-remove-photo-btn');
  const profileCircle  = $('profile-avatar');
  const avatarOverlay  = $('profile-avatar-overlay');

  // Trigger file picker from Change Photo button or avatar overlay click
  const openFilePicker = () => photoInput && photoInput.click();
  if (changPhotoBtn)  changPhotoBtn.addEventListener('click', openFilePicker);
  if (avatarOverlay)  avatarOverlay.addEventListener('click', openFilePicker);

  // Handle file selection → validate → upload → update UI
  if (photoInput) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files?.[0];
      if (!file) return;

      // Client-side validation
      const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!ALLOWED.includes(file.type)) {
        showToast('⚠ Only PNG, JPG and WebP images are supported.');
        photoInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('⚠ Image is too large. Maximum size is 5 MB.');
        photoInput.value = '';
        return;
      }

      // Preview instantly from local file before upload
      const previewUrl = URL.createObjectURL(file);
      const prevInitials = profileCircle?.querySelector('img.avatar-photo') ? '?' :
        ($('student-topbar-avatar')?.textContent?.trim() || 'ST');
      updateAvatarUI(previewUrl, prevInitials);

      // Start upload animation
      profileCircle && profileCircle.classList.add('uploading');

      try {
        const result = await uploadProfilePhoto(file);
        profileCircle && profileCircle.classList.remove('uploading');
        URL.revokeObjectURL(previewUrl);

        if (result.profile_picture) {
          updateAvatarUI(result.profile_picture, prevInitials);
          showToast('✓ Profile photo updated successfully!');
        } else {
          showToast('⚠ Photo upload failed: ' + (result.error || 'Unknown error'));
          updateAvatarUI(_currentPhotoUrl, prevInitials);
        }
      } catch (err) {
        profileCircle && profileCircle.classList.remove('uploading');
        URL.revokeObjectURL(previewUrl);
        // If not authenticated, store preview locally using localStorage as Base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target.result;
          localStorage.setItem('student_profile_photo_local', dataUri);
          updateAvatarUI(dataUri, prevInitials);
          showToast('✓ Photo saved locally (sign in to sync to server).');
        };
        reader.readAsDataURL(file);
      }

      photoInput.value = '';
    });
  }

  // Remove photo button
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', async () => {
      const initials = $('student-topbar-avatar')?.textContent?.trim() ||
                       $('student-sidebar-avatar')?.textContent?.trim() || 'ST';
      // Optimistically clear UI first
      updateAvatarUI(null, initials);
      localStorage.removeItem('student_profile_photo_local');

      try {
        const result = await removeProfilePhoto();
        if (result.message) {
          showToast('✓ Profile photo removed.');
        } else {
          showToast('⚠ Could not remove photo from server, but cleared locally.');
        }
      } catch {
        showToast('Photo cleared locally.');
      }
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
    const displayName = (profile.enrollment_no && profile.name && profile.name.includes(profile.enrollment_no))
      ? profile.name.replace(profile.enrollment_no, '').trim()
      : (profile.name || 'Student');

    setText('student-name',           displayName);
    setText('hero-student-name',      displayName);
    setText('student-enrollment',     profile.enrollment_no);
    setText('student-program',        (profile.program || 'B.Tech CSE').replace('B.Tech ', 'B.Tech '));
    setText('student-semester',       `Semester ${profile.semester || 7}`);
    setText('student-avatar',         profile.initials);
    setText('student-sidebar-avatar', profile.initials);
    setText('student-sidebar-name',   displayName);
    setText('student-sidebar-enroll', profile.enrollment_no);
    setText('student-topbar-avatar',  profile.initials);
    ['student-avatar','student-sidebar-avatar','student-topbar-avatar'].forEach(id => {
      const el = $(id); if (el) el.textContent = profile.initials || 'ST';
    });

    // Restore profile photo: prefer server value, then localStorage fallback
    const serverPhoto = profile.profile_picture;
    const localPhoto  = localStorage.getItem('student_profile_photo_local');
    const photoToLoad = serverPhoto || localPhoto || null;
    if (photoToLoad) {
      _currentPhotoUrl = photoToLoad;
      updateAvatarUI(photoToLoad, profile.initials || 'ST');
    }
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


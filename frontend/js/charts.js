/**
 * charts.js — Reusable Chart.js chart builders
 *
 * All chart functions accept a canvas element ID and a data object.
 * Callers (faculty.js / student.js) just pass data — no Chart.js
 * configuration details leak into the rendering modules.
 *
 * Each function destroys any existing chart on the canvas before
 * creating a new one, so charts can be safely refreshed.
 */

/* Keep a registry of active Chart instances so we can destroy them */
const _chartRegistry = {};

/**
 * destroyChart(canvasId)
 * Safely removes an existing Chart instance from a canvas.
 */
function destroyChart(canvasId) {
  if (_chartRegistry[canvasId]) {
    _chartRegistry[canvasId].destroy();
    delete _chartRegistry[canvasId];
  }
}

/* ── Shared Chart.js defaults — University ERP theme ── */
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// Light-mode grid and tick colors
const GRID_COLOR  = '#E2E8F0';
const TICK_COLOR  = '#64748B';
const LABEL_COLOR = '#475569';

// Restrained palette: deep navy primary, slate secondary
const PALETTE = ['#1E3A8A', '#64748B', '#0F172A', '#334155', '#475569'];

// Shared tooltip style
const TOOLTIP = {
  backgroundColor: '#0F172A',
  borderColor:     '#334155',
  borderWidth:     1,
  titleColor:      '#F8FAFC',
  bodyColor:       '#CBD5E1',
  padding:         10,
  cornerRadius:    6,
  displayColors:   true,
};

/* ================================================================
   Chart 1: Attendance Trend — Multi-line chart (Faculty Dashboard)
   ================================================================ */
export function renderTrendChart(canvasId, trendData) {
  destroyChart(canvasId);

  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const datasets = trendData.datasets.map((ds, i) => ({
    label:           ds.label,
    data:            ds.data,
    borderColor:     PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '10',
    borderWidth:     2,
    pointRadius:     3,
    pointHoverRadius: 5,
    pointBackgroundColor: PALETTE[i % PALETTE.length],
    pointBorderColor: '#FFFFFF',
    pointBorderWidth: 1.5,
    fill:            i === 0,
    tension:         0.3,
  }));

  _chartRegistry[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels: trendData.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: LABEL_COLOR, font: { family: FONT, size: 11, weight: '500' }, boxWidth: 10, padding: 16 },
        },
        tooltip: {
          ...TOOLTIP,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
        },
      },
      scales: {
        x: {
          grid:  { color: 'transparent' },
          ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } },
        },
        y: {
          min: 50, max: 100,
          grid:  { color: GRID_COLOR },
          ticks: {
            color: TICK_COLOR,
            font: { family: FONT, size: 11 },
            callback: v => v + '%',
          },
        },
      },
    },
  });
}

/* ================================================================
   Chart 2: Present vs Absent — Doughnut (Faculty Dashboard)
   ================================================================ */
export function renderDonutChart(canvasId, present, absent, flagged = 0) {
  destroyChart(canvasId);

  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const labels = flagged > 0
    ? ['Present', 'Absent', 'Flagged']
    : ['Present', 'Absent'];

  const data = flagged > 0
    ? [present, absent, flagged]
    : [present, absent];

  // Muted restrained semantic colors
  const colors = ['#15803D', '#B91C1C', '#B45309'];
  const bgs    = ['rgba(21, 128, 61, 0.15)', 'rgba(185, 28, 28, 0.15)', 'rgba(180, 83, 9, 0.15)'];

  _chartRegistry[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgs.slice(0, labels.length),
        borderColor:     colors.slice(0, labels.length),
        borderWidth:     1.5,
        hoverOffset:     3,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: LABEL_COLOR,
            font: { family: FONT, size: 11, weight: '500' },
            boxWidth: 10, padding: 14,
          },
        },
        tooltip: {
          ...TOOLTIP,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} students` },
        },
      },
    },
  });
}

/* ================================================================
   Chart 3: Student Attendance Trend — Single-line (Student Portal)
   ================================================================ */
export function renderStudentTrendChart(canvasId, trendData) {
  destroyChart(canvasId);

  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const lastValue = trendData.data[trendData.data.length - 1];
  const color = lastValue >= 75 ? '#1E3A8A' : '#B91C1C';

  _chartRegistry[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.labels,
      datasets: [{
        label:            'Attendance %',
        data:             trendData.data,
        borderColor:      color,
        backgroundColor:  color + '12',
        borderWidth:      2,
        pointRadius:      3.5,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        fill:             true,
        tension:          0.3,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP,
          callbacks: {
            label: ctx => ` Attendance: ${ctx.parsed.y}%`,
            afterBody: ctx => ctx[0].parsed.y < 75 ? ['Below 75% requirement'] : [],
          },
        },
      },
      scales: {
        x: {
          grid:  { color: 'transparent' },
          ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } },
        },
        y: {
          min: 40, max: 100,
          grid:  { color: GRID_COLOR },
          ticks: {
            color: TICK_COLOR,
            font: { family: FONT, size: 11 },
            callback: v => v + '%',
          },
        },
      },
    },
    plugins: [{
      id: 'thresholdLine',
      afterDraw(chart) {
        const { ctx: c, chartArea, scales } = chart;
        const y75 = scales.y.getPixelForValue(75);
        if (y75 < chartArea.top || y75 > chartArea.bottom) return;

        c.save();
        c.beginPath();
        c.setLineDash([5, 4]);
        c.strokeStyle = '#B45309AA';
        c.lineWidth = 1.5;
        c.moveTo(chartArea.left, y75);
        c.lineTo(chartArea.right, y75);
        c.stroke();

        c.setLineDash([]);
        c.fillStyle = '#B45309';
        c.font = `600 10px ${FONT}`;
        c.fillText('75% Required', chartArea.right - 68, y75 - 5);
        c.restore();
      },
    }],
  });
}

/* ================================================================
   Chart 4: Subject-wise Bar Chart (Student Portal)
   ================================================================ */
export function renderSubjectBarChart(canvasId, subjects) {
  destroyChart(canvasId);

  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const labels = subjects.map(s => s.code || s.name);
  const data   = subjects.map(s => s.pct);
  const colors = data.map(v =>
    v >= 75 ? '#15803D' : '#B91C1C'
  );
  const bgs = data.map(v =>
    v >= 75 ? 'rgba(21, 128, 61, 0.15)' : 'rgba(185, 28, 28, 0.15)'
  );

  _chartRegistry[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'Attendance %',
        data,
        backgroundColor: bgs,
        borderColor:     colors,
        borderWidth:     1.5,
        borderRadius:    4,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP,
          callbacks: {
            title:  items => subjects[items[0].dataIndex]?.name,
            label:  ctx   => ` ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } },
        },
        y: {
          min: 0, max: 100,
          grid:  { color: GRID_COLOR },
          ticks: {
            color: TICK_COLOR,
            font: { family: FONT, size: 11 },
            callback: v => v + '%',
          },
        },
      },
    },
    plugins: [{
      id: 'thresholdLine',
      afterDraw(chart) {
        const { ctx: c, chartArea, scales } = chart;
        const y75 = scales.y.getPixelForValue(75);
        c.save();
        c.beginPath();
        c.setLineDash([5, 4]);
        c.strokeStyle = '#B45309AA';
        c.lineWidth = 1.5;
        c.moveTo(chartArea.left, y75);
        c.lineTo(chartArea.right, y75);
        c.stroke();
        c.setLineDash([]);
        c.restore();
      },
    }],
  });
}


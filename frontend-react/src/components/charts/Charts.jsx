import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
)

const FONT = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
const PALETTE = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6']
const GRID   = '#E2E8F0'
const TICK   = '#64748B'
const LABEL  = '#334155'
const TOOLTIP_OPTS = {
  backgroundColor: '#0F172A',
  borderColor:     '#334155',
  borderWidth:     1,
  titleColor:      '#F8FAFC',
  bodyColor:       '#CBD5E1',
  padding:         12,
  cornerRadius:    8,
}

export function TrendChart({ data, height = 200 }) {
  if (!data) return null
  const datasets = data.datasets.map((ds, i) => ({
    label: ds.label,
    data:  ds.data,
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '10',
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointBackgroundColor: PALETTE[i % PALETTE.length],
    pointBorderColor: '#FFFFFF',
    pointBorderWidth: 1.5,
    fill: i === 0,
    tension: 0.3,
  }))
  return (
    <div style={{ height }}>
      <Line
        data={{ labels: data.labels, datasets }}
        options={{
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { color: LABEL, font: { family: FONT, size: 11, weight: '500' }, boxWidth: 10, padding: 16 } },
            tooltip: { ...TOOLTIP_OPTS, callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y}%` } },
          },
          scales: {
            x: { grid: { color: 'transparent' }, ticks: { color: TICK, font: { family: FONT, size: 11 } } },
            y: { min: 50, max: 100, grid: { color: GRID }, ticks: { color: TICK, font: { family: FONT, size: 11 }, callback: v => v + '%' } },
          },
        }}
      />
    </div>
  )
}

export function StudentTrendChart({ data, height = 180 }) {
  if (!data) return null
  const lastVal = data.data?.[data.data.length - 1] ?? 80
  const color = lastVal >= 75 ? '#4F46E5' : '#E11D48'
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels: data.labels,
          datasets: [{
            label: 'Attendance %',
            data: data.data,
            borderColor: color,
            backgroundColor: color + '12',
            borderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointBackgroundColor: color,
            fill: true,
            tension: 0.3,
          }],
        }}
        options={{
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: { ...TOOLTIP_OPTS, callbacks: { label: c => ` Attendance: ${c.parsed.y}%`, afterBody: c => c[0].parsed.y < 75 ? ['Below 75% requirement'] : [] } },
          },
          scales: {
            x: { grid: { color: 'transparent' }, ticks: { color: TICK, font: { family: FONT, size: 11 } } },
            y: { min: 40, max: 100, grid: { color: GRID }, ticks: { color: TICK, font: { family: FONT, size: 11 }, callback: v => v + '%' } },
          },
        }}
      />
    </div>
  )
}

export function DonutChart({ present = 0, absent = 0, flagged = 0, height = 180 }) {
  const labels = flagged > 0 ? ['Present', 'Absent', 'Flagged'] : ['Present', 'Absent']
  const values = flagged > 0 ? [present, absent, flagged] : [present, absent]
  const colors = ['#059669', '#E11D48', '#D97706']
  const bgs    = ['rgba(5,150,105,0.15)', 'rgba(225,29,72,0.15)', 'rgba(217,119,6,0.15)']
  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: bgs.slice(0, labels.length), borderColor: colors.slice(0, labels.length), borderWidth: 1.5, hoverOffset: 3 }],
        }}
        options={{
          responsive: true, maintainAspectRatio: false, cutout: '72%',
          plugins: {
            legend: { position: 'bottom', labels: { color: LABEL, font: { family: FONT, size: 11, weight: '500' }, boxWidth: 10, padding: 14 } },
            tooltip: { ...TOOLTIP_OPTS, callbacks: { label: c => ` ${c.label}: ${c.parsed} students` } },
          },
        }}
      />
    </div>
  )
}

export function SubjectBarChart({ subjects = [], height = 180 }) {
  const labels = subjects.map(s => s.code || s.name)
  const values = subjects.map(s => s.pct)
  const colors = values.map(v => v >= 75 ? '#059669' : '#E11D48')
  const bgs    = values.map(v => v >= 75 ? 'rgba(5,150,105,0.15)' : 'rgba(225,29,72,0.15)')
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: [{ label: 'Attendance %', data: values, backgroundColor: bgs, borderColor: colors, borderWidth: 1.5, borderRadius: 8, maxBarThickness: 36 }],
        }}
        options={{
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { ...TOOLTIP_OPTS, callbacks: { title: items => subjects[items[0].dataIndex]?.name, label: c => ` ${c.parsed.y.toFixed(1)}%` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: TICK, font: { family: FONT, size: 11 } } },
            y: { min: 0, max: 100, grid: { color: GRID }, ticks: { color: TICK, font: { family: FONT, size: 11 }, callback: v => v + '%' } },
          },
        }}
      />
    </div>
  )
}

export function SubjectPerfChart({ courseRates = [], height = 200 }) {
  const labels = courseRates.map(c => c.code || c.name?.slice(0, 12))
  const values = courseRates.map(c => c.rate)
  const colors = values.map(v => v >= 80 ? '#059669' : v >= 70 ? '#D97706' : '#E11D48')
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: [{ label: 'Attendance %', data: values, backgroundColor: colors, borderRadius: 6, barThickness: 28 }] }}
        options={{
          responsive: true, maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: GRID }, ticks: { font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } },
          },
          plugins: { legend: { display: false } },
        }}
      />
    </div>
  )
}

import { point } from 'jikz'
import { chartView } from 'jikz/dataviz'

// The interactive layer: chartView() renders a chart() spec, attaches
// the adapter — tooltip and crosshair follow the pointer, active dots
// mark the samples under it, legend rows highlight on hover and
// toggle on click — and re-renders when you drag across the plot to
// zoom (double-click resets) or drag the brush window below. Every
// render is the same pure chart(); interaction is one thin DOM
// adapter over the frame's hitTest and data-series tags.

const DAYS = 60
const rows = Array.from({ length: DAYS }, (_, i) => ({
  day: new Date(Date.UTC(2026, 0, 1 + i)),
  sessions: Math.round(320 + 90 * Math.sin(i / 6) + 40 * Math.sin(i / 2.3) + i * 2),
  signups: Math.round(24 + 10 * Math.sin(i / 5 + 1) + i * 0.3),
}))

export default function render(container: HTMLElement) {
  chartView(
    container,
    {
      at: point(50, 200),
      width: 380,
      height: 160,
      x: { time: true, ticks: 6, grid: true },
      y: { label: 'per day', grid: true, includeValue: 0 },
      series: [
        { data: { rows, x: 'day', y: 'sessions' }, label: 'sessions', kind: 'area' },
        { data: { rows, x: 'day', y: 'signups' }, label: 'signups', style: { strokeWidth: 2 } },
      ],
      legend: { place: 'northWestInside' },
    },
    { zoom: 'x', brush: true, crosshair: 'x' }
  )
}

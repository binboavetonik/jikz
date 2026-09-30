import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// The chart-library staple on ext/dataviz. The x axis is a band axis —
// one equal band per quarter, string samples resolve to their band —
// and two unstacked bar series group side by side inside each band
// automatically, with a 2px canvas gap between them. No hand-computed
// bar x or width anywhere; the style sheet colours the series and the
// legend below the axes shows the effective paint.

const DATA: [label: string, a: number, b: number][] = [
  ['Q1', 42, 35],
  ['Q2', 58, 51],
  ['Q3', 49, 63],
  ['Q4', 71, 66],
]

export default function render(container: HTMLElement) {
  const pic = picture()

  chart(pic, {
    at: point(50, 220),
    width: 360,
    height: 180,
    x: { categories: DATA.map((d) => d[0]) },
    y: { domain: [0, 80], grid: true },
    series: [
      { data: DATA.map((d) => [d[0], d[1]]), kind: 'bar', label: '2025', valueLabels: true },
      { data: DATA.map((d) => [d[0], d[2]]), kind: 'bar', label: '2026', valueLabels: true },
    ],
    legend: { place: 'below' },
  })

  pic.mount(container, { fit: true, padding: 12 })
}

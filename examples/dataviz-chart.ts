import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// ext/dataviz — jikz's datavisualization analogue: chart() infers
// domains from the series (nice ticks included), draws axes with
// gridlines, paints each series, and collects labels into a legend.
// No series here names a colour: the style sheet (TikZ's `vary hue`,
// the CVD-validated eight-hue palette) assigns one per slot, and the
// legend below the axes shows the effective paint. Bar series pin the
// y baseline at 0 automatically.

const MEASURED: [number, number][] = [
  [1, 12], [2, 19], [3, 15], [4, 24], [5, 31], [6, 28], [7, 38],
]
const PREDICTED: [number, number][] = [
  [1, 10], [2, 16], [3, 18], [4, 22], [5, 27], [6, 31], [7, 36],
]
const BACKLOG: [number, number][] = [
  [1, 4], [2, 6], [3, 3], [4, 8], [5, 9], [6, 5], [7, 11],
]

export default function render(container: HTMLElement) {
  const pic = picture()

  chart(pic, {
    at: point(50, 220),
    width: 340,
    height: 170,
    x: { label: 'week', ticks: 7 },
    y: { label: 'tickets', grid: true },
    series: [
      { data: BACKLOG, label: 'backlog', kind: 'bar' },
      { data: MEASURED, label: 'measured', marks: 'o' },
      { data: PREDICTED, label: 'predicted', smooth: true, style: { dash: 'dashed', strokeWidth: 2 } },
    ],
    legend: { place: 'below' },
  })

  pic.mount(container, { fit: true, padding: 14 })
}

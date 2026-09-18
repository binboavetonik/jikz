import { picture, point } from 'jikz'
import { chart } from 'jikz/dataviz'

// ext/dataviz — jikz's datavisualization analogue: chart() infers
// domains from the series (nice ticks included), draws axes with
// gridlines, paints each series, and collects labels into a legend.
// Bar series pin the y baseline at 0 automatically.

const MEASURED: [number, number][] = [
  [1, 12], [2, 19], [3, 15], [4, 24], [5, 31], [6, 28], [7, 38],
]
const PREDICTED: [number, number][] = [
  [1, 10], [2, 16], [3, 18], [4, 22], [5, 27], [6, 31], [7, 36],
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
      {
        data: MEASURED,
        label: 'measured',
        style: { stroke: '#2563eb', strokeWidth: 1.5 },
        marks: { name: 'o', size: 5 },
      },
      {
        data: PREDICTED,
        label: 'predicted',
        style: { stroke: '#dc2626', strokeWidth: 1.5, dash: 'dashed' },
        smooth: true,
      },
    ],
    legend: true,
  })

  pic.mount(container, { fit: true, padding: 14 })
}

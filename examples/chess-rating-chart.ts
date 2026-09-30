import { picture, point } from 'jikz'
import { axes } from 'jikz/dataviz'

// Rapid rating over 12 months as a line chart with a goal line. The x
// axis is a band of month initials; the goal is frame.referenceLine —
// it maps through the frame's scales, so it cannot drift from the
// grid — and the series labels itself at its last sample.

const RATINGS = [1410, 1425, 1408, 1452, 1470, 1461, 1495, 1503, 1488, 1521, 1540, 1552]
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = axes(pic, {
    at: point(48, 200),
    width: 392,
    height: 170,
    fontSize: 8,
    x: { categories: MONTHS },
    y: { domain: [1400, 1600], grid: true, ticks: 5 },
  })

  frame.referenceLine({ y: 1500, label: '1500', style: { stroke: '#dc2626', dash: 'dashed', strokeWidth: 1.2 } })

  frame.line(
    RATINGS.map((elo, i) => [i, elo] as [number, number]),
    { label: 'rapid', marks: { name: 'o', size: 6 }, labelInData: 'end' }
  )

  pic.text(point(48, 18), 'rapid rating, 12 months', { textAnchor: 'start', style: { fontSize: 10 } })
  pic.mount(container, { width: 460, height: 230 })
}

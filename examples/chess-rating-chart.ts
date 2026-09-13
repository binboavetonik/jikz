import { picture, line, point, axes } from 'jikz'

// Chess-app card: your rapid rating over 12 months as a line chart
// with a 1500 "goal" line. ext/dataviz owns the axes — nice y ticks
// every 50, month letters via the tick formatter — and the goal line
// is drawn through the frame's scales, so it can't drift from the grid.

const RATINGS = [1410, 1425, 1408, 1452, 1470, 1461, 1495, 1503, 1488, 1521, 1540, 1552]
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = axes(pic, {
    at: point(48, 200),
    width: 392,
    height: 170,
    fontSize: 8,
    x: {
      domain: [0, 11],
      exact: true,
      tickValues: MONTHS.map((_, i) => i),
      format: (v) => MONTHS[v] ?? '',
    },
    y: { domain: [1400, 1600], grid: true, ticks: 5 },
  })

  // the 1500 goal line, mapped through the same scales as the series
  pic.draw(
    line(point(frame.x(0), frame.y(1500)), point(frame.x(11), frame.y(1500))),
    { style: { stroke: '#dc2626', dash: 'dashed', strokeWidth: 1.2 } }
  )
  pic.text(point(frame.x(11), frame.y(1500) - 7), '1500', {
    fontSize: 9,
    textAnchor: 'end',
    style: { stroke: '#dc2626' },
  })

  // the series: one point per month, open-circle marks
  frame.line(
    RATINGS.map((elo, i) => [i, elo] as [number, number]),
    { style: { stroke: '#2563eb', strokeWidth: 2 }, marks: { name: 'o', size: 6 } }
  )

  pic.text(point(48, 18), 'rapid rating, 12 months', { fontSize: 10, textAnchor: 'start' })
  pic.mount(container, { width: 460, height: 230 })
}

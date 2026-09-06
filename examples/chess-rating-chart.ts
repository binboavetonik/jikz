import { picture, plot, line, circle, point } from 'jikz'

// Chess-app card: your rapid rating over 12 months as a line chart
// with a 1500 "goal" line and min/max markers — the axes, ticks, and
// series all derived from one data array.

const RATINGS = [1410, 1425, 1408, 1452, 1470, 1461, 1495, 1503, 1488, 1521, 1540, 1552]
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export default function render(container: HTMLElement) {
  const pic = picture()
  const x0 = 45, yBase = 200, xStep = 33, yScale = 0.28
  const Y = (elo: number) => yBase - (elo - 1350) * yScale

  // gridlines + y labels every 50
  for (let elo = 1400; elo <= 1600; elo += 50) {
    pic.draw(line(point(x0, Y(elo)), point(440, Y(elo))),
      { style: { stroke: '#f1f5f9' } })
    pic.text(point(x0 - 6, Y(elo) + 3), String(elo), { fontSize: 8, textAnchor: 'end' })
  }

  // axes
  pic.pen({ style: { stroke: '#334155', strokeWidth: 1.2 } })
    .moveTo(x0, 30).lineTo(x0, yBase).lineTo(440, yBase)

  // the 1500 goal line
  pic.draw(line(point(x0, Y(1500)), point(440, Y(1500))),
    { style: { stroke: '#dc2626', dash: 'dashed', strokeWidth: 1.2 } })
  pic.text(point(440, Y(1500) - 6), '1500', { fontSize: 9, textAnchor: 'end', style: { stroke: '#dc2626' } })

  // the series: plot() over month indices, markers, month ticks
  pic.draw(plot((i) => -(RATINGS[Math.round(i)]! - 1350), { domain: [0, 11], samples: 12, xScale: xStep, yScale, xOffset: x0, yOffset: yBase }),
    { style: { stroke: '#2563eb', strokeWidth: 2 } })
  RATINGS.forEach((elo, i) => {
    pic.filldraw(circle(point(x0 + i * xStep, Y(elo)), 3), { style: { stroke: '#2563eb', fill: '#fff', strokeWidth: 1.5 } })
    pic.text(point(x0 + i * xStep, yBase + 13), MONTHS[i]!, { fontSize: 8, style: { stroke: '#64748b' } })
  })

  pic.text(point(x0, 18), 'rapid rating, 12 months', { fontSize: 10, textAnchor: 'start' })
  pic.mount(container, { width: 460, height: 230 })
}

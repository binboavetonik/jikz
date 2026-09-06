import { picture, rect, line, point } from 'jikz'

// The chart-library staple, drawn from raw data: axes as one pen
// statement, dashed gridlines, and bars as a rect loop. jikz doesn't
// chart for you — it gives you the skeleton precisely where you put it.

const DATA: [label: string, a: number, b: number][] = [
  ['Q1', 42, 35],
  ['Q2', 58, 51],
  ['Q3', 49, 63],
  ['Q4', 71, 66],
]

export default function render(container: HTMLElement) {
  const pic = picture()
  const x0 = 50, yBase = 220, yScale = 2.2, groupW = 90, barW = 32, gap = 6

  // gridlines + y ticks (dashed, behind the bars)
  for (let v = 0; v <= 80; v += 20) {
    const y = yBase - v * yScale
    pic.draw(line(point(x0, y), point(430, y)),
      { style: { stroke: '#e2e8f0', dash: v === 0 ? 'solid' : 'dashed' } })
    pic.text(point(x0 - 8, y), String(v), { fontSize: 9, textAnchor: 'end' })
  }

  // axes — one pen statement
  pic.pen({ style: { stroke: '#334155', strokeWidth: 1.5 } })
    .moveTo(x0, 20).lineTo(x0, yBase).lineTo(430, yBase)

  // bars
  DATA.forEach(([label, a, b], i) => {
    const gx = x0 + 25 + i * groupW
    pic.filldraw(rect(gx, yBase - a * yScale, barW, a * yScale),
      { style: { stroke: '#2563eb', fill: '#2563eb', 'fill-opacity': 0.75, strokeWidth: 1 } })
    pic.filldraw(rect(gx + barW + gap, yBase - b * yScale, barW, b * yScale),
      { style: { stroke: '#f59e0b', fill: '#f59e0b', 'fill-opacity': 0.75, strokeWidth: 1 } })
    pic.text(point(gx + barW + gap / 2, yBase + 14), label, { fontSize: 10 })
  })

  // legend
  pic.filldraw(rect(300, 26, 10, 10), { style: { stroke: '#2563eb', fill: '#2563eb', 'fill-opacity': 0.75 } })
  pic.text(point(314, 31), '2025', { at: 'east', distance: 2, fontSize: 10 })
  pic.filldraw(rect(350, 26, 10, 10), { style: { stroke: '#f59e0b', fill: '#f59e0b', 'fill-opacity': 0.75 } })
  pic.text(point(364, 31), '2026', { at: 'east', distance: 2, fontSize: 10 })

  pic.mount(container, { width: 450, height: 250 })
}

import { picture, point } from 'jikz'

// hvTo stairs: a step-function outline as ONE pen statement. hvTo is
// TikZ's -| (horizontal then vertical), so a histogram silhouette is
// just alternating hvTo/vhTo calls — no corner coordinates computed.

const SAMPLES = [30, 55, 42, 70, 61, 85, 50]

export default function render(container: HTMLElement) {
  const pic = picture()
  const x0 = 40, yBase = 190, binW = 52, yScale = 1.8

  // the step outline: horizontal run, then vertical rise, repeat
  const pen = pic.pen({ style: { stroke: '#2563eb', strokeWidth: 2, fill: '#dbeafe', fillOpacity: 0.6 }, mode: 'filldraw' })
    .moveTo(x0, yBase)
  let x = x0
  for (const v of SAMPLES) {
    pen.hvTo(point(x + binW, yBase - v * yScale)) // right to next bin, then up/down
    x += binW
  }
  pen.lineTo(x, yBase).close() // back down to the axis and close

  // axis + faint bin guides
  pic.edge(point(20, yBase), point(430, yBase), { arrowEnd: 'stealth', style: { stroke: '#334155' } })
  SAMPLES.forEach((_v, i) => {
    pic.text(point(x0 + i * binW + binW / 2, yBase + 14), `b${i + 1}`, { style: { fontSize: 9, fill: '#64748b' } })
  })

  pic.mount(container, { width: 450, height: 220 })
}

import { picture, plot, rect, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const f = (x: number) => 1 + 0.22 * x * x
  const xScale = 90, yScale = 55, xOff = 40, yBase = 240

  // axes
  pic.edge(point(20, yBase), point(400, yBase), { arrowEnd: 'stealth', style: { stroke: '#334155' } })
  pic.edge(point(xOff, 262), point(xOff, 10),   { arrowEnd: 'stealth', style: { stroke: '#334155' } })

  // left-rule bars
  const n = 10, dx = 3.8 / n
  for (let i = 0; i < n; i++) {
    const h = f(i * dx)
    pic.filldraw(rect(xOff + i * dx * xScale, yBase - h * yScale, dx * xScale - 3, h * yScale),
      { style: { stroke: '#2563eb', fill: '#2563eb', fillOpacity: 0.15, strokeWidth: 1 } })
  }

  // the curve itself (plot() maps y without flipping — pass -f)
  pic.draw(plot((x) => -f(x), { domain: [0, 3.8], xScale, yScale, xOffset: xOff, yOffset: yBase }),
    { style: { stroke: '#dc2626', strokeWidth: 2 } })

  // one bar gets a Δx annotation
  const bx = xOff + 3 * dx * xScale
  pic.edge(point(bx, 252), point(bx + dx * xScale - 3, 252),
    { arrowStart: 'stealth', arrowEnd: 'stealth', style: { stroke: '#64748b', strokeWidth: 1 } })
  pic.text(point(bx + dx * xScale / 2, 270), '$\\Delta x$', { style: { fontSize: 11 } })
  pic.text(point(388, 26), '$f(x)$', { style: { fontSize: 12 } })

  pic.mount(container, { width: 430, height: 285 })
}

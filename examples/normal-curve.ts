import { picture, plot, line, point } from 'jikz'

// The statistics textbook figure: a normal curve with the right tail
// shaded — P(X > 1.5). The tail is a CLOSED plot: sample the density
// on [1.5, 3.5], close the path, and the fill lands between curve and
// axis with no manual polygon stitching.

const PHI = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)

export default function render(container: HTMLElement) {
  const pic = picture()
  const xScale = 80, yScale = 220, xOff = 60, yBase = 230

  // axes
  pic.edge(point(20, yBase), point(400, yBase), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })
  pic.edge(point(xOff, 245), point(xOff, 15), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })

  // the shaded tail first (under the curve): closed plot on [1.5, 3.5]
  pic.filldraw(
    plot((x) => -PHI(x), { domain: [1.5, 3.5], samples: 60, xScale, yScale, xOffset: xOff, yOffset: yBase, closed: true }),
    { style: { stroke: 'none', fill: '#2563eb', 'fill-opacity': 0.3 } },
  )

  // the full curve on top
  pic.draw(plot((x) => -PHI(x), { domain: [-3.5, 3.5], samples: 120, xScale, yScale, xOffset: xOff, yOffset: yBase }),
    { style: { stroke: '#2563eb', strokeWidth: 2 } })

  // tail boundary marker + area label
  const bx = xOff + 1.5 * xScale
  pic.draw(line(point(bx, yBase), point(bx, yBase - PHI(1.5) * yScale)),
    { style: { stroke: '#1e40af', strokeWidth: 1 } })
  pic.text(point(bx, yBase + 13), '1.5', { fontSize: 10 })
  pic.text(point(bx + 42, yBase - 40), '$P(X > 1.5)$', { fontSize: 11 })
  pic.text(point(xOff, yBase + 13), '0', { fontSize: 10 })

  pic.mount(container, { width: 420, height: 260 })
}

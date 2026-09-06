import { picture, plot, lineFromAngle, circle, point } from 'jikz'

// f and f' on the same axes, with the tangent line at one point
// computed from the derivative — lineFromAngle turns the slope into
// geometry: angle = atan(f'(x)) in degrees, screen convention.

export default function render(container: HTMLElement) {
  const pic = picture()
  const f = (x: number) => 0.35 * x * x - 0.8 * x
  const df = (x: number) => 0.7 * x - 0.8
  const xScale = 55, yScale = 55, xOff = 40, yBase = 200

  // axes
  pic.edge(point(20, yBase), point(360, yBase), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })
  pic.edge(point(xOff, 235), point(xOff, 20), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })

  // f (solid) and f' (dashed) — plot() doesn't flip y, so pass -f
  pic.draw(plot((x) => -f(x), { domain: [-0.5, 5.5], xScale, yScale, xOffset: xOff, yOffset: yBase }),
    { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.draw(plot((x) => -df(x), { domain: [-0.5, 5.5], xScale, yScale, xOffset: xOff, yOffset: yBase }),
    { style: { stroke: '#94a3b8', dash: 'dashed' } })

  // tangent at x0 = 3.5: slope → angle → line of length 110 centered on the point
  const x0 = 3.5
  const P = point(xOff + x0 * xScale, yBase - f(x0) * yScale)
  const deg = Math.atan(df(x0)) * 180 / Math.PI   // screen: slope up = up
  const half = lineFromAngle(P, deg, 55)
  pic.draw(lineFromAngle(half.start, deg + 180, 110), { style: { stroke: '#dc2626', strokeWidth: 1.5 } })
  pic.filldraw(circle(P, 3.5), { style: { stroke: '#dc2626', fill: '#dc2626' } })
  pic.text(P.add(point(10, -14)), "$f'(3.5)$", { fontSize: 11, style: { stroke: '#dc2626' } })

  pic.text(point(340, 45), '$f$', { fontSize: 12, style: { stroke: '#2563eb' } })
  pic.text(point(340, 80), "$f'$", { fontSize: 12, style: { stroke: '#94a3b8' } })

  pic.mount(container, { width: 380, height: 250 })
}

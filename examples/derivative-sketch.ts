import { picture, plot, line, circle, point, polar } from 'jikz'

// f and f' on the same axes, with the tangent at one point computed
// from the derivative. The plot is drawn y-flipped (screen y grows
// downward), so the tangent's SCREEN angle is atan2(-f'(x)·yScale,
// xScale) — negating is what makes a positive slope point up and to
// the right, as the curve does.

export default function render(container: HTMLElement) {
  const pic = picture()
  const f = (x: number) => 0.35 * x * x - 0.8 * x
  const df = (x: number) => 0.7 * x - 0.8
  const xScale = 55, yScale = 55, xOff = 40, yBase = 200
  // Domain chosen so the parabola stays inside the frame: past x ≈ 4.4
  // it climbs off the top, and `fit: true` would then shrink everything
  // else to accommodate a curve running away.
  const DOMAIN: [number, number] = [-0.5, 4.4]

  // axes
  pic.edge(point(20, yBase), point(360, yBase), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })
  pic.edge(point(xOff, 235), point(xOff, 20), { arrowEnd: 'stealth' }, { style: { stroke: '#334155' } })

  // f (solid) and f' (dashed) — plot() doesn't flip y, so pass -f
  pic.draw(plot((x) => -f(x), { domain: DOMAIN, xScale, yScale, xOffset: xOff, yOffset: yBase }),
    { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.draw(plot((x) => -df(x), { domain: DOMAIN, xScale, yScale, xOffset: xOff, yOffset: yBase }),
    { style: { stroke: '#94a3b8', dash: 'dashed' } })

  // tangent at x0 = 3.5: slope → screen angle → a segment centred on P
  const x0 = 3.5
  const P = point(xOff + x0 * xScale, yBase - f(x0) * yScale)
  const deg = (Math.atan2(-df(x0) * yScale, xScale) * 180) / Math.PI
  pic.draw(line(P.add(polar(deg + 180, 55)), P.add(polar(deg, 55))),
    { style: { stroke: '#dc2626', strokeWidth: 1.5 } })
  pic.filldraw(circle(P, 3.5), {
    style: { stroke: '#dc2626', fill: '#dc2626' },
    label: { text: "$f'(3.5)$", at: 'north west', options: { fontSize: 11, style: { stroke: '#dc2626' } } },
  })

  // Curve names sit at the end of their own curve, derived from the
  // same functions — they follow when the domain or scale changes.
  const end = DOMAIN[1]
  pic.text(point(xOff + end * xScale, yBase - f(end) * yScale), '$f$',
    { at: 'east', distance: 5, fontSize: 12, style: { stroke: '#2563eb' } })
  pic.text(point(xOff + end * xScale, yBase - df(end) * yScale), "$f'$",
    { at: 'east', distance: 5, fontSize: 12, style: { stroke: '#94a3b8' } })

  pic.mount(container, { fit: true, padding: 14 })
}

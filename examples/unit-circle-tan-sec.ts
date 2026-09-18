import { picture, polar, circle, line, arc, point } from 'jikz'

// Companion to the derivative-of-sine card: tan and sec as lengths on
// the unit circle. tan θ is where the ray meets the vertical tangent
// line at (1,0); sec θ is the hypotenuse from origin to that point —
// both derived from the ray angle, nothing placed by hand.
//
// Convention note (as in unit-circle-derivative): TikZ math angles are
// ccw/y-up, jikz is cw/y-down, so (θ:r) → polar(-θ, r) and
// arc(0:θ:1) → arc(o, r, 0, -θ, true).

export default function render(container: HTMLElement) {
  const THETA = 55
  const R = 100
  const P = (deg: number, r: number) => polar(-deg, r)

  const pic = picture()
  const O = point(150, 180) // origin

  // axes
  pic.draw(line(point(O.x - 140, O.y), point(O.x + 170, O.y)), { style: { stroke: '#334155' } })
  pic.draw(line(point(O.x, O.y + 150), point(O.x, O.y - 150)), { style: { stroke: '#334155' } })

  // unit circle + ray at θ
  pic.draw(circle(O, R), { style: { strokeWidth: 2 } })
  const rayEnd = O.add(P(THETA, R * 1.55))
  pic.draw(line(O, rayEnd), { style: { stroke: '#94a3b8' } })

  // tangent line x = 1
  const T0 = point(O.x + R, O.y + 140), T1 = point(O.x + R, O.y - 140)
  pic.draw(line(T0, T1), { style: { stroke: '#e2e8f0' } })

  // tan: intersection of ray with x=1 → the vertical segment (1,0)-(1,tan θ)
  const tanLen = Math.tan((THETA * Math.PI) / 180) * R
  const tanTop = point(O.x + R, O.y - tanLen)
  pic.draw(line(point(O.x + R, O.y), tanTop), { style: { stroke: '#dc2626', strokeWidth: 2.5 } })

  // sec: origin to that intersection — the hypotenuse
  pic.draw(line(O, tanTop), { style: { stroke: '#7c3aed', strokeWidth: 2.5 } })

  // sin/cos legs for reference
  const onCircle = O.add(P(THETA, R))
  pic.draw(line(onCircle, point(onCircle.x, O.y)), { style: { stroke: '#2563eb', strokeWidth: 1.5 } })
  pic.draw(line(O, onCircle), { style: { stroke: '#334155', strokeWidth: 1.5 } })

  // θ arc + labels
  pic.draw(arc(O, 34, 0, -THETA, true), { style: { stroke: '#64748b' } })
  pic.text(O.add(P(THETA / 2, 50)), '$\\theta$', { style: { fontSize: 12 } })
  pic.text(point(O.x + R + 8, O.y - tanLen / 2), '$\\tan\\theta$', { textAnchor: 'start', style: { fontSize: 12, fill: '#dc2626' } })
  // sec labels the hypotenuse itself, so it rides further down the ray
  // than tan's label on the vertical — otherwise the two collide where
  // the secant meets the tangent.
  pic.text(O.add(P(THETA - 16, R * 0.72)), '$\\sec\\theta$', { style: { fontSize: 12, fill: '#7c3aed' } })
  pic.text(onCircle.add(point(6, -8)), '$(\\cos\\theta, \\sin\\theta)$', { textAnchor: 'start', style: { fontSize: 10 } })

  pic.mount(container, { fit: true, padding: 10 })
}

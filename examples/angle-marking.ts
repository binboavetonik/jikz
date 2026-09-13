import { picture, point, polar, angleMark, rightAngleMark } from 'jikz'

// TikZ's angles library, \pic {angle = A--B--C}. The pic splits into
// background code (the filled wedge, drawn behind the path) and
// foreground code (the stroked arc, drawn in front); here that split is
// literally fill() before the rays and draw() after them.
//
// Four rays trisect a right angle, so the three marks tile the quadrant
// the dashed square encloses.

export default function render(container: HTMLElement) {
  const pic = picture()

  const O = point(64, 178)
  const L = 150

  // Screen convention: negative angles point up.
  const A = O.add(polar(0, L))
  const B = O.add(polar(-30, L))
  const C = O.add(polar(-60, L))
  const D = O.add(polar(-90, L))

  // The middle argument is the vertex, and order is not symmetric:
  // (B, O, A) sweeps from ray OB round to ray OA, which is the 30° we
  // want — (A, O, B) would mark the 330° reflex angle instead.
  const marks = [
    { m: angleMark(B, O, A, { radius: 78 }), text: '$\\alpha$', hue: '#2563eb' },
    { m: angleMark(C, O, B, { radius: 78 }), text: '$\\beta$', hue: '#7c3aed' },
    { m: angleMark(D, O, C, { radius: 78 }), text: '$\\gamma$', hue: '#d97706' },
  ]

  // background code — wedges go down first, so the rays cross them
  for (const { m, hue } of marks) {
    pic.fill(m.wedge, { style: { fill: hue, fillOpacity: 0.12 } })
  }

  // \draw (O) -- (A) (O) -- (B) (O) -- (C) (O) -- (D)
  pic.pen({ style: { stroke: '#334155', strokeWidth: 1.5 } })
    .moveTo(O).lineTo(A)
    .moveTo(O).lineTo(B)
    .moveTo(O).lineTo(C)
    .moveTo(O).lineTo(D)

  // foreground code — arcs and their labels ride on top. labelAt is the
  // pic's text node: angle eccentricity (0.6) of the way out along the
  // bisector, no hand-placed offsets.
  for (const { m, text, hue } of marks) {
    pic.draw(m.outline, { style: { stroke: hue, strokeWidth: 1.6 } })
    pic.text(m.labelAt, text, { fontSize: 13, style: { fill: hue } })
  }

  // \pic {right angle = D--O--A}: same options, a square instead of an
  // arc. Pushing eccentricity past 1 parks the reading outside it.
  const square = rightAngleMark(D, O, A, { radius: 105, eccentricity: 1.18 })
  pic.draw(square.outline, {
    style: { stroke: '#94a3b8', strokeWidth: 1.2, strokeDasharray: '4 3' },
  })
  pic.text(square.labelAt, `${square.sweep.toFixed(0)}°`, {
    fontSize: 12,
    style: { fill: '#64748b' },
  })

  pic.mount(container, { width: 330, height: 215 })
}

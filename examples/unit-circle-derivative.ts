import { picture, point, origin, polar, circle, line, arc } from 'jikz'

export default function render(container: HTMLElement) {
  const THETA = 50              // 	hetaVal
  const AXIS = 130, R = 100     // axisLen=1.3, r=1 (scale=2.7 baked into px)

  // TikZ (θ:r) math-convention → jikz screen-convention point
  const P = (deg: number, r: number) => polar(-deg, r)

  const pic = picture()

  // Axes with inline labels — TikZ: draw(-1.3,0)--(1.3,0) node[right]{$cos$}
  pic.draw(line(point(-AXIS, 0), point(AXIS, 0)), {
    label: { text: '$\\cos$', at: 'east', distance: 6, style: { fontSize: 13 } },
  })
  pic.draw(line(point(0, AXIS), point(0, -AXIS)), {
    label: { text: '$\\sin$', at: 'north', distance: 6, style: { fontSize: 13 } },
  })

  // Unit circle, thick
  pic.draw(circle(origin, R), { style: { strokeWidth: 2 } })

  // Cardinal dots with inline labels (below right / below left / below left / above left)
  const dots = [
    { at: point(R, 0),  label: '1',  place: 'south east' },
    { at: point(-R, 0), label: '-1', place: 'south west' },
    { at: point(0, R),  label: '-1', place: 'south west' },
    { at: point(0, -R), label: '1',  place: 'north west' },
  ]
  for (const { at, label, place } of dots) {
    pic.fill(circle(at, 1.5), {
      label: { text: label, at: place, distance: 4, style: { fontSize: 11 } },
    })
  }

  // Radius at θ
  pic.draw(line(origin, P(THETA, R)))

  // Filled wedge as one fluent pen statement (fill mode) — the
  // original fills the triangle chord, not a sector
  pic.pen({ mode: 'fill', style: { fill: '#c0392b', fillOpacity: 0.85 } })
    .moveTo(origin)
    .lineTo(P(THETA, R))
    .lineTo(point(R, 0))
    .close()

  // Angle arc along the unit circle: TikZ arc(0:θ:1)
  pic.draw(arc(origin, R, 0, -THETA, true))

  // 'h' at (θ/2 : 1/4)
  pic.text(P(THETA / 2, 30), 'h', { style: { fontSize: 13 } })

  // TikZ auto-sizes the picture to its content — so does fit
  pic.mount(container, { fit: true, padding: 8 })
}

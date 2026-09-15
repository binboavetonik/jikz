import { picture, triangle, circle, line, point, polar } from 'jikz'

// The incircle: tangent to all three sides, centered where the angle
// bisectors meet. Bisectors are derived (vertex + unit vectors along
// the adjacent sides), the radius is the incenter's distance to a
// side — computed via projection, not lookup.

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(70, 200), B = point(330, 190), C = point(160, 40)
  const tri = triangle(A, B, C)

  pic.draw(tri, { style: { stroke: '#334155', strokeWidth: 2 } })

  const I = tri.incenter

  // inradius: distance from I to side AB (project onto AB's normal)
  const ab = A.angleTo(B)
  const normal = point(Math.sin((ab * Math.PI) / 180), -Math.cos((ab * Math.PI) / 180))
  const r = Math.abs((I.x - A.x) * normal.x + (I.y - A.y) * normal.y)
  pic.draw(circle(I, r), { style: { stroke: '#dc2626', strokeWidth: 1.5 } })

  // angle bisector rays from each vertex through I
  for (const V of [A, B, C]) {
    const end = I.add(polar(V.angleTo(I), 60)) // past the incenter
    pic.draw(line(V, end), { style: { stroke: '#2563eb', dash: 'dashed' } })
  }

  pic.draw(I, {
    style: { stroke: '#dc2626', strokeWidth: 3 },
    label: { text: 'I', at: 'north east', distance: 6, options: { fontSize: 11, style: { stroke: '#dc2626' } } },
  })

  pic.mount(container, { fit: true, padding: 14 })
}

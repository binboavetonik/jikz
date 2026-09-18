import { picture, triangle, line, point } from 'jikz'

// Triangle's computed properties do the geometry: `circumcircle` is
// the circle through all three vertices, `centroid` the point where
// the medians meet. Nothing here is a hand-placed coordinate — move a
// vertex and every derived object follows.

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(40, 190), B = point(300, 190), C = point(105, 20)
  const tri = triangle(A, B, C)

  pic.draw(tri.circumcircle, { style: { stroke: '#c4b5fd', dash: 'dashed' } })
  pic.draw(tri, { style: { stroke: '#334155', strokeWidth: 2 } })

  // medians: each vertex to the midpoint of the opposite side
  for (const [V, P, Q] of [[A, B, C], [B, C, A], [C, A, B]] as const) {
    pic.draw(line(V, P.midpoint(Q)), { style: { stroke: '#fca5a5', strokeWidth: 1 } })
  }

  // Labels ride the marker's own boundary — `at` picks a direction and
  // the gap is measured from the text box, so nothing lands on the dot.
  const text = { fontSize: 10 }
  pic.draw(tri.centroid, {
    style: { stroke: '#dc2626', strokeWidth: 2.5 },
    label: { text: 'centroid', at: 'north west', style: { ...text, fill: '#dc2626' } },
  })
  pic.draw(tri.circumcenter, {
    style: { stroke: '#7c3aed', strokeWidth: 2.5 },
    label: { text: 'circumcenter', at: 'south east', style: { ...text, fill: '#7c3aed' } },
  })

  for (const [V, at, name] of [[A, 'south west', 'A'], [B, 'south east', 'B'], [C, 'north', 'C']] as const) {
    pic.draw(V, { style: { stroke: '#334155', strokeWidth: 2 }, label: { text: name, at, style: text } })
  }

  pic.mount(container, { fit: true, padding: 14 })
}

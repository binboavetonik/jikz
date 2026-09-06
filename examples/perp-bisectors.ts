import { picture, triangle, line, circle, point, polar, intersectLineLine, type Point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(70, 190), B = point(330, 170), C = point(190, 40)
  const tri = triangle(A, B, C)

  // Perpendicular bisector of PQ: through the midpoint, along the side's normal
  const perpBisector = (P: Point, Q: Point, len: number) => {
    const M = P.midpoint(Q)
    const L = Math.hypot(Q.x - P.x, Q.y - P.y)
    const nx = -(Q.y - P.y) / L, ny = (Q.x - P.x) / L
    return line(point(M.x - nx * len, M.y - ny * len), point(M.x + nx * len, M.y + ny * len))
  }
  const bisAB = perpBisector(A, B, 110)
  const bisAC = perpBisector(A, C, 110)

  pic.draw(tri, { style: { stroke: '#334155', strokeWidth: 2 } })
  pic.draw(bisAB, { style: { stroke: '#2563eb', dash: 'dashed' } })
  pic.draw(bisAC, { style: { stroke: '#2563eb', dash: 'dashed' } })
  pic.draw(A.midpoint(B), { style: { stroke: '#2563eb', strokeWidth: 2.5 } })
  pic.draw(A.midpoint(C), { style: { stroke: '#2563eb', strokeWidth: 2.5 } })

  // O constructed — identical to tri.circumcenter, but derived on screen
  const O = intersectLineLine(bisAB, bisAC).points[0]!
  pic.draw(circle(O, O.distanceTo(A)), { style: { stroke: '#dc2626', strokeWidth: 1.5 } })
  pic.draw(O, { style: { stroke: '#dc2626', strokeWidth: 3 } })
  pic.text(O.add(point(14, 4)), 'O', { fontSize: 11, style: { stroke: '#dc2626' } })

  const G = tri.centroid
  for (const { v, name } of [{ v: A, name: 'A' }, { v: B, name: 'B' }, { v: C, name: 'C' }]) {
    pic.draw(v, { style: { stroke: '#111827', strokeWidth: 2.5 } })
    pic.text(v.add(polar(G.angleTo(v), 16)), name, { fontSize: 11 })
  }

  pic.mount(container, { width: 400, height: 240 })
}

import { picture, triangle, line, circle, point, polar } from 'jikz'

// The Euler line: centroid, circumcenter, and orthocenter of any
// (non-equilateral) triangle are collinear. All three centers come
// from Triangle's computed properties; the line through them is
// derived, not placed — the figure proves itself.

export default function render(container: HTMLElement) {
  const pic = picture()
  const tri = triangle(point(60, 190), point(320, 180), point(150, 40))

  pic.draw(tri, { style: { stroke: '#334155', strokeWidth: 2 } })

  const G = tri.centroid        // intersection of medians
  const O = tri.circumcenter    // perpendicular bisectors
  const H = tri.orthocenter     // altitudes

  // the Euler line: through O and G, extended past both ends
  const dir = O.angleTo(G)
  const e1 = O.add(polar(dir + 180, 70))
  const e2 = G.add(polar(dir, 190))
  pic.draw(line(e1, e2), { style: { stroke: '#94a3b8', dash: 'dashed' } })

  // faint circumcircle for context (centered at O)
  pic.draw(circle(O, O.distanceTo(point(60, 190))), { style: { stroke: '#e2e8f0' } })

  for (const { p, name, color } of [
    { p: G, name: 'G centroid', color: '#dc2626' },
    { p: O, name: 'O circumcenter', color: '#7c3aed' },
    { p: H, name: 'H orthocenter', color: '#2563eb' },
  ]) {
    pic.draw(p, { style: { stroke: color, strokeWidth: 3 } })
    pic.text(p.add(polar(dir + 90, 14)), name, { fontSize: 10, style: { stroke: color } })
  }

  pic.mount(container, { fit: true, padding: 14 })
}

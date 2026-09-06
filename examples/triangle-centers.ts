import { picture, triangle, circle, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const tri = triangle(point(50, 120), point(250, 110), point(140, 20))

  pic.draw(tri, { style: { stroke: '#334155', strokeWidth: 2 } })

  // Circumcircle: centered at the circumcenter, through the vertices
  const cc = tri.circumcenter
  const r = cc.distanceTo(point(50, 120))
  pic.draw(circle(cc, r), { style: { stroke: '#c4b5fd', dash: 'dashed' } })

  pic.draw(tri.centroid, { style: { stroke: '#dc2626', strokeWidth: 2.5 } })
  pic.text(point(tri.centroid.x + 24, tri.centroid.y), 'centroid', { fontSize: 10 })
  pic.draw(cc, { style: { stroke: '#7c3aed', strokeWidth: 2.5 } })
  pic.text(point(cc.x + 34, cc.y), 'circumcenter', { fontSize: 10 })

  pic.mount(container, { width: 300, height: 160 })
}

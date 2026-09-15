import { picture, circleThrough, line, point } from 'jikz'

// circleThrough: the unique circle through three non-collinear points
// (null when they ARE collinear). Vertex labels point away from the
// center, so each name leaves its own marker alone.

export default function render(container: HTMLElement) {
  const pic = picture()
  const P1 = point(80, 150), P2 = point(260, 50), P3 = point(340, 180)

  const c = circleThrough(P1, P2, P3)! // null only when collinear

  pic.draw(c, { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.draw(line(P1, P2), { style: { stroke: '#cbd5e1', dash: 'dashed' } })
  pic.draw(line(P2, P3), { style: { stroke: '#cbd5e1', dash: 'dashed' } })
  pic.draw(line(P1, P3), { style: { stroke: '#cbd5e1', dash: 'dashed' } })

  for (const { p, name } of [{ p: P1, name: 'P1' }, { p: P2, name: 'P2' }, { p: P3, name: 'P3' }]) {
    pic.draw(p, {
      style: { stroke: '#dc2626', strokeWidth: 3 },
      label: { text: name, at: c.center.angleTo(p), options: { fontSize: 11 } },
    })
  }
  pic.draw(c.center, {
    style: { stroke: '#111827', strokeWidth: 2.5 },
    label: { text: 'O', at: 'south east', options: { fontSize: 11 } },
  })

  pic.mount(container, { fit: true, padding: 14 })
}

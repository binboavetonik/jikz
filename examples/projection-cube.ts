import { picture, point } from 'jikz'
import { tdplot } from 'jikz/projection'

// tikz-3dplot's \tdplotsetmaincoords{70}{110}, as jikz's projection
// stage: every 3D point becomes a 2D one and the picture draws that.
// A unit cube, the three axes with labels, and a shaded top face —
// ordered by hand, as TikZ's 3D is (no depth sorting).

export default function render(container: HTMLElement) {
  const pic = picture()
  const P = tdplot(70, 110, 70)
  const O = point(150, 150)
  const at = (x: number, y: number, z: number) => O.add(P.point(x, y, z))

  // axes
  const { x, y, z } = P.axes(1.8)
  for (const [axis, label] of [[x, '$x$'], [y, '$y$'], [z, '$z$']] as const) {
    pic.edge(O.add(axis.start), O.add(axis.end), { arrowEnd: '->', label: { text: label, pos: 1, offset: 10 }, style: { stroke: '#64748b' } })
  }

  // back edges first, dashed; then the faces; then the front edges
  pic.pen({ style: { stroke: '#94a3b8', dash: 'dashed' } })
    .moveTo(at(0, 0, 0)).lineTo(at(1, 0, 0)).lineTo(at(1, 1, 0)).lineTo(at(0, 1, 0)).close()
    .moveTo(at(0, 0, 0)).lineTo(at(0, 0, 1))
  pic.pen({ style: { stroke: '#2563eb', fill: '#dbeafe', fillOpacity: 0.7 }, mode: 'filldraw' })
    .moveTo(at(0, 0, 1)).lineTo(at(1, 0, 1)).lineTo(at(1, 1, 1)).lineTo(at(0, 1, 1)).close()
  pic.pen({ style: { stroke: '#2563eb', strokeWidth: 1.2 } })
    .moveTo(at(1, 0, 0)).lineTo(at(1, 0, 1))
    .moveTo(at(1, 1, 0)).lineTo(at(1, 1, 1))
    .moveTo(at(0, 1, 0)).lineTo(at(0, 1, 1))

  pic.mount(container, { fit: true, padding: 16 })
}

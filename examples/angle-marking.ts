import { picture, polar, point } from 'jikz'
import { angle, rightAngle } from 'jikz/angles'

// TikZ's angles library: \pic [draw, fill=blue!20, "$\alpha$"] {angle = A--O--B}.
// angle() is one value — the wedge takes the verb's fill, the arc its
// stroke, and the label sits at angle eccentricity × radius along the
// bisector, exactly as the pic does. Swept counter-clockwise on the
// page from the first ray to the second, so B--O--A and A--O--B are
// the two complementary marks.

export default function render(container: HTMLElement) {
  const pic = picture()

  const O = point(90, 170)
  const A = O.add(polar(0, 200))
  const B = O.add(polar(-35, 190))
  const C = O.add(polar(-80, 130))
  const D = O.add(polar(-90, 110))

  pic.pen({ style: { stroke: '#334155', strokeWidth: 1.5 } })
    .moveTo(O).lineTo(A)
    .moveTo(O).lineTo(B)
    .moveTo(O).lineTo(C)
    .moveTo(O).lineTo(D)

  pic.filldraw(angle(A, O, B, { radius: 46, label: '$\\alpha$', labelStyle: { fontSize: 12, fill: '#2563eb' } }),
    { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  pic.filldraw(angle(B, O, C, { radius: 30, eccentricity: 1.3, label: '$\\beta$', labelStyle: { fontSize: 12, fill: '#dc2626' } }),
    { style: { stroke: '#dc2626', fill: '#fee2e2', strokeWidth: 1.5 } })
  pic.draw(rightAngle(A, O, D, { radius: 14 }), { style: { stroke: '#64748b' } })

  pic.mount(container, { width: 310, height: 200 })
}

import { picture, polar, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // Three rays from one vertex (screen convention: negative = up)
  const O = point(90, 170)
  const A = O.add(polar(0, 200))
  const B = O.add(polar(-35, 190))
  const C = O.add(polar(-80, 130))

  // draw (O) -- (A) (O) -- (B) (O) -- (C) — one pen statement,
  // three subpaths (mid-path moveTo lifts the pen)
  pic.pen({ style: { stroke: '#334155', strokeWidth: 1.5 } })
    .moveTo(O).lineTo(A)
    .moveTo(O).lineTo(B)
    .moveTo(O).lineTo(C)

  // Mark the adjacent angles like \pic [draw] {angle = B--O--A} —
  // each arc is a pen statement; the label rides the arc by arc
  // length (pos), pushed radially outward (offset = left of travel)
  pic.pen({ style: { stroke: '#2563eb', strokeWidth: 1.5 } })
    .moveTo(O.add(polar(-35, 46)))
    .circularArcTo(46, false, true, O.add(polar(0, 46)))
    .label('$\\alpha$', { pos: 0.5, offset: 20, options: { fontSize: 12, style: { stroke: '#2563eb' } } })
  pic.pen({ style: { stroke: '#dc2626', strokeWidth: 1.5 } })
    .moveTo(O.add(polar(-80, 30)))
    .circularArcTo(30, false, true, O.add(polar(-35, 30)))
    .label('$\\beta$', { pos: 0.5, offset: 20, options: { fontSize: 12, style: { stroke: '#dc2626' } } })

  pic.mount(container, { width: 310, height: 200 })
}

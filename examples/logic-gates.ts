import { allShapes, picture, point } from 'jikz'
import { gateShapes, gates } from 'jikz/gates'
import { junctionDot, wire } from 'jikz/circuits'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: { ...allShapes, ...gateShapes } })

  // Half adder: Sum = A XOR B, Carry = A AND B.
  pic.node('X', gates.xor({ at: point(110, 70) }))
  pic.node('C', gates.and({ at: point(110, 150) }))

  // Two input rails, each tapped twice. wire() draws a polyline with the
  // arrowheads off (jikz edges default to a stealth tip, wrong for a
  // schematic) and takes corners, so the runs stay orthogonal.
  const aRail = point(40, 57.5)
  const bRail = point(55, 82.5)

  pic.coordinate('a', point(16, 57.5))
  pic.coordinate('b', point(16, 82.5))

  wire(pic, ['a', aRail, 'X.in1'])
  wire(pic, [aRail, point(aRail.x, 137.5), 'C.in1'])
  wire(pic, ['b', bRail, 'X.in2'])
  wire(pic, [bRail, point(bRail.x, 162.5), 'C.in2'])

  // A dot marks a tap; the A rail crossing B's run below is not a join.
  pic.fill(junctionDot(aRail))
  pic.fill(junctionDot(bRail))

  // Outputs.
  wire(pic, ['X.out', point(178, 70)])
  wire(pic, ['C.out', point(178, 150)])

  // `at` places the text on that side OF the point, so an east label
  // sits to the right of the wire's end.
  pic.text(point(8, 57.5), 'A')
  pic.text(point(8, 82.5), 'B')
  pic.text(point(184, 70), 'Sum', { at: 'east' })
  pic.text(point(184, 150), 'Carry', { at: 'east' })

  pic.mount(container, { width: 240, height: 200 })
}

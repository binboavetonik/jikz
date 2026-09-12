import { picture, registerGates, gates, point } from 'jikz'

registerGates()

export default function render(container: HTMLElement) {
  const pic = picture()

  // Half adder: Sum = A XOR B, Carry = A AND B.
  pic.node('X', gates.xor({ at: point(90, 70) }))
  pic.node('C', gates.and({ at: point(90, 150) }))

  // Named input taps.
  pic.coordinate('a', point(20, 50))
  pic.coordinate('b', point(20, 90))

  // Inputs → gates (port specs resolve at runtime).
  pic.edge('a', 'X.in1', { arrowEnd: 'none' })
  pic.edge('b', 'X.in2', { arrowEnd: 'none' })
  pic.edge('a', 'C.in1', { arrowEnd: 'none' })
  pic.edge('b', 'C.in2', { arrowEnd: 'none' })

  // Labels.
  pic.text(point(12, 50), 'A', { at: 'west' })
  pic.text(point(12, 90), 'B', { at: 'west' })
  pic.text(point(170, 70), 'Sum', { at: 'west' })
  pic.text(point(170, 150), 'Carry', { at: 'west' })

  pic.mount(container, { width: 230, height: 190 })
}

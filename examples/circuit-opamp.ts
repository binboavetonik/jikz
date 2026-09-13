import { allShapes, circuit, circuitShapes, junctionDot, opAmp, picture, point, resistor, wire } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: { ...allShapes, ...circuitShapes } })
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }

  // Typed instances: ports are Points (u1.minus/.plus/.out) that
  // autocomplete in the IDE. Each instance doubles as its node's shape.
  const u1 = opAmp({ center: point(200, 120) })
  const rin = resistor({ center: point(95, 104) })
  const rf = resistor({ center: point(150, 55) })
  pic.node('U1', { shape: u1 }, { style: sym })
  pic.node('Rin', { shape: rin }, { style: sym })
  pic.node('Rf', { shape: rf }, { style: sym })
  pic.node('GND', circuit.ground({ at: point(170, 190), anchor: 'in' }), { style: sym })

  // Signal path: Vin → Rin → inverting input node J (145,104).
  // No strings: every endpoint is a Point or a typed port.
  wire(pic, [point(30, 104), rin.in])
  wire(pic, [rin.out, u1.minus])

  // Feedback loop: from the in- junction up, through Rf, down to the output node
  const J = point(145, 104) // on the Rin→U1.minus wire
  wire(pic, [rf.out, point(250, 55), point(250, 120), u1.out])
  wire(pic, [J, point(145, 55), rf.in])
  wire(pic, [u1.out, point(250, 120)])

  // Vout tap + non-inverting input to ground
  wire(pic, [point(250, 120), point(285, 120)])
  pic.fill(junctionDot(point(250, 120)))
  pic.fill(junctionDot(J))
  wire(pic, [u1.plus, point(170, 190)])

  pic.text(point(18, 107), 'Vin', { fontSize: 12 })
  pic.text(point(95, 88), 'Rin', { fontSize: 11 })
  pic.text(point(150, 40), 'Rf', { fontSize: 11 })
  pic.text(point(293, 123), 'Vout', { fontSize: 12, textAnchor: 'start' })
  pic.text(point(230, 146), 'U1', { fontSize: 11 })

  pic.mount(container, { width: 320, height: 240 })
}

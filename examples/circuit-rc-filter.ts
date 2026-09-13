import { allShapes, circuit, circuitShapes, junctionDot, picture, point, wire } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: { ...allShapes, ...circuitShapes } })
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }

  // Typed builders place every symbol — no shape-name strings to
  // memorize or mistype. Source and capacitor rotate 90° for vertical
  // branches; grounds are placed BY their 'in' terminal (at + anchor).
  pic.node('V1', circuit.voltageSource({ at: point(60, 120), rotate: 90 }), { style: sym })
  pic.node('R1', circuit.resistor({ at: point(140, 60) }), { style: sym })
  pic.node('C1', circuit.capacitor({ at: point(220, 120), rotate: 90 }), { style: sym })
  pic.node('G1', circuit.ground({ at: point(60, 180), anchor: 'in' }), { style: sym })
  pic.node('G2', circuit.ground({ at: point(220, 180), anchor: 'in' }), { style: sym })

  // Wiring: name.port specs resolve through the port table — no
  // hand-computed coordinates except the two rail corners. A typo'd
  // port throws AnchorError listing the valid names; the op-amp card
  // shows the fully-typed (string-free) alternative.
  wire(pic, ['V1.in', point(60, 60), 'R1.in'])
  wire(pic, ['R1.out', point(220, 60), 'C1.in'])
  wire(pic, ['V1.out', point(60, 180)])
  wire(pic, ['C1.out', point(220, 180)])
  wire(pic, [point(60, 180), point(220, 180)])

  // Output node: junction dot + Vout label.
  pic.fill(junctionDot(point(220, 60)))
  pic.text(point(240, 63), 'Vout', { fontSize: 12, textAnchor: 'start' })
  pic.text(point(140, 45), 'R', { fontSize: 12 })
  pic.text(point(30, 120), 'V', { fontSize: 12 })
  pic.text(point(238, 120), 'C', { fontSize: 12 })

  pic.mount(container, { width: 320, height: 210 })
}

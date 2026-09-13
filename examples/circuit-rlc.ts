import { allShapes, circuit, circuitShapes, junctionDot, picture, point, wire } from 'jikz'

// A series RLC tank driven by an AC source: source on the left rail,
// R–L–C across the top and down the right, ground return on the
// bottom. Same port discipline as the RC filter card — every
// connection is a name.port spec, not a coordinate.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: { ...allShapes, ...circuitShapes } })
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }

  pic.node('V1', circuit.voltageSource({ at: point(60, 130), rotate: 90 }), { style: sym })
  pic.node('R1', circuit.resistor({ at: point(130, 60) }), { style: sym })
  pic.node('L1', circuit.inductor({ at: point(210, 60) }), { style: sym })
  pic.node('C1', circuit.capacitor({ at: point(290, 130), rotate: 90 }), { style: sym })
  pic.node('G1', circuit.ground({ at: point(60, 190), anchor: 'in' }), { style: sym })
  pic.node('G2', circuit.ground({ at: point(290, 190), anchor: 'in' }), { style: sym })

  wire(pic, ['V1.in', point(60, 60), 'R1.in'])
  wire(pic, ['R1.out', 'L1.in'])
  wire(pic, ['L1.out', point(290, 60), 'C1.in'])
  wire(pic, ['V1.out', point(60, 190)])
  wire(pic, ['C1.out', point(290, 190)])
  wire(pic, [point(60, 190), point(290, 190)])

  pic.fill(junctionDot(point(290, 60)))
  pic.text(point(310, 63), 'out', { fontSize: 12, textAnchor: 'start' })
  pic.text(point(130, 45), 'R', { fontSize: 12 })
  pic.text(point(210, 45), 'L', { fontSize: 12 })
  pic.text(point(308, 130), 'C', { fontSize: 12 })

  pic.mount(container, { width: 360, height: 230 })
}

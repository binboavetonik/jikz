import { allShapes, picture, point } from 'jikz'
import { circuit, circuitShapes, resistor, wire } from 'jikz/circuits'

export default function render(container: HTMLElement) {
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }

  // ── Style 1: string specs (TikZ-familiar, data-driven) ──
  const strings = picture({ shapes: { ...allShapes, ...circuitShapes } })
  strings.text(point(150, 16), 'string specs — ports checked at runtime', { style: { fontSize: 11 } })
  strings.node('V1', { shape: 'voltage source', at: point(50, 110), rotate: 90, style: sym })
  strings.node('R1', { shape: 'resistor', at: point(150, 55), style: sym })
  strings.node('D1', { shape: 'diode', shapeOptions: { variant: 'led' }, at: point(240, 110), rotate: 90, style: sym })
  strings.node('G1', { shape: 'ground', at: point(50, 165), anchor: 'in', style: sym })
  strings.node('G2', { shape: 'ground', at: point(240, 165), anchor: 'in', style: sym })
  wire(strings, ['V1.in', point(50, 55), 'R1.in'])
  wire(strings, ['R1.out', point(240, 55), 'D1.in'])
  wire(strings, ['V1.out', point(50, 165), point(240, 165), 'D1.out'])

  // ── Style 2: typed builders + typed port Points ──
  const typed = picture({ shapes: { ...allShapes, ...circuitShapes } })
  typed.text(point(150, 16), 'typed builders — compile-time checked', { style: { fontSize: 11 } })
  typed.node('V1', { ...circuit.voltageSource({ at: point(50, 110), rotate: 90 }), style: sym })
  const r1 = resistor({ center: point(150, 55) }) // typed instance
  typed.node('R1', { shape: r1, style: sym })
  typed.node('D1', { ...circuit.diode({ at: point(240, 110), rotate: 90, variant: 'led' }), style: sym })
  typed.node('G1', { ...circuit.ground({ at: point(50, 165), anchor: 'in' }), style: sym })
  typed.node('G2', { ...circuit.ground({ at: point(240, 165), anchor: 'in' }), style: sym })
  wire(typed, ['V1.in', point(50, 55), r1.in])     // Points are valid endpoints…
  wire(typed, [r1.out, point(240, 55), 'D1.in'])   // …and mix with strings
  wire(typed, ['V1.out', point(50, 165), point(240, 165), 'D1.out'])

  strings.mount(container, { width: 300, height: 190 })
  typed.mount(container, { width: 300, height: 190 })
}

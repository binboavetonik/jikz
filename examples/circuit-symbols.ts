import { allShapes, picture, point, type NodeOptions } from 'jikz'
import { circuit, circuitShapes } from 'jikz/circuits'

export default function render(container: HTMLElement) { // once, like \usetikzlibrary{circuits.ee}
  const pic = picture({ shapes: { ...allShapes, ...circuitShapes } })
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }

  // circuit.* option builders: symbol names and variants autocomplete
  // in the IDE — a typo is a compile error, not a runtime surprise.
  const cells: [options: NodeOptions, label: string][] = [
    [circuit.resistor(), 'resistor (ANSI)'],
    [circuit.resistor({ variant: 'iec' }), 'resistor (IEC)'],
    [circuit.capacitor(), 'capacitor'],
    [circuit.inductor(), 'inductor'],
    [circuit.diode(), 'diode'],
    [circuit.diode({ variant: 'zener' }), 'Zener'],
    [circuit.diode({ variant: 'led' }), 'LED'],
    [circuit.switch(), 'switch'],
    [circuit.voltageSource(), 'voltage source'],
    [circuit.currentSource(), 'current source'],
    [circuit.ground(), 'ground'],
    [circuit.opAmp(), 'op amp'],
  ]

  cells.forEach(([options, label], i) => {
    const x = 70 + (i % 4) * 120
    const y = 45 + Math.floor(i / 4) * 85
    pic.node('s' + i, { ...options, at: point(x, y), style: sym })
    pic.text(point(x, y + 38), label, { style: { fontSize: 10 } })
  })

  pic.mount(container, { width: 500, height: 280 })
}

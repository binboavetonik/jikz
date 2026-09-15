import {
  allShapes, circuit, circuitShapes, current, openTerminal, picture, point, voltage, wire,
} from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: { ...allShapes, ...circuitShapes } })
  const sym = { stroke: '#0f172a', strokeWidth: 1.6 }
  const mark = { stroke: '#2563eb', strokeWidth: 1.2 }
  const open = { stroke: '#7c3aed', strokeWidth: 1.2 }

  // A source driving a resistor, with the output left open — the
  // classic "measure the open-circuit voltage" figure.
  pic.node('V1', circuit.voltageSource({ at: point(60, 120), rotate: 90 }), { style: sym })
  pic.node('R1', circuit.resistor({ at: point(160, 60) }), { style: sym })
  pic.node('G1', circuit.ground({ at: point(60, 190), anchor: 'in' }), { style: sym })

  wire(pic, ['V1.in', point(60, 60), 'R1.in'])
  wire(pic, ['R1.out', point(250, 60)])
  wire(pic, ['V1.out', point(60, 190)])
  wire(pic, [point(60, 190), point(250, 190)])

  // The output terminals: nothing is connected to them, so they are
  // open circles rather than junction dots.
  const top = point(250, 60)
  const bottom = point(250, 190)
  pic.draw(openTerminal(top), { style: open })
  pic.draw(openTerminal(bottom), { style: open })

  // Annotations — circuitikz's v= and i= as functions over two points.
  // `side` is relative to the direction of travel, so these follow the
  // endpoints rather than the page.
  // Labels take KaTeX when a math renderer is injected ('$u_R$');
  // plain text keeps this card readable in the static gallery.
  current(pic, 'R1.in', 'R1.out', { label: 'i', side: 'left', labelDistance: 13, style: mark })
  voltage(pic, 'R1.in', 'R1.out', { label: 'u\u1d63', side: 'right', distance: 22, style: mark })

  // And across the open pair: no component, so in circuitikz this
  // needs a placeholder bipole that draws nothing. Here it is just two
  // points with a voltage between them.
  voltage(pic, top, bottom, {
    label: 'u\u2092\u2091', curly: true, side: 'right', distance: 16, amplitude: 9, style: open,
  })

  pic.mount(container, { width: 340, height: 240 })
}

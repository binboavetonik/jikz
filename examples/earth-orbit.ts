import { allShapes, ellipse, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const orbit = ellipse(point(220, 115), 160, 75)
  pic.draw(orbit, { style: { stroke: '#334155', strokeWidth: 1.5 } })

  // Sun at a focus — Kepler's first law. Radius 10 keeps the disc clear
  // of the perihelion Earth dot (focus distance ≈ 18.7 from the orbit).
  pic.node('sun', {
    at: orbit.foci[1], shape: 'circle', width: 20, height: 20,
    labels: [{ text: 'Sun', at: 'south', distance: 4, style: { fontSize: 11 } }],
    style: { stroke: '#d97706', fill: '#fbbf24', strokeWidth: 2 }
  })

  // the empty second focus
  pic.node('f2', {
    at: orbit.foci[0], shape: 'circle', width: 6, height: 6,
    labels: [{ text: 'F2', at: 'south', distance: 4, style: { fontSize: 10, fill: '#94a3b8' } }],
    style: { stroke: '#94a3b8', fill: '#94a3b8', strokeWidth: 1 }
  })

  // Earth at four true anomalies. Labels ride the node's border
  // (`at` = radially outward), so the measured text can never overlap
  // the dot — no hand-computed offsets.
  const anomalies: [angle: number, name: string, label: string, labelAt: 'east' | 'west'][] = [
    [0, 'peri', 'perihelion', 'east'],
    [90, 'earth90', '', 'east'],
    [180, 'ap', 'aphelion', 'west'],
    [270, 'earth270', '', 'east'],
  ]
  for (const [angle, name, label, labelAt] of anomalies) {
    pic.node(name, {
      at: orbit.pointAt(angle), shape: 'circle', width: 10, height: 10,
      labels: label
        ? [{ text: label, at: labelAt, distance: 4, style: { fontSize: 10 } }]
        : [],
      style: { stroke: '#2563eb', fill: '#93c5fd', strokeWidth: 1.5 }
    })
  }

  pic.mount(container, { width: 440, height: 230 })
}

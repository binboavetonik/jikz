import { picture, ellipse, circle, point, polar } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const orbit = ellipse(point(220, 115), 160, 75)
  pic.draw(orbit, { style: { stroke: '#334155', strokeWidth: 1.5 } })

  // Sun at a focus — Kepler's first law
  const sun = orbit.foci[1]
  pic.filldraw(circle(sun, 13), { style: { stroke: '#d97706', fill: '#fbbf24', strokeWidth: 2 } })
  pic.text(sun.add(point(0, 30)), 'Sun', { fontSize: 11 })

  // the empty second focus
  pic.draw(orbit.foci[0], { style: { stroke: '#94a3b8', strokeWidth: 2 } })
  pic.text(orbit.foci[0].add(point(0, 18)), 'F2', { fontSize: 10, style: { stroke: '#94a3b8' } })

  // Earth at four true anomalies
  const anomalies: [angle: number, label: string][] = [[0, 'perihelion'], [90, ''], [180, 'aphelion'], [270, '']]
  for (const [angle, label] of anomalies) {
    const p = orbit.pointAt(angle)
    pic.filldraw(circle(p, 7), { style: { stroke: '#2563eb', fill: '#93c5fd', strokeWidth: 1.5 } })
    if (label) pic.text(p.add(polar(orbit.center.angleTo(p), 26)), label, { fontSize: 10 })
  }

  pic.mount(container, { width: 440, height: 230 })
}

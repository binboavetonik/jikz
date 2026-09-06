import { picture, rect, point } from 'jikz'

// The mechanics textbook figure: a block on an incline with weight,
// normal force, and friction as stealth-arrow vectors from the body's
// center. Every vector is an edge from the center point — rotate the
// hill angle and only the vector angles change.

export default function render(container: HTMLElement) {
  const pic = picture()
  const C = point(200, 130) // body center
  const slope = -20         // incline angle, screen convention

  // incline surface
  pic.pen({ style: { stroke: '#334155', strokeWidth: 2 } })
    .moveTo(30, 190).lineTo(370, 190).lineTo(370, 190 - 340 * Math.tan(20 * Math.PI / 180))

  // the block
  pic.filldraw(rect(C.x - 28, C.y - 22, 56, 44), {
    style: { stroke: '#334155', fill: '#dbeafe', strokeWidth: 1.5 },
  })

  // force vectors from the center
  const F = 70
  const vectors: [label: string, deg: number, len: number, color: string][] = [
    ['$mg$', 90, F, '#dc2626'],               // gravity: straight down
    ['$N$', slope - 90, F * 0.85, '#2563eb'], // normal: perpendicular to surface
    ['$f$', slope, F * 0.5, '#16a34a'],       // friction: up the slope
  ]
  for (const [label, deg, len, color] of vectors) {
    const tip = C.add(point(Math.cos(deg * Math.PI / 180) * len, Math.sin(deg * Math.PI / 180) * len))
    pic.edge(C, tip, { arrowEnd: 'stealth' }, { style: { stroke: color, strokeWidth: 2 } })
    const lp = C.add(point(Math.cos(deg * Math.PI / 180) * (len + 18), Math.sin(deg * Math.PI / 180) * (len + 18)))
    pic.text(lp, label, { fontSize: 12, style: { stroke: color } })
  }

  pic.text(point(30, 220), 'free-body on a 20° incline', { fontSize: 10, textAnchor: 'start', style: { stroke: '#64748b' } })
  pic.mount(container, { fit: true, padding: 14 })
}

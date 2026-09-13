import { allShapes, circle, picture, point } from 'jikz'

// The Petri net classic: places (circles), transitions (bars), tokens
// (filled dots), and a marked net that can fire. t1 is enabled — one
// token in each input place — so its edges get the highlight.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const es = { stroke: '#64748b', strokeWidth: 1.2 }
  const hot = { stroke: '#dc2626', strokeWidth: 1.8 }

  // places
  for (const [name, x, y] of [['p1', 60, 70], ['p2', 60, 170], ['p3', 250, 70], ['p4', 250, 170]] as const) {
    pic.node(name, { at: point(x, y), shape: 'circle', width: 44, height: 44 },
      { style: { stroke: '#334155', fill: '#ffffff', strokeWidth: 1.5 } })
  }
  // tokens (marking): p1 = 2, p2 = 1, p3 = 0, p4 = 0
  pic.fill(circle(point(52, 70), 4), { style: { fill: '#111827' } })
  pic.fill(circle(point(68, 70), 4), { style: { fill: '#111827' } })
  pic.fill(circle(point(60, 170), 4), { style: { fill: '#111827' } })

  // transitions
  for (const [name, x, y] of [['t1', 150, 70], ['t2', 150, 170]] as const) {
    pic.node(name, { at: point(x, y), shape: 'rectangle', width: 12, height: 40 },
      { style: { stroke: '#334155', fill: '#334155', strokeWidth: 1 } })
    pic.text(point(x, y + 32), name, { fontSize: 10 })
  }

  // flow relation — t1's edges highlighted (it can fire)
  pic.edge('p1', 't1', { arrowEnd: 'stealth' }, { style: hot })
  pic.edge('t1', 'p3', { arrowEnd: 'stealth' }, { style: hot })
  pic.edge('p2', 't2', { arrowEnd: 'stealth' }, { style: es })
  pic.edge('t2', 'p4', { arrowEnd: 'stealth' }, { style: es })
  pic.edge('p3', 't2', { arrowEnd: 'stealth', bendAngle: 20 }, { style: es })
  pic.edge('t2', 'p1', { arrowEnd: 'stealth', bendAngle: 20 }, { style: es })

  pic.mount(container, { fit: true, padding: 14 })
}

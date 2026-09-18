import { allShapes, circle, picture, point } from 'jikz'

// The automata-textbook DFA: accepts binary strings ending in "01".
// q2 is the double-circle acceptor (the node plus a slightly larger
// concentric ring), transitions are bend edges with symbol labels,
// the start arrow comes from a bare point — edges accept all three
// endpoint kinds (name, anchor spec, raw point).

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const st = { stroke: '#334155', fill: '#f8fafc', strokeWidth: 1.5 }
  const es = { stroke: '#64748b', strokeWidth: 1.2 }

  pic.node('q0', { at: point(80, 110), shape: 'circle', width: 50, height: 50, text: 'q0', style: st })
  pic.node('q1', { at: point(220, 110), shape: 'circle', width: 50, height: 50, text: 'q1', style: st })
  pic.node('q2', { at: point(360, 110), shape: 'circle', width: 50, height: 50, text: 'q2', style: st })

  // accepting state: TikZ "double circle" = the node + an outer ring
  pic.draw(circle(point(360, 110), 29), { style: { stroke: '#334155', strokeWidth: 1.2 } })

  // start arrow from nowhere (bare point endpoint)
  pic.edge(point(18, 110), 'q0', { arrowEnd: 'stealth', style: es })

  pic.edge('q0', 'q1', { arrowEnd: 'stealth', label: '0', style: es })
  pic.edge('q1', 'q2', { arrowEnd: 'stealth', label: '1', style: es })
  pic.edge('q1', 'q0', { arrowEnd: 'stealth', label: '1', bendAngle: 40, style: es })
  pic.edge('q2', 'q0', { arrowEnd: 'stealth', label: '0', bendAngle: -35, style: es })
  pic.edge('q0', 'q0', { arrowEnd: 'stealth', label: '1', loop: 'above', style: es })
  pic.edge('q2', 'q2', { arrowEnd: 'stealth', label: '1', loop: 'above', style: es })

  pic.mount(container, { fit: true, padding: 14 })
}

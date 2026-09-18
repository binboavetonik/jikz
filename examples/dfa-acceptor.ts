import { picture, point } from 'jikz'
import { automataShapes, automata, initialArrow } from 'jikz/automata'

// The automata-textbook DFA: accepts binary strings ending in "01".
// TikZ's automata library, verbatim: `state` circles at their 2.5em
// minimum, `accepting` as the double circle, `initial` as the arrow
// from 3ex outside with "start" at its tail — plus bend transitions
// and self-loops with symbol labels.

export default function render(container: HTMLElement) {
  const pic = picture({
    shapes: automataShapes,
    every: { node: { stroke: '#334155', fill: '#f8fafc', strokeWidth: 1.5 }, edge: { stroke: '#64748b', strokeWidth: 1.2 } },
  })

  pic.node('q0', automata.state({ at: point(80, 110), text: 'q0', width: 50, height: 50 }))
  pic.node('q1', automata.state({ at: point(220, 110), text: 'q1', width: 50, height: 50 }))
  pic.node('q2', automata.state({ at: point(360, 110), text: 'q2', width: 50, height: 50, accepting: true }))

  initialArrow(pic, 'q0')

  pic.edge('q0', 'q1', { arrowEnd: 'stealth', label: '0' })
  pic.edge('q1', 'q2', { arrowEnd: 'stealth', label: '1' })
  pic.edge('q1', 'q0', { arrowEnd: 'stealth', label: '1', bendAngle: 40 })
  pic.edge('q2', 'q0', { arrowEnd: 'stealth', label: '0', bendAngle: -35 })
  pic.edge('q0', 'q0', { arrowEnd: 'stealth', label: '1', loop: 'above' })
  pic.edge('q2', 'q2', { arrowEnd: 'stealth', label: '1', loop: 'above' })

  pic.mount(container, { fit: true, padding: 14 })
}

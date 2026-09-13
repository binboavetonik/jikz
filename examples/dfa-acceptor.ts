import { picture, point, automataShapes, automata, initialArrow } from 'jikz'

// The automata-textbook DFA: accepts binary strings ending in "01".
// ext/automata is TikZ's automata library — `state` is a circle with a
// minimum size, `accepting` is the doubled border, and `initial` is an
// ordinary edge drawn from a point initialArrow() works out for you.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: automataShapes })
  const st = { stroke: '#334155', fill: '#f8fafc', strokeWidth: 1.5 }
  const es = { stroke: '#64748b', strokeWidth: 1.2 }

  const state = { width: 50, height: 50 }

  pic.node('q0', automata.state({ at: point(80, 110), ...state, text: 'q0' }), { style: st })
  pic.node('q1', automata.state({ at: point(220, 110), ...state, text: 'q1' }), { style: st })
  // TikZ separates the two rings by `double distance` on top of the line
  // width, so a thicker pen wants a wider gap: 1.5 + 0.6 here.
  pic.node(
    'q2',
    automata.accepting({ at: point(360, 110), ...state, text: 'q2', separation: 2.1 }),
    { style: st }
  )

  // \node[state, initial] — the arrow from nowhere, its start point and
  // "start" label both off initialArrow(). edge() clips to the state.
  const start = initialArrow(pic.getNode('q0')!)
  pic.edge(start.from, 'q0', { arrowEnd: 'stealth' }, { style: es })
  pic.text(start.textAt, start.text, { at: start.textPlacement, fontSize: 11 })

  pic.edge('q0', 'q1', { arrowEnd: 'stealth', label: '0' }, { style: es })
  pic.edge('q1', 'q2', { arrowEnd: 'stealth', label: '1' }, { style: es })
  pic.edge('q1', 'q0', { arrowEnd: 'stealth', label: '1', bendAngle: 40 }, { style: es })
  pic.edge('q2', 'q0', { arrowEnd: 'stealth', label: '0', bendAngle: -35 }, { style: es })
  pic.edge('q0', 'q0', { arrowEnd: 'stealth', label: '1', loop: 'above' }, { style: es })
  pic.edge('q2', 'q2', { arrowEnd: 'stealth', label: '1', loop: 'above' }, { style: es })

  pic.mount(container, { fit: true, padding: 14 })
}

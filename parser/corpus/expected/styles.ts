import { allShapes, cm, picture, point, pt } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \node[box] (a) at (0,0) {a};
  pic.node('a', { at: point(0, 0), text: 'a', shape: 'rectangle', minWidth: cm(1), minHeight: cm(1), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, 'thick'] })

  // \node[box, tinted=blue] (b) at (2,0) {b};
  pic.node('b', { at: point(2, 0), text: 'b', shape: 'rectangle', minWidth: cm(1), minHeight: cm(1), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, 'thick', { fill: '#ccccff' }, { stroke: '#0000ff' }] })

  // \node[old] (c) at (4,0) {c};
  pic.node('c', { at: point(4, 0), text: 'c', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#808080' }] })

  // \node[box] (d) at (6,0) {d};
  pic.node('d', { at: point(6, 0), text: 'd', shape: 'rectangle', minWidth: cm(1), minHeight: cm(1), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, 'thick'], textStyle: { fontSize: pt(9) } })

  // \draw[->] (a) -- (b);
  pic.edge('a', 'b', { arrowEnd: 'stealth' })

  // \node[box, right=of d] (e) {e};
  pic.node('e', { text: 'e', shape: 'rectangle', minWidth: cm(1), minHeight: cm(1), rightOf: 'd', distance: cm(2), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, 'thick'], textStyle: { fontSize: pt(9) } })

  // \begin{scope}[every node/.style={draw, circle}, red]
  pic.scope({ style: [{ stroke: '#ff0000' }] }, (s) => {

    // \node (f) at (0,2) {f};
    s.node('f', { at: point(0, 2), text: 'f', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \draw (f) -- (a);
    s.pen().moveTo('f').lineTo('a')
  })

  // \node (g) at (2,2) {g};
  pic.node('g', { at: point(2, 2), text: 'g', style: [{ stroke: 'none', fill: 'none' }], textStyle: { fontSize: pt(9) } })

  // \begin{scope}[box/.style={draw, dashed}]
  pic.scope({  }, (s) => {

    // \node[box] (h) at (4,2) {h};
    s.node('h', { at: point(4, 2), text: 'h', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, 'dashed'], textStyle: { fontSize: pt(9) } })
  })

  // \node[box] (i) at (6,2) {i};
  pic.node('i', { at: point(6, 2), text: 'i', shape: 'rectangle', minWidth: cm(1), minHeight: cm(1), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, 'thick'], textStyle: { fontSize: pt(9) } })

  return pic
}

import { allShapes, cm, picture, point, pt } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
  /** A named point, in the picture's frame coordinates. */
  const ref = (spec: string) => pic.frame.unmap(pic.resolve(spec))

  // \node at (0,0) {origin};
  pic.node('tikz-1', { at: point(0, 0), text: 'origin', style: [{ stroke: 'none', fill: 'none' }] })

  // \node (a) at (1,1) {A};
  pic.node('a', { at: point(1, 1), text: 'A', style: [{ stroke: 'none', fill: 'none' }] })

  // \node[draw] (b) at (2,2) {B};
  pic.node('b', { at: point(2, 2), text: 'B', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \node[draw, circle, fill=blue!20] (c) at (3,1) {C};
  pic.node('c', { at: point(3, 1), text: 'C', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }, { fill: '#ccccff' }] })

  // \node[draw, minimum size=1cm, inner sep=2pt] (d) at (0,3) {D};
  pic.node('d', { at: point(0, 3), text: 'D', minWidth: cm(1), minHeight: cm(1), innerSep: pt(2), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \node[right=of a] (e) {E};
  pic.node('e', { text: 'E', rightOf: 'a', distance: cm(1), style: [{ stroke: 'none', fill: 'none' }] })

  // \node[below=1cm of a, anchor=north] (f) {F};
  pic.node('f', { text: 'F', below: 'a', distance: cm(1), anchor: 'north', style: [{ stroke: 'none', fill: 'none' }] })

  // \node[anchor=west, text width=2cm, align=center] (g) at (0,-1) {some wrapped text};
  pic.node('g', { at: point(0, -1), text: 'some wrapped text', anchor: 'west', textWidth: cm(2), align: 'center', style: [{ stroke: 'none', fill: 'none' }] })

  // \node[label=above:$x$] (h) at (5,0) {H};
  pic.node('h', { at: point(5, 0), text: 'H', style: [{ stroke: 'none', fill: 'none' }], labels: [{ text: '$x$', at: 'north' }] })

  // \node[rotate=30, font=\small\bfseries, text=red] (i) at (6,0) {I};
  pic.node('i', { at: point(6, 0), text: 'I', rotate: 30, style: [{ stroke: 'none', fill: 'none' }], textStyle: { fontWeight: 'bold', fontSize: pt(9), fill: '#ff0000' } })

  // \coordinate (o) at (0,0);
  pic.coordinate('o', point(0, 0))

  // \coordinate (p) at (2,-1);
  pic.coordinate('p', point(2, -1))

  // \draw (o) -- (p);
  pic.pen().moveTo('o').lineTo('p')

  // \draw (a) -- (b.north);
  pic.pen().moveTo('a').lineTo('b.north')

  // \draw (a.south east) -- (c.30);
  pic.pen().moveTo('a.south east').lineTo('c.30')

  // \draw (o) -- (a |- p);
  pic.pen().moveTo('o').lineTo(point(ref('a').x, ref('p').y))

  // \draw (o) -- (a -| p);
  pic.pen().moveTo('o').lineTo(point(ref('p').x, ref('a').y))

  // \draw (0,0) -- (1,0) node[right] {end};
  pic.pen().moveTo(0, 0).lineTo(1, 0)
    .node('tikz-2', { text: 'end', anchor: 'west', style: [{ stroke: 'none', fill: 'none' }] })

  // \draw (0,0) -- node[above] {mid} (1,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0)
    .node('tikz-3', { pos: 0.5, text: 'mid', anchor: 'south', style: [{ stroke: 'none', fill: 'none' }] })

  // \draw (0,0) -- node[midway, below] {mid} (1,0) -- node[pos=0.25] {q} (2,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0)
    .node('tikz-4', { pos: 0.5, text: 'mid', anchor: 'north', style: [{ stroke: 'none', fill: 'none' }] }).lineTo(2, 0)
    .node('tikz-5', { pos: 0.25, text: 'q', style: [{ stroke: 'none', fill: 'none' }] })

  // \draw (0,0) -- (1,0) coordinate (m) -- (2,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0).coordinate('m').lineTo(2, 0)

  // \draw (0,0) -- (1,0) node[draw, circle] (n) {n};
  pic.pen().moveTo(0, 0).lineTo(1, 0)
    .node('n', { text: 'n', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \path (0,0) node {phantom};
  pic.pen({ mode: 'path' }).moveTo(0, 0)
    .node('tikz-6', { text: 'phantom', style: [{ stroke: 'none', fill: 'none' }] })

  // \node[draw] at (1,1) {no name; with a semicolon};
  pic.node('tikz-7', { at: point(1, 1), text: 'no name; with a semicolon', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  return pic
}

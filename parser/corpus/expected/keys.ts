import { allShapes, cm, fillPatterns, picture, point, pt } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \node[draw, pin=above:$p$] (a) at (0,0) {a};
  pic.node('a', { at: point(0, 0), text: 'a', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }], pins: [{ text: '$p$', at: 'north' }] })

  // \node[draw, pin={[pin edge={red, thick}]30:$q$}, label={[label distance=4pt]below:$l$}] (b) at (3,0) {b};
  pic.node('b', { at: point(3, 0), text: 'b', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }], labels: [{ text: '$l$', at: 'south', distance: pt(4) }], pins: [{ text: '$q$', at: 30, edge: [{ stroke: '#ff0000' }, 'thick'] }] })

  // \node[draw, label distance=2pt, label=right:$r$] (c) at (6,0) {c};
  pic.node('c', { at: point(6, 0), text: 'c', labelDistance: pt(2), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }], labels: [{ text: '$r$', at: 'east' }] })

  // \node[draw, xshift=5pt, yshift=-1cm] (d) at (0,2) {d};
  pic.node('d', { at: point(0.175729902, 1), text: 'd', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \node[draw, above=2pt] (e) at (3,2) {e};
  pic.node('e', { at: point(3, 2.070291961), text: 'e', anchor: 'south', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \node[draw, text centered, text width=1.5cm, font=\bfseries\large, text=blue] (f) at (6,2) {f g h i};
  pic.node('f', { at: point(6, 2), text: 'f g h i', align: 'center', textWidth: cm(1.5), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }], textStyle: { fontWeight: 'bold', fontSize: pt(12), fill: '#0000ff' } })

  // \shade (0,4) rectangle (1,5);
  pic.pen({ mode: 'fill', style: [{ gradient: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#808080' }] } }] }).moveTo(0, 4).rectangle(1, 5)

  // \shade[top color=red, bottom color=blue] (2,4) rectangle (3,5);
  pic.pen({ mode: 'fill', style: [{ gradient: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#0000ff' }, { offset: 1, color: '#ff0000' }] } }] }).moveTo(2, 4).rectangle(3, 5)

  // \shade[left color=red, right color=blue, middle color=white] (4,4) rectangle (5,5);
  pic.pen({ mode: 'fill', style: [{ gradient: { type: 'linear', angle: 0, stops: [{ offset: 0, color: '#ff0000' }, { offset: 0.5, color: '#ffffff' }, { offset: 1, color: '#0000ff' }] } }] }).moveTo(4, 4).rectangle(5, 5)

  // \shade[inner color=white, outer color=gray] (6,4) circle (0.5);
  pic.pen({ mode: 'fill', style: [{ gradient: { type: 'radial', stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#808080' }] } }] }).moveTo(6, 4).circle({ radius: 0.5 })

  // \shade[ball color=blue] (8,4) circle (0.5);
  pic.pen({ mode: 'fill', style: [{ gradient: { type: 'radial', cx: 0.5, cy: 0.5, fx: 0.35, fy: 0.35, stops: [{ offset: 0, color: '#ccccff' }, { offset: 1, color: '#0000bf' }] } }] }).moveTo(8, 4).circle({ radius: 0.5 })

  // \shadedraw[top color=white, bottom color=black, draw=red] (0,6) rectangle (1,7);
  pic.pen({ mode: 'filldraw', style: [{ stroke: '#ff0000' }, { gradient: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }] } }] }).moveTo(0, 6).rectangle(1, 7)

  // \draw[pattern=north east lines, pattern color=blue] (2,6) rectangle (3,7);
  pic.pen({ style: [{ fillPattern: { pattern: fillPatterns['north east lines'], color: '#0000ff' } }] }).moveTo(2, 6).rectangle(3, 7)

  // \draw[fill=red, path fading=east] (4,6) rectangle (5,7);
  pic.pen({ style: [{ fill: '#ff0000' }, { fading: 'east' }] }).moveTo(4, 6).rectangle(5, 7)

  // \draw[dash pattern=on 2pt off 1pt on 4pt off 2pt, dash phase=1pt] (0,8) -- (2,8);
  pic.pen({ style: [{ strokeDasharray: [2.657, 1.328, 5.313, 2.657] }, { strokeDashoffset: pt(1) }] }).moveTo(0, 8).lineTo(2, 8)

  // \draw[double distance=2pt, double=yellow] (3,8) -- (5,8);
  pic.pen({ style: [{ doubleLine: { spacing: pt(2) } }, { doubleLine: { spacing: pt(0.6), innerColor: '#ffff00' } }] }).moveTo(3, 8).lineTo(5, 8)

  // \draw[help lines] (0,9) grid (2,10);
  pic.pen({ style: [{ stroke: '#c0c0c0', strokeWidth: pt(0.2) }] }).moveTo(0, 9).grid(2, 10)

  // \draw[even odd rule, fill=gray] (3,9) rectangle (5,10) (3.5,9.5) rectangle (4.5,10);
  pic.pen({ style: [{ fillRule: 'evenodd' }, { fill: '#808080' }] }).moveTo(3, 9).rectangle(5, 10).moveTo(3.5, 9.5).rectangle(4.5, 10)

  // \draw[line cap=rect, line join=bevel, miter limit=5] (6,9) -- (7,10) -- (8,9);
  pic.pen({ style: [{ strokeLinecap: 'square' }, { strokeLinejoin: 'bevel' }, { strokeMiterlimit: 5 }] }).moveTo(6, 9).lineTo(7, 10).lineTo(8, 9)

  // \draw[arrows=<->] (0,11) -- (2,11);
  pic.edge(point(0, 11), point(2, 11), { arrowStart: 'to', arrowEnd: 'to' })

  // \draw[->>, >=latex] (3,11) -- (5,11);
  pic.edge(point(3, 11), point(5, 11), { arrowEnd: ['latex', 'latex'] })

  // \draw[-{Stealth[length=4pt, width=3pt, open]}] (6,11) -- (8,11);
  pic.edge(point(6, 11), point(8, 11), { arrowEnd: { tip: 'stealth', length: pt(4), width: pt(3), open: true } })

  // \node[draw, circle] (p) at (0,13) {p};
  pic.node('p', { at: point(0, 13), text: 'p', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \node[draw, circle] (q) at (3,13) {q};
  pic.node('q', { at: point(3, 13), text: 'q', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // \path[->] (p) edge[bend left] node[above] {x} (q) edge[loop above] node {y} (p);
  pic.edge('p', 'q', { arrowEnd: 'to', bendAngle: 30, labels: [{ text: 'x', pos: 0.5, at: 'north' }] })

  // \path[->] (p) edge[bend left] node[above] {x} (q) edge[loop above] node {y} (p);
  pic.edge('p', 'p', { arrowEnd: 'to', loop: 'above', labels: [{ text: 'y', pos: 0.5 }] })

  // \draw (q) edge[->, red] (p);
  pic.edge('q', 'p', { arrowEnd: 'to', style: [{ stroke: '#ff0000' }] })

  // \draw[->, shorten >=2pt, shorten <=2pt] (p) to[out=-30, in=-150] (q);
  pic.edge('p', 'q', { arrowEnd: 'to', out: -30, in: -150, shortenStart: pt(2), shortenEnd: pt(2) })

  return pic
}

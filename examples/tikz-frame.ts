import { picture, point, polar, rel, cm, color, allShapes } from 'jikz'

// A TikZ figure ported line for line. The picture is written in TikZ's
// frame — y up, counter-clockwise angles, one unit is a centimetre —
// and the pen speaks TikZ's path operations, so every number below is
// the number the \draw had:
//
//   \draw[step=0.5, help lines] (-1.4,-1.4) grid (1.4,1.4);
//   \draw[->] (-1.5,0) -- (1.5,0);  \draw[->] (0,-1.5) -- (0,1.5);
//   \draw (0,0) circle (1);
//   \draw[red, thick] (0,0) -- (30:1) node[pin=30:$P$] (P) {};
//   \draw[blue] (0.3,0) arc[start angle=0, end angle=30, radius=0.3] node[midway, right] {$\theta$};
//   \draw[dashed] (P) -- ++(0,-0.5) node[midway, sloped, above] {$\sin\theta$};

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
  const help = { stroke: color('gray!40'), strokeWidth: 0.5 }
  const P = polar(30, 1)

  pic.pen({ style: help }).moveTo(-1.4, -1.4).grid(1.4, 1.4, { step: 0.5 })
  pic.edge(point(-1.5, 0), point(1.5, 0), { arrowEnd: { tip: 'stealth', length: 8 } })
  pic.edge(point(0, -1.5), point(0, 1.5), { arrowEnd: { tip: 'stealth', length: 8 } })
  pic.pen().moveTo(0, 0).circle(1)

  pic.pen({ style: { stroke: color('red'), strokeWidth: 1.5 } })
    .moveTo(0, 0)
    .lineTo(P)
    .node('P', { shape: 'circle', width: 6, height: 6, minWidth: 0, minHeight: 0, style: { fill: color('red'), stroke: 'none' },
      pins: [{ text: '$P$', at: 30 }] })

  pic.pen({ style: { stroke: color('blue') } })
    .moveTo(0.3, 0)
    .arc({ start: 0, end: 30, radius: 0.3 })
    .label('$\\theta$', { pos: 0.5, offset: -8 })

  pic.pen({ style: { stroke: '#334155', dash: 'dashed' } })
    .moveTo('P')
    .lineTo(rel(0, -0.5))
    .label('$\\sin\\theta$', { pos: 0.5, offset: -6, sloped: true })
    .coordinate('foot')

  pic.mount(container, { fit: true, padding: 12 })
}

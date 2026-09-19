import { allShapes, cm, picture, point, pt } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \draw[thick] (0,0) -- (1,0);
  pic.pen({ style: ['thick'] }).moveTo(0, 0).lineTo(1, 0)

  // \draw[very thick, red] (0,0) -- (1,0);
  pic.pen({ style: ['very thick', { stroke: '#ff0000', fill: '#ff0000' }] }).moveTo(0, 0).lineTo(1, 0)

  // \draw[line width=2pt, dashed] (0,0) -- (1,0);
  pic.pen({ style: [{ strokeWidth: pt(2) }, 'dashed'] }).moveTo(0, 0).lineTo(1, 0)

  // \draw[dotted, gray] (0,0) -- (1,0);
  pic.pen({ style: ['dotted', { stroke: '#808080', fill: '#808080' }] }).moveTo(0, 0).lineTo(1, 0)

  // \draw[color=blue!50!black] (0,0) -- (1,0);
  pic.pen({ style: [{ stroke: '#000080', fill: '#000080' }] }).moveTo(0, 0).lineTo(1, 0)

  // \draw[draw=red, fill=yellow] (0,0) rectangle (1,1);
  pic.pen({ style: [{ stroke: '#ff0000' }, { fill: '#ffff00' }] }).moveTo(0, 0).rectangle(1, 1)

  // \fill[blue] (0,0) circle (0.2);
  pic.pen({ mode: 'fill', style: [{ stroke: '#0000ff', fill: '#0000ff' }] }).moveTo(0, 0).circle({ radius: 0.2 })

  // \filldraw[fill=green!20, draw=green!50!black] (0,0) circle (0.5);
  pic.pen({ mode: 'filldraw', style: [{ fill: '#ccffcc' }, { stroke: '#008000' }] }).moveTo(0, 0).circle({ radius: 0.5 })

  // \draw[opacity=0.5] (0,0) -- (1,0);
  pic.pen({ style: [{ strokeOpacity: 0.5, fillOpacity: 0.5 }] }).moveTo(0, 0).lineTo(1, 0)

  // \draw[rounded corners] (0,0) rectangle (1,1);
  pic.pen({ style: [{ roundedCorners: pt(4) }] }).moveTo(0, 0).rectangle(1, 1)

  // \draw[rounded corners=3pt] (0,0) -- (1,0) -- (1,1);
  pic.pen({ style: [{ roundedCorners: pt(3) }] }).moveTo(0, 0).lineTo(1, 0).lineTo(1, 1)

  // \draw[line cap=round, line join=round] (0,0) -- (1,0) -- (1,1);
  pic.pen({ style: [{ strokeLinecap: 'round' }, { strokeLinejoin: 'round' }] }).moveTo(0, 0).lineTo(1, 0).lineTo(1, 1)

  // \draw[double] (0,0) -- (1,0);
  pic.pen({ style: ['double'] }).moveTo(0, 0).lineTo(1, 0)

  // \draw (0,0) -- (1,0) [red] -- (2,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0)
    .push({ style: [{ stroke: '#ff0000', fill: '#ff0000' }] }).lineTo(2, 0)

  // \draw[->] (0,0) -- (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: 'to' })

  // \draw[<->, thick] (0,0) -- (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowStart: 'to', arrowEnd: 'to', style: ['thick'] })

  // \draw[-stealth] (0,0) -- (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: 'stealth' })

  // \draw[-latex, shorten >=2pt] (0,0) -- (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: 'latex', shortenEnd: pt(2) })

  // \draw[->, bend left] (0,0) to (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: 'to', bendAngle: 30 })

  // \draw[->] (0,0) to[bend right=45] (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: 'to', bendAngle: -45 })

  // \draw[->] (0,0) -- node[above] {f} (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: 'to', labels: [{ text: 'f', pos: 0.5, at: 'north' }] })

  // \draw[-{Stealth[length=3pt]}] (0,0) -- (1,0);
  pic.edge(point(0, 0), point(1, 0), { arrowEnd: { tip: 'stealth', length: pt(3) } })

  return pic
}

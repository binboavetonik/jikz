import { allShapes, cm, picture, point } from 'jikz'
import { circuitShapes } from 'jikz/circuits'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.node('V1', { at: point(0, 0).toward(point(0, 3), 0.5), shape: circuitShapes['voltage source'], rotate: 90, style: [{ fill: 'none' }], labels: [{ text: '$V_1$', at: 'north' }] })

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.edge(point(0, 0), 'V1.in')

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.edge('V1.out', point(0, 3))

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.node('tikz-1', { at: point(0, 3).toward(point(3, 3), 0.5), shape: circuitShapes.resistor, style: [{ fill: 'none' }], labels: [{ text: '$R_1$', at: 'north' }] })

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.edge(point(0, 3), 'tikz-1.in')

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.edge('tikz-1.out', point(3, 3))

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.pen({ mode: 'fill', style: [{ fill: '#000000' }] }).moveTo(0, 3).circle({ radius: 0.052916667 })

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.pen({ mode: 'fill', style: [{ fill: '#000000' }] }).moveTo(3, 3).circle({ radius: 0.052916667 })

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.node('tikz-2', { at: point(3, 3).toward(point(3, 0), 0.5), shape: circuitShapes.capacitor, rotate: -90, style: [{ fill: 'none' }], labels: [{ text: '$C_1$', at: 'south' }] })

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.edge(point(3, 3), 'tikz-2.in')

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.edge('tikz-2.out', point(3, 0))

  // \draw (0,0) to[V, l=$V_1$, name=V1] (0,3) to[R, l=$R_1$, *-*] (3,3) to[C, l_=$C_1$] (3,0) -- (0,0);
  pic.pen().moveTo(3, 0).lineTo(0, 0)

  // \draw (3,3) to[short, -o] (5,3);
  pic.edge(point(3, 3), point(5, 3))

  // \draw (3,3) to[short, -o] (5,3);
  pic.pen({ mode: 'filldraw', style: [{ stroke: '#000000', fill: '#ffffff' }] }).moveTo(5, 3).circle({ radius: 0.052916667 })

  // \node[ground] at (0,0) {};
  pic.node('tikz-3', { at: point(0, 0), text: '', shape: circuitShapes.ground, anchor: 'in', style: [{ stroke: 'none', fill: 'none' }] })

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.node('tikz-4', { at: point(6, 1).toward(point(9, 1), 0.5), shape: circuitShapes.inductor, style: [{ fill: 'none' }], labels: [{ text: '$L$', at: 'north' }] })

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge(point(6, 1), 'tikz-4.in')

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge('tikz-4.out', point(9, 1))

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.node('tikz-5', { at: point(9, 1).toward(point(9, 4), 0.5), shape: circuitShapes.diode, rotate: 90, style: [{ fill: 'none' }] })

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge(point(9, 1), 'tikz-5.in')

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge('tikz-5.out', point(9, 4))

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.node('tikz-6', { at: point(9, 4).toward(point(6, 4), 0.5), shape: circuitShapes['voltage source'], rotate: 180, style: [{ fill: 'none' }] })

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge(point(9, 4), 'tikz-6.in')

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge('tikz-6.out', point(6, 4))

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.node('tikz-7', { at: point(6, 4).toward(point(6, 1), 0.5), shape: circuitShapes.switch, shapeOptions: { variant: 'closed' }, rotate: -90, style: [{ fill: 'none' }] })

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge(point(6, 4), 'tikz-7.in')

  // \draw (6,1) to[L, l=$L$] (9,1) to[D] (9,4) to[battery1] (6,4) to[cspst] (6,1);
  pic.edge('tikz-7.out', point(6, 1))

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.node('tikz-8', { at: point(10, 0).toward(point(10, 3), 0.5), shape: circuitShapes.capacitor, shapeOptions: { variant: 'polarized' }, rotate: 90, style: [{ fill: 'none' }] })

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge(point(10, 0), 'tikz-8.in')

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge('tikz-8.out', point(10, 3))

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.node('tikz-9', { at: point(10, 3).toward(point(13, 3), 0.5), shape: circuitShapes.diode, shapeOptions: { variant: 'zener' }, style: [{ fill: 'none' }] })

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge(point(10, 3), 'tikz-9.in')

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge('tikz-9.out', point(13, 3))

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.node('tikz-10', { at: point(13, 3).toward(point(13, 0), 0.5), shape: circuitShapes['current source'], rotate: -90, style: [{ fill: 'none' }] })

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge(point(13, 3), 'tikz-10.in')

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge('tikz-10.out', point(13, 0))

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.node('D2', { at: point(13, 0).toward(point(10, 0), 0.5), shape: circuitShapes.diode, shapeOptions: { variant: 'led' }, rotate: 180, style: [{ fill: 'none' }] })

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge(point(13, 0), 'D2.in')

  // \draw (10,0) to[pC] (10,3) to[zD] (13,3) to[I] (13,0) to[leD, name=D2] (10,0);
  pic.edge('D2.out', point(10, 0))

  // \node[op amp] (oa) at (15,2) {};
  pic.node('oa', { at: point(15, 2), text: '', shape: circuitShapes['op amp'], style: [{ stroke: 'none', fill: 'none' }] })

  // \draw (oa.out) -- (17,2);
  pic.pen().moveTo('oa.out').lineTo(17, 2)

  // \draw (13,2.5) -- (oa.-);
  pic.pen().moveTo(13, 2.5).lineTo('oa.-')

  // \draw (13,1.5) -- (oa.+);
  pic.pen().moveTo(13, 1.5).lineTo('oa.+')

  // \draw[thick] (0,-2) to[R] (2,-1);
  pic.node('tikz-11', { at: point(0, -2).toward(point(2, -1), 0.5), shape: circuitShapes.resistor, rotate: 26.565051177, style: [{ fill: 'none' }, 'thick'] })

  // \draw[thick] (0,-2) to[R] (2,-1);
  pic.edge(point(0, -2), 'tikz-11.in', { style: ['thick'] })

  // \draw[thick] (0,-2) to[R] (2,-1);
  pic.edge('tikz-11.out', point(2, -1), { style: ['thick'] })

  return pic
}

import { Transform, allShapes, cm, picture, point } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
  /** A named point, in the picture's frame coordinates. */
  const ref = (spec: string) => pic.frame.unmap(pic.resolve(spec))

  // \begin{tikzpicture}[scale=1, >=stealth, node distance=1.5cm, every node/.style=draw]
  pic.scope({ transform: Transform.identity().scale(1) }, (s) => {

    // \begin{scope}[shift={(1,1)}]
    s.scope({ transform: Transform.identity().translate(pic.length(1), -pic.length(1)) }, (s) => {

      // \draw (0,0) -- (1,0);
      s.pen().moveTo(0, 0).lineTo(1, 0)
    })

    // \begin{scope}[rotate=45, thick, red]
    s.scope({ style: ['thick', { stroke: '#ff0000', fill: '#ff0000' }], transform: Transform.identity().rotate(-45) }, (s) => {

      // \draw (0,0) rectangle (1,1);
      s.pen().moveTo(0, 0).rectangle(1, 1)
    })

    // \draw (0,0) -- (0,1);  % \x=0
    s.pen().moveTo(0, 0).lineTo(0, 1)

    // \draw (1,0) -- (1,1);  % \x=1
    s.pen().moveTo(1, 0).lineTo(1, 1)

    // \draw (2,0) -- (2,1);  % \x=2
    s.pen().moveTo(2, 0).lineTo(2, 1)

    // \draw (0,0) circle (0.1);  % \x=0
    s.pen().moveTo(0, 0).circle({ radius: 0.1 })

    // \draw (1,0) circle (0.1);  % \x=1
    s.pen().moveTo(1, 0).circle({ radius: 0.1 })

    // \draw (2,0) circle (0.1);  % \x=2
    s.pen().moveTo(2, 0).circle({ radius: 0.1 })

    // \draw (3,0) circle (0.1);  % \x=3
    s.pen().moveTo(3, 0).circle({ radius: 0.1 })

    // \node at (0,0) {a};  % \x/\y=0/a
    s.node('tikz-1', { at: point(0, 0), text: 'a', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node at (1,0) {b};  % \x/\y=1/b
    s.node('tikz-2', { at: point(1, 0), text: 'b', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node at (0.5,0) {1};  % \i=0.5
    s.node('tikz-3', { at: point(0.5, 0), text: '1', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node at (1,0) {2};  % \i=1
    s.node('tikz-4', { at: point(1, 0), text: '2', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node at (1.5,0) {3};  % \i=1.5
    s.node('tikz-5', { at: point(1.5, 0), text: '3', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node at (2,0) {4};  % \i=2
    s.node('tikz-6', { at: point(2, 0), text: '4', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node (n) at (0,5) {n};
    s.node('n', { at: point(0, 5), text: 'n', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \node[right=of n] (m) {m};
    s.node('m', { text: 'm', rightOf: 'n', distance: cm(1.5), style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // \draw[->] (n) -- (m);
    s.edge('n', 'm', { arrowEnd: 'stealth' })

    // \coordinate (A) at (0,0);
    s.coordinate('A', point(0, 0))

    // \coordinate (B) at (4,2);
    s.coordinate('B', point(4, 2))

    // \draw ($(A)!0.5!(B)$) circle (0.1);
    s.pen().moveTo(ref('A').toward(ref('B'), 0.5)).circle({ radius: 0.1 })

    // \draw ($(A)!1cm!(B)$) circle (0.1);
    s.pen().moveTo(ref('A').towardByDistance(ref('B'), 1)).circle({ radius: 0.1 })

    // \draw ($(A)+(1,0)$) -- ($2*(B)-(A)$);
    s.pen().moveTo(ref('A').add(point(1, 0))).lineTo(ref('B').scale(2).sub(ref('A')))

    // \draw ($(A)!0.5!90:(B)$) -- (B);
    s.pen().moveTo(ref('A').toward(ref('B').rotateAround(ref('A'), 90), 0.5)).lineTo('B')

    // \draw ($(A)!(2,3)!(B)$) circle (0.1);
    s.pen().moveTo(point(2, 3).project(ref('A'), ref('B'))).circle({ radius: 0.1 })
  })

  return pic
}

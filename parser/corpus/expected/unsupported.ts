import { allShapes, cm, picture, point } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \draw (0,0) -- (1,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0)

  // \def\x{2}
  // TODO(jikz-tikz): \def is not supported

  // \draw (0,0) -- (1,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0)

  // \draw plot coordinates {(0,0) (1,1)};
  pic.pen().moveTo(0, 0).lineTo(1, 1)

  // \draw (0,0) -- (2*\x, 1);
  // TODO(jikz-tikz): "2*\x" is an expression — TikZ would evaluate it with pgfmath, which is not supported; write the value

  // \node at (1,2,3) {3d};
  // TODO(jikz-tikz): 3D coordinate (1,2,3) is not supported

  // \draw (0,0) edge (1,1);
  pic.edge(point(0, 0), point(1, 1))

  // \pic {code={\draw (0,0) -- (1,0);}};
  // TODO(jikz-tikz): pic "code" is not supported — only the angles library's "angle" and "right angle" are

  // \draw (0,0) -- +(1,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0)

  // \shade[left color=red] (0,0) rectangle (1,1);
  pic.pen({ mode: 'fill', style: [{ gradient: { type: 'linear', angle: 0, stops: [{ offset: 0, color: '#ff0000' }, { offset: 1, color: '#ffffff' }] } }] }).moveTo(0, 0).rectangle(1, 1)

  // \draw (1,1) -- (2,2);
  pic.pen().moveTo(1, 1).lineTo(2, 2)

  // \begin{pgfonlayer}{background}
  //   \fill[gray] (0,0) rectangle (1,1);
  // \end{pgfonlayer}
  // TODO(jikz-tikz): environment "pgfonlayer" is not supported

  return pic
}

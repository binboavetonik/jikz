import { allShapes, cm, picture, point, rect, rel } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
  /** A named point, in the picture's frame coordinates. */
  const ref = (spec: string) => pic.frame.unmap(pic.resolve(spec))

  // \draw (0,0) -- +(1,0) -- +(0,1);
  pic.pen().moveTo(0, 0).lineTo(1, 0).lineTo(0, 1)

  // \draw (1,1) -- ++(1,0) -- +(0,1) -- +(1,1);
  pic.pen().moveTo(1, 1).lineTo(rel(1, 0)).lineTo(2, 2).lineTo(3, 2)

  // \coordinate (A) at (3,3);
  pic.coordinate('A', point(3, 3))

  // \draw (A) -- +(1,0);
  pic.pen().moveTo('A').lineTo(ref('A').add(point(1, 0)))

  // \draw plot coordinates {(0,4) (1,5) (2,4)};
  pic.pen().moveTo(0, 4).lineTo(1, 5).lineTo(2, 4)

  // \draw (0,6) -- plot coordinates {(1,7) (2,6)};
  pic.pen().moveTo(0, 6).lineTo(1, 7).lineTo(2, 6)

  // \draw (0,8) circle (0.2) coordinate (K) -- +(0,1);
  pic.pen().moveTo(0, 8).circle({ radius: 0.2 }).coordinate('K').lineTo(0, 9)

  // \clip (0,0) rectangle (4,4);
  pic.scope({ clip: pic.frame.renderable(rect(0, 0, 4, 4)) }, (s) => {

    // \draw (-1,-1) -- (5,5);
    s.pen().moveTo(-1, -1).lineTo(5, 5)

    // \fill[red] (3,3) circle (2);
    s.pen({ mode: 'fill', style: [{ fill: '#ff0000' }] }).moveTo(3, 3).circle({ radius: 2 })
  })

  return pic
}

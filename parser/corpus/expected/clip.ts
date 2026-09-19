import { allShapes, circle, cm, path, picture, point } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \begin{scope}
  pic.scope({  }, (s) => {

    // \clip (1,1) circle (1);
    s.scope({ clip: pic.frame.renderable(circle(point(1, 1), 1)) }, (s) => {

      // \fill[blue] (0,0) rectangle (2,2);
      s.pen({ mode: 'fill', style: [{ fill: '#0000ff' }] }).moveTo(0, 0).rectangle(2, 2)
    })
  })

  // \begin{scope}
  pic.scope({  }, (s) => {

    // \clip (0,0) -- (2,0) -- (1,2) -- cycle;
    s.scope({ clip: pic.frame.renderable(path().moveTo(point(0, 0)).lineTo(point(2, 0)).lineTo(point(1, 2)).close()) }, (s) => {

      // \fill[green] (0,0) rectangle (2,2);
      s.pen({ mode: 'fill', style: [{ fill: '#00ff00' }] }).moveTo(0, 0).rectangle(2, 2)
    })
  })

  // \draw (0,0) -- (3,3);
  pic.pen().moveTo(0, 0).lineTo(3, 3)

  return pic
}

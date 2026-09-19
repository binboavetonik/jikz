import { allShapes, cm, picture, point, rel } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \draw (0,0) -- (1,1);
  pic.pen().moveTo(0, 0).lineTo(1, 1)

  // \draw (0,0) -- (2,0) -- (2,1) -- (0,1) -- cycle;
  pic.pen().moveTo(0, 0).lineTo(2, 0).lineTo(2, 1).lineTo(0, 1).close()

  // \draw (-1.5,0.25) -- (3,-2.75);
  pic.pen().moveTo(-1.5, 0.25).lineTo(3, -2.75)

  // \draw (0,0) -| (2,1);
  pic.pen().moveTo(0, 0).hvTo(2, 1)

  // \draw (0,0) |- (2,1);
  pic.pen().moveTo(0, 0).vhTo(2, 1)

  // \draw (0,0) .. controls (1,1) and (2,-1) .. (3,0);
  pic.pen().moveTo(0, 0).curveTo(point(1, 1), point(2, -1), point(3, 0))

  // \draw (0,0) .. controls (1,1) .. (2,0);
  pic.pen().moveTo(0, 0).curveTo(point(1, 1), point(1, 1), point(2, 0))

  // \draw (0,0) to[bend left] (2,0);
  pic.pen().moveTo(0, 0).to(2, 0, { bend: 30 })

  // \draw (0,0) to[out=30, in=150, looseness=1.2] (3,0);
  pic.pen().moveTo(0, 0).to(3, 0, { out: 30, in: 150, looseness: 1.2 })

  // \draw (0,0) rectangle (2,1);
  pic.pen().moveTo(0, 0).rectangle(2, 1)

  // \draw (1,1) circle (0.5);
  pic.pen().moveTo(1, 1).circle({ radius: 0.5 })

  // \draw (1,1) circle [radius=0.5];
  pic.pen().moveTo(1, 1).circle({ radius: 0.5 })

  // \draw (1,1) ellipse (1 and 0.5);
  pic.pen().moveTo(1, 1).ellipse(1, 0.5)

  // \draw (1,1) ellipse [x radius=1, y radius=0.5];
  pic.pen().moveTo(1, 1).ellipse(1, 0.5)

  // \draw (0,0) arc (0:90:1);
  pic.pen().moveTo(0, 0).arc({ start: 0, end: 90, radius: 1 })

  // \draw (0,0) arc [start angle=0, end angle=90, radius=1];
  pic.pen().moveTo(0, 0).arc({ start: 0, end: 90, radius: 1 })

  // \draw (0,0) arc [start angle=0, delta angle=45, x radius=2, y radius=1];
  pic.pen().moveTo(0, 0).arc({ start: 0, delta: 45, xRadius: 2, yRadius: 1 })

  // \draw (0,0) grid (3,2);
  pic.pen().moveTo(0, 0).grid(3, 2)

  // \draw[step=0.5] (0,0) grid (2,1);
  pic.pen().moveTo(0, 0).grid(2, 1)

  // \draw (0,0) parabola (1,1);
  pic.pen().moveTo(0, 0).parabola(point(1, 1))

  // \draw (0,0) parabola bend (0.5,-0.5) (1,0);
  pic.pen().moveTo(0, 0).parabola(point(1, 0), { bend: point(0.5, -0.5) })

  // \draw (0,0) sin (1,1) cos (2,0);
  pic.pen().moveTo(0, 0).sin(point(1, 1)).cos(point(2, 0))

  // \draw (0,0) -- ++(1,0) -- ++(0,1);
  pic.pen().moveTo(0, 0).lineTo(rel(1, 0)).lineTo(rel(0, 1))

  // \draw (0,0) -- ++(45:1);
  pic.pen().moveTo(0, 0).lineTo(rel(0.707106781, 0.707106781))

  // \draw (30:2) -- (120:1cm);
  pic.pen().moveTo(1.732050808, 1).lineTo(-0.5, 0.866025404)

  // \draw (1cm,2pt) -- (3mm,-1in);
  pic.pen().moveTo(1, 0.070291961).lineTo(0.3, -2.54)

  // \draw (0,0) -- (1,0) (2,0) -- (3,0);
  pic.pen().moveTo(0, 0).lineTo(1, 0).moveTo(2, 0).lineTo(3, 0)

  return pic
}

import { allShapes, cm, mm, picture, point } from 'jikz'
import { angle, rightAngle } from 'jikz/angles'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
  /** A named point, in the picture's frame coordinates. */
  const ref = (spec: string) => pic.frame.unmap(pic.resolve(spec))

  // \coordinate (A) at (3,0);
  pic.coordinate('A', point(3, 0))

  // \coordinate (O) at (0,0);
  pic.coordinate('O', point(0, 0))

  // \coordinate (B) at (2,2);
  pic.coordinate('B', point(2, 2))

  // \coordinate (C) at (0,2);
  pic.coordinate('C', point(0, 2))

  // \draw (A) -- (O) -- (B) (O) -- (C);
  pic.pen().moveTo('A').lineTo('O').lineTo('B').moveTo('O').lineTo('C')

  // \pic[draw, fill=blue!20, "$\alpha$"] {angle=A--O--B};
  pic.filldraw(angle(ref('A'), ref('O'), ref('B'), { radius: mm(5), eccentricity: 0.6, label: '$\\alpha$' }), { style: [{ stroke: '#000000' }, { fill: '#ccccff' }] })

  // \pic[draw=red, angle radius=1cm, angle eccentricity=1.3, "$\beta$" {red}] {angle=B--O--C};
  pic.draw(angle(ref('B'), ref('O'), ref('C'), { radius: cm(1), eccentricity: 1.3, label: '$\\beta$', labelStyle: { fill: '#ff0000' } }), { style: [{ stroke: '#ff0000' }] })

  // \draw pic[angle radius=4mm] {angle=A--O--C};
  pic.draw(angle(ref('A'), ref('O'), ref('C'), { radius: mm(4), eccentricity: 0.6 }))

  // \pic[draw, thick] {right angle=A--O--C};
  pic.draw(rightAngle(ref('A'), ref('O'), ref('C'), { radius: mm(5), eccentricity: 0.6 }), { style: [{ stroke: '#000000' }, 'thick'] })

  // \pic[fill=gray, pic text=$\gamma$] {angle=C--O--A};
  pic.fill(angle(ref('C'), ref('O'), ref('A'), { radius: mm(5), eccentricity: 0.6, label: '$\\gamma$' }), { style: [{ fill: '#808080' }] })

  // \filldraw[fill=yellow] pic {angle=B--O--A};
  pic.filldraw(angle(ref('B'), ref('O'), ref('A'), { radius: mm(5), eccentricity: 0.6 }), { style: [{ fill: '#ffff00' }] })

  return pic
}

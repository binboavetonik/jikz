import { picture, point, circle } from 'jikz'
import { spy } from 'jikz/spy'

// TikZ's spy library: \spy [circle, size=2cm, magnification=4] on (p)
// in node at (q). Everything drawn before spy() is replayed into a
// lens at q — clipped, scaled about p — with the two outlines and the
// connecting line of `spy using outlines, connect spies`. Here the
// fine structure is a plot of tiny circles that only reads magnified.

export default function render(container: HTMLElement) {
  const pic = picture()

  // A dense field of dots with one odd one out.
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 6; j++) {
      const p = point(40 + i * 14, 50 + j * 14)
      const odd = i === 4 && j === 2
      pic.fill(circle(p, odd ? 2.6 : 2), { style: { fill: odd ? '#dc2626' : '#94a3b8' } })
    }
  }
  pic.pen({ style: { stroke: '#334155', strokeWidth: 1 } }).moveTo(30, 40).rectangle(166, 132)

  spy(pic, { on: point(96, 78), in: point(300, 100), magnification: 4, size: 110 })

  pic.mount(container, { fit: true, padding: 12 })
}

import { picture, lindenmayer, kochCurve } from 'jikz'

// The texample classic, now the PGF manual's own declaration:
//   \pgfdeclarelindenmayersystem{Koch curve}{ \rule{F -> F-F++F-F} }
//   \shadedraw [l-system={Koch curve, step=2pt, angle=60,
//               axiom=F++F++F, order=3}] lindenmayer system -- cycle;
// kochCurve ships those rules and that axiom; order 4 at step 4 gives
// the same 768-segment outline the hand-rolled recursion used to build.

export default function render(container: HTMLElement) {
  const pic = picture()

  const snowflake = lindenmayer(kochCurve, { order: 4, step: 4, angle: 60 })

  pic.filldraw(snowflake, {
    style: { stroke: '#2563eb', strokeWidth: 1.2, fill: '#dbeafe' },
  })

  pic.mount(container, { fit: true, padding: 10 })
}

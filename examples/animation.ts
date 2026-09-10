import { picture, point, circle, line, Transform } from 'jikz'

export default function render(container: HTMLElement) {
  // Declarative SMIL: `animate` on any render call emits <animate> /
  // <animateTransform> children. They serialize into toSVG() output —
  // a saved static file still animates — and mount unchanged.
  const c = point(200, 100)
  const pic = picture()

  // Expanding, fading radar rings — staggered by `begin`. SMIL scales
  // around the LOCAL origin, so each ring is drawn at (0,0) inside a
  // scope that translates it to the radar center.
  for (const begin of ['0s', '0.7s', '1.4s']) {
    pic.scope({ transform: Transform.translation(c.x, c.y) }, (s) => {
      s.draw(circle(point(0, 0), 6), {
        style: { stroke: '#0ea5e9', strokeWidth: 2, fill: 'none' },
        animate: [
          { kind: 'animateTransform', attributeName: 'transform', type: 'scale',
            from: '1', to: '12', dur: '2.1s', repeatCount: 'indefinite', begin },
          { attributeName: 'opacity', values: '0.9;0', dur: '2.1s',
            repeatCount: 'indefinite', begin },
        ],
      })
    })
  }

  // Rotating sweep hand.
  pic.draw(line(c, point(200, 20)), {
    style: { stroke: '#0369a1', strokeWidth: 2 },
    animate: {
      kind: 'animateTransform', attributeName: 'transform', type: 'rotate',
      from: `0 ${c.x} ${c.y}`, to: `360 ${c.x} ${c.y}`,
      dur: '4.2s', repeatCount: 'indefinite',
    },
  })

  // The steady beacon dot.
  pic.draw(circle(c, 6), { style: { fill: '#0369a1', stroke: 'none' } })

  // Fixed viewBox: the rings outgrow the resting geometry's bounds.
  pic.mount(container, { width: 400, height: 200 })
}

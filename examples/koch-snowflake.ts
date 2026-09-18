import { picture, point } from 'jikz'
import { lsystem, LSYSTEMS } from 'jikz/turtle'

// The texample classic fractal as TikZ's lindenmayersystems library
// writes it: axiom F--F--F, rule F → F+F--F+F, angle 60, order 4. The
// L-system expands the string and a turtle walks it into one Path,
// which a single filldraw paints — 768 segments, no point arithmetic.

export default function render(container: HTMLElement) {
  const pic = picture()

  const { path } = lsystem(LSYSTEMS.kochSnowflake, {
    iterations: 4,
    step: 260 / 81, // the flake's side is 260 px: 3^4 steps per side
    start: point(40, 140),
    heading: 0,
  })

  pic.filldraw(path, { style: { stroke: '#2563eb', strokeWidth: 1.2, fill: '#dbeafe' } })

  pic.mount(container, { fit: true, padding: 10 })
}

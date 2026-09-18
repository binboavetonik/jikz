import { picture, point } from 'jikz'
import { lsystem, LSYSTEMS, turtle } from 'jikz/turtle'

// Two path generators from TikZ's turtle and lindenmayersystems
// libraries. Left: the bracketed L-system plant (X → F+[[X]-X]-F[-FX]+X,
// F → FF, 25°) after five rewrites — `[` and `]` push and pop the
// turtle, which is what makes it branch. Right: a turtle walking a
// spiral by hand — forward, right, a little more each time.

export default function render(container: HTMLElement) {
  const pic = picture()

  const plant = lsystem(LSYSTEMS.plant, { iterations: 5, step: 2.6, start: point(120, 280), heading: 65 })
  pic.draw(plant.path, { style: { stroke: '#16a34a', strokeWidth: 0.8 } })

  const t = turtle({ start: point(330, 200), heading: 0 })
  for (let i = 0; i < 60; i++) t.forward(3 + i * 1.6).right(60)
  pic.draw(t.path(), { style: { stroke: '#7c3aed', strokeWidth: 1 } })

  pic.mount(container, { fit: true, padding: 12 })
}

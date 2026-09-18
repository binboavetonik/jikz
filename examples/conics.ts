import { picture, ellipse, parabola, hyperbola, point } from 'jikz'

// The three conic sections as first-class shapes. Each caption is
// placed with `at: 'south'` from a point below the curve, so the text
// box is measured and never lands on the ink; `fit: true` sizes the
// viewBox from the content, so the hyperbola's branches cannot be
// cropped by a hand-guessed width.

export default function render(container: HTMLElement) {
  const pic = picture()
  const caption = { at: 'south', style: { fontSize: 11 } } as const

  pic.draw(ellipse(point(80, 75), 55, 35), { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.text(point(80, 155), 'ellipse', caption)

  pic.draw(parabola(point(210, 110), 12), { style: { stroke: '#16a34a', strokeWidth: 2 } })
  pic.text(point(210, 155), 'parabola', caption)

  pic.draw(hyperbola(point(380, 75), 20, 14), { style: { stroke: '#dc2626', strokeWidth: 2 } })
  pic.text(point(380, 155), 'hyperbola', caption)

  pic.mount(container, { fit: true, padding: 14 })
}

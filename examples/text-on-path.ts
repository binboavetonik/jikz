import { picture, point, textAlongPath, circlePath, arc } from 'jikz'

// TikZ's decorations.text: text rides a path via SVG <textPath>, so it
// stays selectable, crisp type. anchor: 'middle' centers on the path
// midpoint; side: 'right' flips to the other side of the guide.

export default function render(container: HTMLElement) {
  const pic = picture()

  // Around a full circle, centered at the top.
  const ring = circlePath(point(120, 110), 70)
  pic.draw(ring, { style: { stroke: '#cbd5e1', dash: 'dashed' } })
  pic.draw(
    textAlongPath(ring, 'text along a circular path', {
      anchor: 'middle',
      fontSize: 13,
      color: '#334155',
    })
  )

  // Along an arc, on the reverse side so it reads inside the bend —
  // the guide accepts any outline (Arc, Circle, shapes), not just Path.
  const bend = arc(point(330, 120), 55, 200, -20)
  pic.draw(bend, { style: { stroke: '#2563eb', strokeWidth: 1.5 } })
  pic.draw(
    textAlongPath(bend, 'inside the bend', {
      anchor: 'middle',
      side: 'right',
      fontSize: 12,
      color: '#2563eb',
    })
  )

  pic.mount(container, { fit: true, padding: 26 })
}

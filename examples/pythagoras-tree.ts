import { picture, polygon, point, type Point } from 'jikz'

// The Pythagoras tree: a square sprouts two child squares on the legs
// of a right triangle built on its top edge — recurse. Pure derived
// geometry: the child squares come from rotating the leg vector,
// exactly like the standalone Pythagoras card's squareOn().

export default function render(container: HTMLElement) {
  const pic = picture()

  /** Grow one square (base corners p0→p1), then recurse on its top. */
  const grow = (p0: Point, p1: Point, depth: number): void => {
    if (depth === 0) return
    // the square above edge p0→p1 (inward normal, screen y-down: rotate +90°)
    const v = point(p1.x - p0.x, p1.y - p0.y)
    const up = point(v.y, -v.x) // left-of-travel normal
    const q1 = point(p1.x + up.x, p1.y + up.y)
    const q0 = point(p0.x + up.x, p0.y + up.y)

    pic.filldraw(polygon([p0, p1, q1, q0]), {
      style: {
        stroke: '#92400e', strokeWidth: 1,
        fill: depth > 4 ? '#d97706' : depth > 2 ? '#65a30d' : '#16a34a',
        fillOpacity: 0.85,
      },
    })

    // right triangle on the top edge q0→q1 with apex angle split 30/60:
    // apex divides so the legs make 30°/60° with the top edge
    const apex = q0.add(point(
      (q1.x - q0.x) * 0.75 - (q1.y - q0.y) * Math.sqrt(3) / 4,
      (q1.x - q0.x) * Math.sqrt(3) / 4 + (q1.y - q0.y) * 0.75,
    ))

    grow(q0, apex, depth - 1)
    grow(apex, q1, depth - 1)
  }

  grow(point(170, 250), point(230, 250), 8)
  pic.mount(container, { fit: true, padding: 12 })
}

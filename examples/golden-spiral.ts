import { picture, path, rect, point, type Point } from 'jikz'

// The golden spiral: quarter-circle arcs with Fibonacci radii,
// inscribed in the nested Fibonacci squares. Construction: walk the
// arc centers — each center is 90° right of the travel direction
// (clockwise spiral), each arc turns the tangent another 90°, and the
// square is simply the arc's axis-aligned bounding box. Everything is
// point arithmetic; no corner is hand-placed.

const FIB = [1, 1, 2, 3, 5, 8, 13, 21]
const U = 10 // px per Fibonacci unit

/** Screen-clockwise quarter turn: east→south→west→north. */
const rot90cw = (v: Point) => point(-v.y, v.x)
const mul = (v: Point, k: number) => point(v.x * k, v.y * k)

export default function render(container: HTMLElement) {
  const pic = picture()

  let P = point(80, 240)      // running arc endpoint (spiral start)
  let d = point(1, 0)         // travel direction, east

  // Path is IMMUTABLE — every builder call returns a new Path, so the
  // spiral has to be reassigned, not just called on.
  let spiral = path().moveTo(P)
  for (const f of FIB) {
    const r = f * U
    const C = P.add(mul(rot90cw(d), r))       // arc center, right of travel
    const next = C.add(mul(d, r))             // end point, 90° around

    // the square this arc is inscribed in
    const minX = Math.min(C.x, P.x, next.x)
    const minY = Math.min(C.y, P.y, next.y)
    pic.draw(rect(minX, minY, r, r), { style: { stroke: '#e2e8f0', strokeWidth: 1 } })

    spiral = spiral.arcTo(r, r, 0, false, true, next) // quarter turn, clockwise sweep

    P = next
    d = rot90cw(d)
  }

  pic.draw(spiral, { style: { stroke: '#b45309', strokeWidth: 2.5 } })
  pic.mount(container, { fit: true, padding: 12 })
}

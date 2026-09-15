import { picture, polygon, rectFromCenter, rotated, arc, point, polar } from 'jikz'

// The mechanics textbook figure: a block resting on a 20° incline,
// with weight, normal force and friction drawn from its center as
// stealth-arrow vectors. The wedge, the contact point, the block's
// rotation and every vector angle are derived from ANGLE — change it
// and the whole figure tilts with it.

const ANGLE = 20                       // incline angle, degrees
const SLOPE = -ANGLE                   // screen convention: up to the right
const BASE_Y = 200, X0 = 30, X1 = 370  // the wedge's ground line

export default function render(container: HTMLElement) {
  const pic = picture()

  // The wedge: ground, vertical riser, and the incline surface back to
  // the corner. The surface is the hypotenuse — the line the block sits on.
  const foot = point(X0, BASE_Y)
  const apex = point(X1, BASE_Y - (X1 - X0) * Math.tan((ANGLE * Math.PI) / 180))
  pic.filldraw(polygon([foot, point(X1, BASE_Y), apex]), {
    style: { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 2 },
  })

  // the incline angle at the foot, between the ground and the surface
  pic.draw(arc(foot, 52, SLOPE, 0), {
    style: { stroke: '#64748b', strokeWidth: 1.5 },
    label: { text: `${ANGLE}°`, at: SLOPE / 2, distance: 8, options: { fontSize: 11 } },
  })

  // The block: centered half a block-height along the surface normal,
  // so it rests ON the incline rather than intersecting it, and rotated
  // to match. `rotated` keeps the rectangle a value — no transform state.
  const W = 60, H = 44
  const contact = foot.toward(apex, 0.55)
  const C = contact.add(polar(SLOPE - 90, H / 2))
  pic.filldraw(rotated(rectFromCenter(C, W, H), SLOPE), {
    style: { stroke: '#334155', fill: '#dbeafe', strokeWidth: 1.5 },
  })

  // Force vectors from the center — each angle stated against the slope.
  const F = 66
  const vectors: [label: string, deg: number, len: number, color: string][] = [
    ['mg', 90, F, '#dc2626'],                 // weight: straight down
    ['N', SLOPE - 90, F * 0.9, '#2563eb'],    // normal: out of the surface
    ['f', SLOPE, F * 0.6, '#16a34a'],         // friction: up the slope
  ]
  for (const [label, deg, len, color] of vectors) {
    const tip = C.add(polar(deg, len))
    pic.edge(C, tip, { arrowEnd: 'stealth' }, { style: { stroke: color, strokeWidth: 2 } })
    // `at: deg` continues the vector's own direction, so the label sits
    // past the arrowhead however the incline is tilted.
    pic.text(tip, label, { at: deg, distance: 5, fontSize: 12, style: { stroke: color } })
  }

  pic.mount(container, { fit: true, padding: 16 })
}

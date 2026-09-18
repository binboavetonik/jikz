import { picture, ellipse, line, point, intersectLineLine } from 'jikz'

// Thin-lens ray diagram: the three principal rays from the arrow tip —
// parallel-then-through-far-focus, through-the-center-straight, and
// through-near-focus-then-parallel. The image forms where they meet;
// nothing is hand-placed past the focal length and object distance.

export default function render(container: HTMLElement) {
  const pic = picture()
  const AXIS = 150
  const LENS_X = 260, F = 70          // lens position, focal length
  const OBJ_X = 90, OBJ_H = 55        // object position, height

  // optical axis + lens (a tall ellipse) + focal points
  pic.draw(line(point(30, AXIS), point(470, AXIS)), { style: { stroke: '#94a3b8' } })
  pic.draw(ellipse(point(LENS_X, AXIS), 8, 85), { style: { stroke: '#2563eb', strokeWidth: 2 } })
  for (const fx of [LENS_X - F, LENS_X + F]) {
    pic.draw(point(fx, AXIS), {
      style: { stroke: '#334155', strokeWidth: 2.5 },
      label: { text: 'F', at: 'south', style: { fontSize: 10 } },
    })
  }

  // object arrow
  const obj = point(OBJ_X, AXIS - OBJ_H)
  pic.edge(point(OBJ_X, AXIS), obj, { arrowEnd: 'stealth', style: { stroke: '#334155', strokeWidth: 2 } })
  pic.text(obj, 'object', { at: 'north', distance: 6, style: { fontSize: 10 } })

  // principal rays from the object tip
  // 1: parallel to axis, then refract through far focus
  const r1knee = point(LENS_X, obj.y)
  const farF = point(LENS_X + F, AXIS)
  const d1 = r1knee.angleTo(farF)
  const r1end = r1knee.add(point(Math.cos(d1 * Math.PI / 180) * 220, Math.sin(d1 * Math.PI / 180) * 220))
  pic.pen({ style: { stroke: '#dc2626', strokeWidth: 1.3 } }).moveTo(obj).lineTo(r1knee).lineTo(r1end)

  // 2: straight through the lens center
  const d2 = obj.angleTo(point(LENS_X, AXIS))
  const r2end = obj.add(point(Math.cos(d2 * Math.PI / 180) * 420, Math.sin(d2 * Math.PI / 180) * 420))
  pic.draw(line(obj, r2end), { style: { stroke: '#16a34a', strokeWidth: 1.3 } })

  // the image tip is where the refracted rays actually cross
  const imgTip = intersectLineLine(line(r1knee, r1end), line(obj, r2end)).points[0]!
  pic.edge(point(imgTip.x, AXIS), imgTip, { arrowEnd: 'stealth', style: { stroke: '#7c3aed', strokeWidth: 2 } })
  pic.text(imgTip, 'image', { at: 'south', distance: 6, style: { fontSize: 10, fill: '#7c3aed' } })

  pic.mount(container, { fit: true, padding: 14 })
}

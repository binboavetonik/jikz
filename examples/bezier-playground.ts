import { picture, path, point } from 'jikz'

// Quadratic vs cubic Bézier with the same endpoints: the quadratic's
// single control point pulls the whole curve; the cubic's two let the
// ends aim independently. Control handles drawn dashed — the TikZ
// controls idiom made visible.

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(40, 150)
  const B = point(280, 150)

  // quadratic: one control point above the midpoint
  const q = path().moveTo(A).quadraticTo(point(160, 30), B)
  pic.draw(q, { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.pen({ style: { stroke: '#93c5fd', dash: 'dashed' } })
    .moveTo(A).lineTo(point(160, 30)).lineTo(B)
  pic.draw(point(160, 30), {
    style: { stroke: '#2563eb', strokeWidth: 2.5 },
    label: { text: 'quadratic — 1 control point', at: 'north', style: { fontSize: 10, fill: '#2563eb' } },
  })

  // cubic: two control points, ends aim up and down
  const cubic = path().moveTo(point(40, 240)).curveTo(point(100, 320), point(230, 120), point(280, 240))
  pic.draw(cubic, { style: { stroke: '#dc2626', strokeWidth: 2 } })
  pic.pen({ style: { stroke: '#fca5a5', dash: 'dashed' } })
    .moveTo(40, 240).lineTo(100, 320)
    .moveTo(280, 240).lineTo(230, 120)
  pic.draw(point(100, 320), {
    style: { stroke: '#dc2626', strokeWidth: 2.5 },
    label: { text: 'cubic — 2 control points, independent ends', at: 'south', style: { fontSize: 10, fill: '#dc2626' } },
  })
  pic.draw(point(230, 120), { style: { stroke: '#dc2626', strokeWidth: 2.5 } })

  pic.mount(container, { fit: true, padding: 12 })
}

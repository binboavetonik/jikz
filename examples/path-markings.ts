import { picture, point, markPath, pathFrom } from 'jikz'

// TikZ's decorations.markings: arrow tips and plot marks placed at
// positions along a path, rotated with the tangent — no markers, no
// manual angle math. Marks inherit the path's stroke color.

export default function render(container: HTMLElement) {
  const pic = picture()

  // A bent curve with direction arrows along it (the TikZ
  // `postaction=decorate` idiom).
  const curve = pathFrom(point(30, 60))
    .curveTo(point(90, 10), point(170, 110), point(230, 60))
  pic.draw(
    markPath(curve, { mark: 'stealth', between: [0.2, 0.8], step: 0.3 }),
    { style: { stroke: '#2563eb', strokeWidth: 1.5 } }
  )

  // Tick marks across a straight baseline (mark: 'bar' does not rotate
  // visually — it is tangent-relative, so it stays perpendicular).
  const base = pathFrom(point(30, 150)).lineTo(point(230, 150))
  pic.draw(
    markPath(base, { mark: 'bar', between: [0.1, 0.9], step: 0.2 }),
    { style: { stroke: '#334155', strokeWidth: 1.5 } }
  )

  // Plot marks as upright scatter glyphs along a path — force the
  // plot-mark namespace for names an arrow tip also claims.
  const diag = pathFrom(point(280, 110)).lineTo(point(430, 10))
  pic.draw(
    markPath(diag,
      { mark: { plotMark: 'cross', size: 6 }, between: [0, 1], step: 0.25 }),
    { style: { stroke: '#dc2626', strokeWidth: 1.5 } }
  )

  // Both namespaces in one statement: arrowheads march, dots stay put.
  const wave = pathFrom(point(280, 150))
    .curveTo(point(320, 100), point(390, 190), point(430, 140))
  pic.draw(
    markPath(wave,
      { mark: 'to', at: [0.33, 0.66] },
      { mark: 'circle', at: 0.5, scale: 0.8 }),
    { style: { stroke: '#059669', strokeWidth: 1.5 } }
  )

  pic.mount(container, { fit: true, padding: 12 })
}

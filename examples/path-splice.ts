import { picture, path, joinPaths, point } from 'jikz'

// Path splicing: two open curves become one closed outline via
// joinPaths(..., close=true) — a leaf built from a top arc and a
// bottom arc, filled as a single path. No segment is drawn twice;
// the seams are shared endpoints.

export default function render(container: HTMLElement) {
  const pic = picture()

  const tip = point(60, 120)
  const stem = point(280, 120)
  const belly = 55

  // top and bottom arcs of the leaf, stem → tip and tip → stem
  const top = path().moveTo(tip).curveTo(point(140, 120 - belly), point(220, 120 - belly), stem)
  const bottom = path().moveTo(stem).curveTo(point(220, 120 + belly), point(140, 120 + belly), tip)

  // one closed outline from both open curves
  pic.filldraw(joinPaths([top, bottom], true), {
    style: { stroke: '#16a34a', strokeWidth: 2, fill: '#dcfce7' },
  })

  // center vein
  pic.draw(path().moveTo(tip).lineTo(stem), { style: { stroke: '#16a34a', strokeWidth: 1 } })

  pic.text(point(170, 200), 'two open curves → joinPaths(…, true) → one closed leaf', { fontSize: 10 })
  pic.mount(container, { fit: true, padding: 14 })
}

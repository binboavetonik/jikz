import { picture, point, rect, circle, footprints, shapesAlongPath, path } from 'jikz'

// Three TikZ libraries on one card. fadings: `path fading=west` and
// `fade out` as opacity masks on a fill. decorations.footprints: prints
// alternating sides of a path, toed out. decorations.shapes: a shape
// repeated every few px along a curve.

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.fill(rect(30, 30, 140, 60), { style: { fill: '#2563eb', fading: 'west' } })
  pic.fill(circle(point(240, 60), 34), { style: { fill: '#dc2626', fading: 'fade out' } })
  pic.text(point(100, 108), 'path fading=west', { style: { fontSize: 10, fill: '#64748b' } })
  pic.text(point(240, 108), 'fade out', { style: { fontSize: 10, fill: '#64748b' } })

  const trail = path().moveTo(point(30, 170)).curveTo(point(110, 120), point(190, 220), point(290, 160))
  pic.draw(footprints(trail, { footLength: 9, stride: 34, sep: 8 }), { style: { stroke: 'none', fill: '#334155' } })

  const wave = path().moveTo(point(30, 230)).curveTo(point(110, 190), point(190, 270), point(290, 230))
  pic.draw(shapesAlongPath(wave, { shape: { plotMark: 'diamondFilled', size: 5 }, sep: 14 }), { style: { stroke: '#94a3b8', fill: '#16a34a' } })

  pic.mount(container, { fit: true, padding: 12 })
}

import { picture, path, point, offsetPath, doublePath, smoothPath, subPath } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // offset ±14 around a bezier
  const wave = path().moveTo(point(30, 60)).curveTo(point(90, 10), point(150, 110), point(210, 60))
  pic.draw(wave, { style: { stroke: '#334155', strokeWidth: 1.5 } })
  pic.draw(offsetPath(wave, 14),  { style: { stroke: '#2563eb', dash: 'dashed' } })
  pic.draw(offsetPath(wave, -14), { style: { stroke: '#dc2626', dash: 'dashed' } })
  pic.text(point(60, 24), 'offset ±14', { fontSize: 10 })

  // TikZ's double line, as two real paths
  const spine = path().moveTo(point(30, 165)).curveTo(point(90, 135), point(150, 195), point(210, 165))
  const [outer, inner] = doublePath(spine, 8)
  pic.draw(outer, { style: { stroke: '#16a34a', strokeWidth: 1.2 } })
  pic.draw(inner, { style: { stroke: '#16a34a', strokeWidth: 1.2 } })
  pic.text(point(60, 130), 'doublePath', { fontSize: 10 })

  // polyline → spline, with the middle 30–70% highlighted
  const raw = path().moveTo(point(260, 50)).lineTo(point(300, 90)).lineTo(point(340, 30)).lineTo(point(385, 95)).lineTo(point(415, 55))
  pic.draw(raw, { style: { stroke: '#94a3b8', dash: 'dotted' } })
  const smooth = smoothPath(raw, 0.5)
  pic.draw(smooth, { style: { stroke: '#7c3aed', strokeWidth: 2 } })
  pic.draw(subPath(smooth, 0.3, 0.7), { style: { stroke: '#f59e0b', strokeWidth: 3.5 } })
  pic.text(point(300, 130), 'smoothPath + subPath', { fontSize: 10 })

  pic.mount(container, { width: 440, height: 210 })
}

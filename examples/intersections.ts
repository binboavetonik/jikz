import { picture, circle, line, point, intersectLineCircle, intersectCircleCircle } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const c1 = circle(point(90, 70), 50)
  const c2 = circle(point(160, 70), 40)
  const l = line(point(20, 130), point(240, 20))

  pic.draw(c1, { style: { stroke: '#2563eb' } })
  pic.draw(c2, { style: { stroke: '#16a34a' } })
  pic.draw(l,  { style: { stroke: '#475569' } })

  const hits = [
    ...intersectLineCircle(l, c1).points,
    ...intersectCircleCircle(c1, c2).points,
  ]
  for (const p of hits) {
    pic.draw(p, { style: { stroke: '#dc2626', strokeWidth: 2.5 } })
  }

  pic.mount(container, { width: 280, height: 150 })
}

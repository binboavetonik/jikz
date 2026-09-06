import { picture, circle, line, rect, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  const ball = circle(point(60, 90), 40)
  const box  = rect(130, 50, 80, 80)
  const diag = line(point(230, 30), point(290, 150))

  pic.filldraw(ball, { style: { stroke: '#2563eb', strokeWidth: 2, fill: '#dbeafe' } })
  pic.filldraw(box,  { style: { stroke: '#16a34a', strokeWidth: 2, fill: '#dcfce7' } })
  pic.draw(diag,     { style: { stroke: '#dc2626', strokeWidth: 2 } })

  pic.mount(container, { width: 300, height: 180 })
}

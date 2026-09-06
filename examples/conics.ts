import { picture, ellipse, parabola, hyperbola, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.draw(ellipse(point(80, 75), 55, 35),   { style: { stroke: '#2563eb', strokeWidth: 2 } })
  pic.draw(parabola(point(210, 110), 12),    { style: { stroke: '#16a34a', strokeWidth: 2 } })
  pic.draw(hyperbola(point(360, 75), 20, 14), { style: { stroke: '#dc2626', strokeWidth: 2 } })

  pic.text(point(80, 140), 'ellipse',    { fontSize: 11 })
  pic.text(point(210, 140), 'parabola',  { fontSize: 11 })
  pic.text(point(360, 140), 'hyperbola', { fontSize: 11 })

  pic.mount(container, { width: 440, height: 160 })
}

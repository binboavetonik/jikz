import { picture, triangle, polygon, point, type Point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // Right triangle: legs 90 & 120, hypotenuse 150 (3-4-5 x 30)
  const A = point(210, 140), B = point(330, 230), C = point(210, 230)

  // Square built outward on segment P->Q ('side' picks the normal)
  const squareOn = (P: Point, Q: Point, side: number) => {
    const nx = -(Q.y - P.y) * side, ny = (Q.x - P.x) * side
    return [P, Q, point(Q.x + nx, Q.y + ny), point(P.x + nx, P.y + ny)]
  }
  const center4 = (sq: Point[]) => point(
    sq.reduce((s, p) => s + p.x, 0) / 4, sq.reduce((s, p) => s + p.y, 0) / 4)

  const sqA = squareOn(C, A, -1) // leg a
  const sqB = squareOn(C, B, 1)  // leg b
  const sqC = squareOn(A, B, -1) // hypotenuse

  pic.filldraw(polygon(sqA), { style: { stroke: '#2563eb', fill: '#2563eb', fillOpacity: 0.15, strokeWidth: 1.5 } })
  pic.filldraw(polygon(sqB), { style: { stroke: '#16a34a', fill: '#16a34a', fillOpacity: 0.15, strokeWidth: 1.5 } })
  pic.filldraw(polygon(sqC), { style: { stroke: '#dc2626', fill: '#dc2626', fillOpacity: 0.12, strokeWidth: 1.5 } })
  pic.filldraw(triangle(A, B, C), { style: { stroke: '#111827', fill: '#fbbf24', fillOpacity: 0.5, strokeWidth: 2 } })

  // Right-angle marker at C — one corner pen statement (TikZ |-)
  pic.pen({ style: { stroke: '#111827' } }).moveTo(198, 230).vhTo(210, 218)

  pic.text(center4(sqA), '$a^2$')
  pic.text(center4(sqB), '$b^2$')
  pic.text(center4(sqC), '$c^2$')

  pic.mount(container, { width: 440, height: 370 })
}

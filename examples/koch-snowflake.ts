import { picture, point, polar, type Point } from 'jikz'

// The texample classic fractal. Each Koch iteration replaces every
// segment AB with A–P–peak–Q–B where the peak is the outward
// equilateral bump. Points do all the math: toward() for the thirds,
// polar() for the 60° bump (screen convention: -60° tips it outward
// when the edge runs clockwise around the triangle).

function kochEdge(A: Point, B: Point, depth: number): Point[] {
  if (depth === 0) return [B]
  const P = A.toward(B, 1 / 3)
  const Q = A.toward(B, 2 / 3)
  // outward equilateral peak: from P, at (direction A→B) - 60°
  const peak = P.add(polar(A.angleTo(B) - 60, A.distanceTo(B) / 3))
  return [
    ...kochEdge(A, P, depth - 1),
    ...kochEdge(P, peak, depth - 1),
    ...kochEdge(peak, Q, depth - 1),
    ...kochEdge(Q, B, depth - 1),
  ]
}

export default function render(container: HTMLElement) {
  const pic = picture()

  // Upward equilateral triangle (screen: 270° = north)
  const C = point(170, 190)
  const R = 150
  const [A, B, Cc] = [270, 30, 150].map((deg) => C.add(polar(deg, R))) as [Point, Point, Point]

  const depth = 4
  const outline = [
    ...kochEdge(A, B, depth),
    ...kochEdge(B, Cc, depth),
    ...kochEdge(Cc, A, depth),
  ]

  const pen = pic.pen({ style: { stroke: '#2563eb', strokeWidth: 1.2, fill: '#dbeafe' }, mode: 'filldraw' })
    .moveTo(A)
  for (const p of outline) pen.lineTo(p)
  pen.close()

  pic.mount(container, { fit: true, padding: 10 })
}

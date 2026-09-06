import { picture, line, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(40, 130)
  const B = point(260, 40)

  // (A)!0.5!(B) — the midpoint
  const mid = A.toward(B, 0.5)
  // (A |- B) — horizontal from A, vertical from B
  const corner = A.horAt(B)

  pic.draw(line(A, B), { style: { stroke: '#94a3b8', dash: 'dashed' } })
  pic.draw(line(A, corner), { style: { stroke: '#2563eb' } })
  pic.draw(line(corner, B), { style: { stroke: '#2563eb' } })
  for (const { p, name } of [
    { p: A, name: 'A' }, { p: B, name: 'B' }, { p: mid, name: 'mid' }, { p: corner, name: 'corner' },
  ]) {
    pic.draw(p, { style: { stroke: '#111827', strokeWidth: 2 } })
    pic.text(point(p.x, p.y + 14), name, { fontSize: 10 })
  }

  pic.mount(container, { width: 300, height: 160 })
}

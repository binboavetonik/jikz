import { picture, line, point } from 'jikz'

// TikZ's coordinate operators, as Point methods. The dashed diagonal is
// the direct route from A to B; the two solid L-paths are the orthogonal
// completions, one through each corner the operators name.

export default function render(container: HTMLElement) {
  const pic = picture()
  const A = point(40, 130)
  const B = point(260, 40)

  // (A)!0.5!(B) — interpolate a fraction of the way from A to B
  const mid = A.toward(B, 0.5)
  // (A |- B) — vertical line through A meets the horizontal through B
  const upper = A.horAt(B)
  // (A -| B) — horizontal line through A meets the vertical through B
  const lower = A.verAt(B)

  pic.draw(line(A, B), { style: { stroke: '#94a3b8', dash: 'dashed' } })
  for (const corner of [upper, lower]) {
    pic.draw(line(A, corner), { style: { stroke: '#2563eb' } })
    pic.draw(line(corner, B), { style: { stroke: '#2563eb' } })
  }

  const dot = { style: { stroke: '#111827', strokeWidth: 2 } }
  // `label` places text off the point's own boundary — no hand-computed
  // offsets, and the gap stays right when the font or text changes.
  pic.draw(A, { ...dot, label: { text: 'A', at: 'south west' } })
  pic.draw(B, { ...dot, label: { text: 'B', at: 'north east' } })
  pic.draw(mid, { ...dot, label: { text: '(A)!0.5!(B)', at: 'south east' } })
  pic.draw(upper, { ...dot, label: { text: '(A |- B)', at: 'north west' } })
  pic.draw(lower, { ...dot, label: { text: '(A -| B)', at: 'south east' } })

  pic.mount(container, { fit: true, padding: 16 })
}

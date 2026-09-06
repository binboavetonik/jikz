import { picture, rect, point } from 'jikz'

// Chess-app card: an 8×8 heatmap of where your tactics puzzles go
// wrong — one rect per square, fill-opacity from the miss frequency.
// The whole board is a data loop; only the palette is hand-chosen.

// miss frequency per square (rank 8 first, like a board diagram)
const MISSES: number[][] = [
  [0.1, 0.0, 0.2, 0.3, 0.2, 0.1, 0.0, 0.1],
  [0.2, 0.4, 0.6, 0.5, 0.3, 0.2, 0.1, 0.0],
  [0.1, 0.3, 0.7, 0.9, 0.6, 0.4, 0.2, 0.1],
  [0.0, 0.2, 0.5, 0.8, 0.7, 0.3, 0.2, 0.1],
  [0.1, 0.2, 0.4, 0.6, 0.5, 0.3, 0.1, 0.0],
  [0.0, 0.1, 0.2, 0.3, 0.2, 0.2, 0.1, 0.0],
  [0.1, 0.1, 0.1, 0.2, 0.1, 0.1, 0.0, 0.0],
  [0.0, 0.0, 0.1, 0.1, 0.1, 0.0, 0.0, 0.0],
]

export default function render(container: HTMLElement) {
  const pic = picture()
  const SQ = 30, M = 34

  MISSES.forEach((row, r) => {
    row.forEach((miss, f) => {
      const x = M + f * SQ, y = M + r * SQ
      pic.filldraw(rect(x, y, SQ, SQ), {
        style: {
          stroke: '#e2e8f0', strokeWidth: 0.5,
          fill: '#dc2626', 'fill-opacity': miss * 0.9,
        },
      })
    })
    pic.text(point(M - 10, M + r * SQ + SQ / 2), String(8 - r), { fontSize: 9, textAnchor: 'end', style: { stroke: '#64748b' } })
  })
  'abcdefgh'.split('').forEach((f, i) => {
    pic.text(point(M + i * SQ + SQ / 2, M + 8 * SQ + 13), f, { fontSize: 9, style: { stroke: '#64748b' } })
  })

  pic.text(point(M, M - 12), 'puzzle misses by square', { fontSize: 10, textAnchor: 'start' })
  pic.mount(container, { fit: true, padding: 10 })
}

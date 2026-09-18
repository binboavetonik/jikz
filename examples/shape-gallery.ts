import { allShapes, picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const cols = 5, cellW = 116, cellH = 92, margin = 20
  const names = Object.keys(allShapes) as (keyof typeof allShapes)[]
  const rows = Math.ceil(names.length / cols)

  names.forEach((shape, i) => {
    const cx = margin + (i % cols) * cellW + cellW / 2
    const cy = margin + Math.floor(i / cols) * cellH + 32

    pic.node(`cell${i}`, { at: point(cx, cy), shape, width: 62, height: 44, style: { stroke: '#334155', fill: '#e0e7ff', strokeWidth: 1.5 } })

    // Label just below the shape's ACTUAL bounds (pointers/heads included)
    const bottom = pic.getNode(`cell${i}`)!.bounds[3]
    pic.text(point(cx, bottom + 14), shape, { style: { fontSize: 10, fill: '#475569' } })
  })

  pic.mount(container, {
    width: margin * 2 + cols * cellW,
    height: margin * 2 + rows * cellH,
  })
}

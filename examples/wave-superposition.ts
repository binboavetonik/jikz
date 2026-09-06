import { picture, plot, line, point } from 'jikz'

// Wave superposition: two traveling waves and their sum, sharing one
// axis system. The sum is computed pointwise — the dashed components
// and the solid result can't disagree, because the result IS the sum.

export default function render(container: HTMLElement) {
  const pic = picture()
  const yBase = 130, xOff = 30, xScale = 30, yScale = 40

  const w1 = (x: number) => Math.sin(x * 2)
  const w2 = (x: number) => 0.6 * Math.sin(x * 3.7 + 1)

  // axis
  pic.draw(line(point(20, yBase), point(460, yBase)), { style: { stroke: '#94a3b8' } })

  const opts = { domain: [0, 14] as [number, number], samples: 200, xScale, yScale, xOffset: xOff, yOffset: yBase }
  pic.draw(plot((x) => -w1(x), opts), { style: { stroke: '#2563eb', dash: 'dashed', strokeWidth: 1.2 } })
  pic.draw(plot((x) => -w2(x), opts), { style: { stroke: '#16a34a', dash: 'dashed', strokeWidth: 1.2 } })
  pic.draw(plot((x) => -(w1(x) + w2(x)), opts), { style: { stroke: '#111827', strokeWidth: 2.2 } })

  pic.text(point(40, 30), 'sum', { fontSize: 10, style: { stroke: '#111827' } })
  pic.text(point(80, 30), '$w_1$', { fontSize: 10, style: { stroke: '#2563eb' } })
  pic.text(point(115, 30), '$w_2$', { fontSize: 10, style: { stroke: '#16a34a' } })

  pic.mount(container, { width: 480, height: 220 })
}

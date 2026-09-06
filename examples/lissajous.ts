import { picture, plotParametric, point } from 'jikz'

// Lissajous figures x = sin(a·t + δ), y = sin(b·t) — one parametric
// plot per frequency pair. plotParametric maps t → [x, y] through one
// scale/offset pair; the classic 3:2, 3:4, 5:4 family side by side.

export default function render(container: HTMLElement) {
  const pic = picture()
  const figures: [a: number, b: number, delta: number, color: string][] = [
    [3, 2, Math.PI / 2, '#2563eb'],
    [3, 4, Math.PI / 4, '#16a34a'],
    [5, 4, 0, '#dc2626'],
  ]

  figures.forEach(([a, b, delta, color], i) => {
    const cx = 100 + i * 160
    pic.draw(
      plotParametric(
        (t) => [Math.sin(a * t + delta), Math.sin(b * t)],
        { domain: [0, 2 * Math.PI], samples: 300, scale: 55, xOffset: cx, yOffset: 105 },
      ),
      { style: { stroke: color, strokeWidth: 1.5 } },
    )
    pic.text(point(cx, 185), `${a}:${b}`, { fontSize: 11 })
  })

  pic.mount(container, { width: 480, height: 205 })
}

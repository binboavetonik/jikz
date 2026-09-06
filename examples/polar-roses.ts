import { picture, plotPolar, circle, point } from 'jikz'

// Polar roses r = cos(k·θ) for k = 3, 5, 7 — plotPolar takes degrees
// and a center, so three curves compose by placing three centers.
// Odd k traces the full rose on [0, 180]; we give each the full
// [0, 360] anyway (it re-traces — harmless at this stroke width).

export default function render(container: HTMLElement) {
  const pic = picture()
  const specs: [k: number, cx: number, color: string][] = [
    [3, 100, '#2563eb'],
    [5, 260, '#7c3aed'],
    [7, 420, '#dc2626'],
  ]

  for (const [k, cx, color] of specs) {
    const center = point(cx, 105)
    pic.draw(circle(center, 62), { style: { stroke: '#e2e8f0' } }) // unit guide ring
    pic.draw(
      plotPolar((theta) => Math.cos(k * theta) * 60, { center, samples: 400 }),
      { style: { stroke: color, strokeWidth: 1.5 } },
    )
    pic.text(point(cx, 190), `r = cos(${k}θ)`, { fontSize: 11 })
  }

  pic.mount(container, { width: 510, height: 210 })
}

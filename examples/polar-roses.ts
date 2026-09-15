import { picture, plotRose, circle, point } from 'jikz'

// Polar roses r = cos(k·θ) for k = 3, 5, 7. `plotRose` is the ready
// helper — it knows an odd k closes after 180° and an even one needs
// the full turn, and it converts θ for you (plotPolar hands the
// function DEGREES, so a bare Math.cos inside would be in radians and
// draw a spiky mess).

export default function render(container: HTMLElement) {
  const pic = picture()
  const specs: [k: number, cx: number, color: string][] = [
    [3, 100, '#2563eb'],
    [5, 260, '#7c3aed'],
    [7, 420, '#dc2626'],
  ]

  for (const [k, cx, color] of specs) {
    const center = point(cx, 105)
    pic.draw(circle(center, 60), { style: { stroke: '#e2e8f0' } }) // r = 1 guide ring
    pic.draw(plotRose(k, 60, center), { style: { stroke: color, strokeWidth: 1.5 } })
    pic.text(point(cx, 175), `r = cos(${k}θ)`, { at: 'south', fontSize: 11 })
  }

  pic.mount(container, { fit: true, padding: 14 })
}

import { picture, circle, point, polar } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const GOLDEN = 137.508 // golden angle, degrees
  const C = point(160, 160), scale = 9

  for (let n = 1; n <= 250; n++) {
    const r = scale * Math.sqrt(n)
    const p = C.add(polar(n * GOLDEN, r))
    const dot = 1.5 + n / 80 // florets grow outward
    pic.fill(circle(p, dot), { style: { fill: n % 2 ? '#b45309' : '#f59e0b' } })
  }

  pic.mount(container, { width: 320, height: 320 })
}

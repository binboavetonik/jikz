import { picture, point, rect, fillPatterns, fadings, circleFading, ringFading } from 'jikz'

// TikZ's path fading, demonstrated the way the PGF manual does it:
// over a checkerboard, so what you see is real transparency and not a
// fade to white. Each fading is an SVG <mask> whose luminance is the
// alpha — PGF's pgftransparent!0 is white and stays, !100 is black and
// vanishes — and the mask is fitted to each swatch, which is TikZ's
// fit fading=true.

export default function render(container: HTMLElement) {
  const pic = picture()

  const W = 132
  const H = 96
  const GAP = 14
  const swatches = [
    ['east', fadings.east, '#2563eb'],
    ['west', fadings.west, '#2563eb'],
    ['north', fadings.north, '#7c3aed'],
    ['south', fadings.south, '#7c3aed'],
    ['circle, fuzzy 20%', circleFading(20), '#dc2626'],
    ['fuzzy ring 15%', ringFading(15), '#dc2626'],
  ] as const

  swatches.forEach(([label, fading, hue], i) => {
    const x = GAP + (i % 3) * (W + GAP)
    const y = GAP + Math.floor(i / 3) * (H + GAP + 18)
    const box = rect(x, y, W, H)

    // the checkerboard the fade is read against
    pic.fill(box, { style: { fillPattern: { pattern: fillPatterns.checkerboard, color: '#cbd5e1' } } })
    pic.fill(box, { style: { fill: hue, fading } })
    pic.draw(box, { style: { stroke: '#94a3b8', strokeWidth: 0.8 } })
    pic.text(point(x + W / 2, y + H + 11), label, { fontSize: 11, style: { fill: '#475569' } })
  })

  pic.mount(container, { width: GAP + 3 * (W + GAP), height: GAP + 2 * (H + GAP + 18) })
}

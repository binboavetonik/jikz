import { fillPatterns, picture, rect, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const shown = [
    'north east lines', 'crosshatch', 'grid',
    'dots', 'bricks', 'checkerboard',
  ] as const
  shown.forEach((name, i) => {
    const x = 20 + (i % 3) * 150
    const y = 20 + Math.floor(i / 3) * 100
    pic.filldraw(rect(x, y, 120, 70), { style: { stroke: '#334155', fillPattern: fillPatterns[name] } })
    pic.text(point(x + 60, y + 88), name, { fontSize: 10 })
  })

  pic.mount(container, { width: 480, height: 210 })
}

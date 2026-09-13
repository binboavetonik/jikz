import { definePattern, fillPatterns, picture, rect, point } from 'jikz'

// A custom fill pattern: definePattern() names an SVG tile fragment and
// a tile size — the builder compiles it to a <defs> pattern, so it works
// in Node string output too. The result is a value you hand to a style;
// nothing is registered. Here: a herringbone weave, applied to three
// swatches alongside a built-in for comparison.

const herringbone = definePattern('herringbone', {
  width: 16,
  height: 16,
  defaultLineWidth: 1.2,
  createContent: (color: string, lw: number) =>
    `<path d="M0 8 L8 0 M0 16 L16 0 M8 16 L16 8" stroke="${color}" stroke-width="${lw}" fill="none"/>` +
    `<path d="M0 8 L8 16 M8 0 L16 8" stroke="${color}" stroke-width="${lw}" fill="none" opacity="0.45"/>`,
})

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.filldraw(rect(30, 30, 130, 90), {
    style: { stroke: '#334155', fillPattern: { pattern: herringbone, color: '#2563eb' } },
  })
  pic.text(point(95, 140), 'herringbone (custom)', { fontSize: 10 })

  pic.filldraw(rect(190, 30, 130, 90), {
    style: { stroke: '#334155', fillPattern: { pattern: herringbone, color: '#b45309', scale: 1.6, rotation: 15 } },
  })
  pic.text(point(255, 140), 'scaled + rotated', { fontSize: 10 })

  pic.filldraw(rect(350, 30, 130, 90), {
    style: { stroke: '#334155', fillPattern: fillPatterns.bricks },
  })
  pic.text(point(415, 140), "'bricks' (built-in)", { fontSize: 10 })

  pic.mount(container, { width: 510, height: 165 })
}

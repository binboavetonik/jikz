import { picture, point, circle, mindmap, smallConceptLevels } from 'jikz'

// TikZ's mindmap library: concept circles joined by the circle
// connection bar decoration — a cap that flares out of one rim, a
// constant-height bar, and a mirrored cap flaring into the other.
//
// mindmap() lays the tree out radially with TikZ's own per-level sizes,
// distances and sibling angles, and hands back plain values. Bars are
// filled and never stroked, so they go down before the circles.

export default function render(container: HTMLElement) {
  const pic = picture()

  const m = mindmap(
    {
      text: 'jikz',
      color: '#334155',
      children: [
        {
          text: 'geometry',
          color: '#1d4ed8',
          children: [{ text: 'paths' }, { text: 'shapes' }, { text: 'anchors' }],
        },
        {
          text: 'layout',
          color: '#7c3aed',
          children: [{ text: 'trees' }, { text: 'graphs' }],
        },
        {
          text: 'render',
          color: '#b45309',
          children: [{ text: 'SVG' }, { text: 'defs' }],
        },
        {
          text: 'ext',
          color: '#be123c',
          children: [{ text: 'gates' }, { text: 'dataviz' }, { text: 'mindmap' }],
        },
      ],
    },
    { at: point(0, 0), levels: smallConceptLevels, startAngle: -90 }
  )

  for (const bar of m.bars) {
    pic.fill(bar.path, { style: { fill: bar.color } })
  }

  for (const c of m.concepts) {
    pic.fill(circle(c.center, c.radius), { style: { fill: c.color } })
    pic.text(c.center, c.text ?? '', {
      fontSize: c.level === 0 ? 15 : c.level === 1 ? 11 : 9,
      style: { fill: '#ffffff' },
    })
  }

  pic.mount(container, { fit: true, padding: 14 })
}

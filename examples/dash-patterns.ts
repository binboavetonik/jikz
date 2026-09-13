import { allShapes, line, picture, point, type DashPatternName } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const styles: DashPatternName[] = ['dashed', 'dotted', 'dashdotted', 'densely dashed', 'loosely dashed', 'densely dotted']
  styles.forEach((dash, i) => {
    const y = 22 + i * 24
    pic.draw(line(point(20, y), point(230, y)), { style: { stroke: '#334155', strokeWidth: 1.5, dash } })
    // Invisible anchor node at the line's end; the style name rides
    // as its east label, so the text tracks the endpoint — move the
    // line and the label follows.
    pic.node(`end${i}`, {
      at: point(230, y), shape: 'rectangle',
      width: 0, height: 0, minWidth: 0, minHeight: 0,
      labels: [{ text: dash, at: 'east', options: { fontSize: 10 } }],
    }, { style: { stroke: 'none', fill: 'none' } })
  })

  pic.mount(container, { width: 360, height: 165 })
}

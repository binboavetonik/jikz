import { line, circle, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  const r = new SVGRenderer()
  r.defineLayers(['background', 'main', 'foreground'])

  r.setLayer('background')
  r.renderCircle(circle(point(150, 80), 60), { style: { fill: '#fef3c7', stroke: 'none' } })

  // main layer (default): double line through the scene
  r.renderLine(line(point(30, 80), point(270, 80)), {
    style: { stroke: '#334155', strokeWidth: 1.5, doubleLine: { spacing: 5 } },
  })

  r.onLayer('foreground', () => {
    r.renderCircle(circle(point(150, 80), 8), { style: { fill: '#dc2626', stroke: 'none' } })
  })

  r.builder.mount(container, { width: 300, height: 160 })
}

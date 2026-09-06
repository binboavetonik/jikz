import { tree, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  const { nodes, edges } = tree({ at: point(220, 35), grow: 'down' })
    .root('CEO')
      .child('CTO')
        .children(['Eng', 'QA'])
        .parent()
      .parent()
      .child('CFO')
    .build()

  const r = new SVGRenderer()
  for (const e of edges) r.renderEdge(e, { style: { stroke: '#64748b' } })
  for (const n of nodes) r.renderNode(n, { style: { stroke: '#16a34a', fill: '#dcfce7', strokeWidth: 1.5 } })
  r.builder.mount(container, { width: 440, height: 200 })
}

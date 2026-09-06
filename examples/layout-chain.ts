import { chain, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  const { nodes, edges } = chain(point(60, 70), { spacing: 46 })
    .node({ text: 'q0', shape: 'circle', width: 40, height: 40 })
    .node({ text: 'q1', shape: 'circle', width: 40, height: 40 })
    .going('below')
    .node({ text: 'q2', shape: 'circle', width: 40, height: 40 })
    .going('right')
    .node({ text: 'q3', shape: 'circle', width: 40, height: 40 })
    .build()

  const r = new SVGRenderer()
  for (const e of edges) r.renderEdge(e, { style: { stroke: '#64748b' } })
  for (const n of nodes) r.renderNode(n, { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  r.builder.mount(container, { width: 340, height: 180 })
}

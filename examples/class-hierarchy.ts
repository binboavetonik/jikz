import { layered, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  // Class hierarchy with interfaces: every interface is a parent, so
  // most classes have several — a DAG, not a tree. The crossing
  // minimizer (weighted median + transpose sweeps) untangles the
  // implements-edges automatically.
  const { nodes, edges } = layered({
    edgeOptions: { arrowEnd: 'stealth' },
    at: point(24, 16),
    grow: 'down',
    rankSep: 36,
    nodeSep: 14,
  })
    .node('Renderable', { text: '«Renderable»' })
    .node('Measurable', { text: '«Measurable»' })
    .node('Clickable', { text: '«Clickable»' })
    .node('Node', {})
    .node('Edge', {})
    .node('Label', {})
    .node('Handle', {})
    .edge('Renderable', 'Node')
    .edge('Measurable', 'Node')
    .edge('Renderable', 'Edge')
    .edge('Renderable', 'Label')
    .edge('Measurable', 'Label')
    .edge('Clickable', 'Label')   // Label implements three interfaces
    .edge('Clickable', 'Handle')
    .edge('Measurable', 'Handle')
    .build()

  const r = new SVGRenderer()
  for (const e of edges) r.renderEdge(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
  for (const n of nodes) {
    const isInterface = n.text?.startsWith('«')
    r.renderNode(n, {
      style: isInterface
        ? { stroke: '#047857', fill: '#d1fae5', strokeWidth: 1.5, strokeDasharray: '4 3' }
        : { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.2 },
    })
  }
  r.builder.mount(container, { width: 400, height: 150 })
}

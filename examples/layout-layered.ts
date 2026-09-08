import { layered, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  // Layered (Sugiyama) layout for DAGs: unlike tree(), a node may have
  // several parents. Ranks align into columns; `api` below has two.
  const { nodes, edges } = layered({
    at: point(24, 24),
    grow: 'down',
    rankSep: 40,
    nodeSep: 24,
  })
    .node('config', { shape: 'circle', minWidth: 56, minHeight: 56 })
    .node('db', { shape: 'circle', minWidth: 40, minHeight: 40 })
    .node('cache', { shape: 'circle', minWidth: 40, minHeight: 40 })
    .node('api', { shape: 'circle', minWidth: 40, minHeight: 40 })
    .node('web', { shape: 'circle', minWidth: 40, minHeight: 40 })
    .edge('config', 'db')
    .edge('config', 'cache')
    .edge('db', 'api')
    .edge('cache', 'api')     // api has two parents
    .edge('api', 'web')
    .build()

  const r = new SVGRenderer()
  for (const e of edges) r.renderEdge(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
  for (const n of nodes) r.renderNode(n, { style: { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.5 } })
  r.builder.mount(container, { width: 360, height: 320 })
}

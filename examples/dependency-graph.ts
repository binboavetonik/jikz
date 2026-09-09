import { layered, point, SVGRenderer } from 'jikz'

export default function render(container: HTMLElement) {
  // Build-pipeline dependency graph. `config → publish` spans four
  // ranks: layered() routes it through dummy nodes (rendered as bend
  // points), and the network-simplex coordinate pass keeps that long
  // edge straight instead of zig-zagging.
  const { nodes, edges } = layered({
    at: point(24, 16),
    grow: 'down',
    rankSep: 28,
    nodeSep: 16,
  })
    .node('src', {})
    .node('assets', {})
    .node('config', {})
    .node('compile', {})
    .node('bundle', {})
    .node('lint', {})
    .node('test', {})
    .node('package', {})
    .node('publish', {})
    .edge('src', 'compile')
    .edge('src', 'lint')
    .edge('assets', 'bundle')
    .edge('config', 'lint')
    .edge('compile', 'test')
    .edge('lint', 'test')        // test has two parents
    .edge('test', 'package')
    .edge('bundle', 'package')   // package has two parents
    .edge('package', 'publish')
    .edge('config', 'publish', { minLength: 4 }) // long edge → dummy chain
    .build()

  const r = new SVGRenderer()
  for (const e of edges) r.renderEdge(e, { style: { stroke: '#94a3b8', strokeWidth: 1.2 } })
  for (const n of nodes) {
    const isMilestone = n.name === 'publish' || n.name === 'package'
    r.renderNode(n, {
      style: isMilestone
        ? { stroke: '#b45309', fill: '#fef3c7', strokeWidth: 1.5 }
        : { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 1.2 },
    })
  }
  r.builder.mount(container, { width: 400, height: 300 })
}

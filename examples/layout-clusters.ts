import { allShapes, layered, picture, point, rect } from 'jikz'

export default function render(container: HTMLElement) {
  const g = layered({ at: point(24, 30), grow: 'down', nodeSep: 26, rankSep: 40, clusterPadding: 14 })
    .node('req', { shape: allShapes['rectangle'], text: 'request', minWidth: 74 })
    .node('auth', { shape: allShapes['rectangle'], text: 'auth', minWidth: 66 })
    .node('rate', { shape: allShapes['rectangle'], text: 'rate limit', minWidth: 66 })
    .node('route', { shape: allShapes['rectangle'], text: 'route', minWidth: 66 })
    .node('svc', { shape: allShapes['rectangle'], text: 'service', minWidth: 74 })
    .node('log', { shape: allShapes['rectangle'], text: 'audit log', minWidth: 74 })
    .edge('req', 'auth')
    .edge('auth', 'rate')
    .edge('rate', 'route')
    .edge('route', 'svc')
    .edge('req', 'log') // bypasses the gateway entirely
    .edge('log', 'svc')
    // An endpoint may name a cluster: this one stops at the box.
    .cluster('policy', ['auth', 'rate'], { label: 'policy', grow: 'right' })
    // Clusters nest: name a cluster in another's member list.
    .cluster('gateway', ['policy', 'route'], { label: 'gateway' })
    .build()

  const pic = picture({ shapes: allShapes })

  // Boxes first, outermost first, so nested boxes paint on top of their
  // parents and the nodes on top of everything.
  for (const c of [...g.clusters].sort((a, b) => a.depth - b.depth)) {
    const [x0, y0, x1, y1] = c.bounds
    pic.filldraw(rect(x0, y0, x1 - x0, y1 - y0), {
      style: {
        stroke: c.depth === 0 ? '#94a3b8' : '#c4b5fd',
        fill: c.depth === 0 ? '#f1f5f9' : '#faf5ff',
        dash: 'dashed',
        borderRadius: 6,
      },
    })
    // Caption inside its own box, not floating above it: nested
    // clusters sit only clusterPadding apart, so labels hung above the
    // border collided with the parent's.
    if (c.label) {
      pic.text(point(x0 + 6, y0 + 9), c.label, {
        fontSize: 10,
        textAnchor: 'start',
        style: { fill: c.depth === 0 ? '#64748b' : '#7c3aed' },
      })
    }
  }

  for (const e of g.edges) pic.draw(e, { style: { stroke: '#64748b' } })
  for (const n of g.nodes) {
    pic.draw(n, { style: { stroke: '#0f172a', fill: '#ffffff', strokeWidth: 1.4 } })
  }

  pic.mount(container, { fit: true, padding: 14 })
}

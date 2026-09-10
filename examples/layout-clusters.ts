import { layered, picture, point, rect } from 'jikz'

export default function render(container: HTMLElement) {
  const g = layered({ at: point(24, 30), grow: 'down', nodeSep: 26, rankSep: 40, clusterPadding: 14 })
    .node('req', { shape: 'rectangle', text: 'request', minWidth: 74 })
    .node('auth', { shape: 'rectangle', text: 'auth', minWidth: 66 })
    .node('rate', { shape: 'rectangle', text: 'rate limit', minWidth: 66 })
    .node('route', { shape: 'rectangle', text: 'route', minWidth: 66 })
    .node('svc', { shape: 'rectangle', text: 'service', minWidth: 74 })
    .node('log', { shape: 'rectangle', text: 'audit log', minWidth: 74 })
    .edge('req', 'auth')
    .edge('auth', 'rate')
    .edge('rate', 'route')
    .edge('route', 'svc')
    .edge('req', 'log') // bypasses the gateway entirely
    .edge('log', 'svc')
    .cluster('gateway', ['auth', 'rate', 'route'], { label: 'gateway' })
    .build()

  const pic = picture()

  // Boxes first, so nodes and edges paint on top of them.
  for (const c of g.clusters) {
    const [x0, y0, x1, y1] = c.bounds
    pic.filldraw(rect(x0, y0, x1 - x0, y1 - y0), {
      style: { stroke: '#94a3b8', fill: '#f1f5f9', dash: 'dashed', borderRadius: 6 },
    })
    if (c.label) {
      pic.text(point(x0 + 6, y0 - 8), c.label, {
        fontSize: 10,
        textAnchor: 'start',
        style: { fill: '#64748b' },
      })
    }
  }

  for (const e of g.edges) pic.draw(e, { style: { stroke: '#64748b' } })
  for (const n of g.nodes) {
    pic.draw(n, { style: { stroke: '#0f172a', fill: '#ffffff', strokeWidth: 1.4 } })
  }

  pic.mount(container, { fit: true, padding: 14 })
}

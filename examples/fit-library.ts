import { allShapes, picture, point, rect, rectFit } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const box = { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 }

  pic.node('db',    { at: point(70, 90), shape: 'cylinder', width: 50, height: 44, text: 'db', style: box })
  pic.node('api',   { at: point(190, 70), shape: 'rectangle', width: 70, height: 40, text: 'api', style: box })
  pic.node('cache', { at: point(190, 150), shape: 'rectangle', width: 70, height: 40, text: 'cache', style: box })
  pic.node('user',  { at: point(70, 190), shape: 'circle', width: 46, height: 46, text: 'user', style: box })

  pic.edge('user', 'api',   { arrowEnd: 'stealth', style: { stroke: '#64748b' } })
  pic.edge('user', 'db',    { arrowEnd: 'stealth', style: { stroke: '#64748b' } })
  pic.edge('db', 'api',     { arrowEnd: 'stealth', style: { stroke: '#64748b' } })
  pic.edge('api', 'cache',  { arrowEnd: 'stealth', style: { stroke: '#64748b' } })

  // \node[fit=(api)(cache), inner sep=12] — tight bbox of the subset's bounds, plus padding
  const corners = ['api', 'cache'].flatMap((name) => {
    const [x0, y0, x1, y1] = pic.getNode(name)!.bounds
    return [point(x0, y0), point(x1, y1)]
  })
  const fit = rectFit(corners)! // null only for an empty corner set
  const pad = 12
  pic.draw(rect(fit.x - pad, fit.y - pad, fit.width + 2 * pad, fit.height + 2 * pad),
    { style: { stroke: '#7c3aed', dash: 'dashed', strokeWidth: 1.5 } })
  pic.text(point(190, fit.y - pad - 12), 'backend', { style: { fontSize: 11, fill: '#7c3aed' } })

  pic.mount(container, { width: 300, height: 250 })
}
